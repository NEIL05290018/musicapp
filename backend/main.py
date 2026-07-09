import os
import uuid
import json
import shutil
import asyncio
import threading
from pathlib import Path

import torch
import torchaudio
import numpy as np
import soundfile as sf
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from demucs.apply import apply_model

from separator import (
    get_model,
    slice_audio,
    merge_stems,
    convert_to_mp3,
    UPLOAD_DIR,
    OUTPUT_DIR,
)

app = FastAPI(title="AudioSift API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

tasks: dict = {}

ALLOWED_EXTENSIONS = {".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac"}


def run_separation(task_id: str, file_path: str, start_time: float, end_time: float):
    try:
        task = tasks[task_id]
        task["status"] = "processing"
        task["progress"] = 0

        process_path = file_path
        if start_time > 0 or end_time > 0:
            task["progress"] = 5
            process_path = slice_audio(file_path, max(0, start_time), max(0, end_time))

        task["progress"] = 10
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        model = loop.run_until_complete(get_model())

        task["progress"] = 20

        wav, sr = sf.read(process_path, dtype="float32", always_2d=False)
        wav = torch.from_numpy(wav).T
        if wav.dim() == 1:
            wav = wav.unsqueeze(0)
        sr = int(sr)

        if sr != model.samplerate:
            resampler = torchaudio.transforms.Resample(sr, model.samplerate)
            wav = resampler(wav)

        device = next(model.parameters()).device
        wav = wav.to(device)

        ref = wav.mean(0)
        wav = (wav - ref.mean()) / ref.std()

        task["progress"] = 30

        with torch.no_grad():
            sources = apply_model(
                model,
                wav[None],
                device=device,
                shifts=1,
                split=True,
                overlap=0.25,
                progress=True,
                num_workers=0,
            )[0]

        sources = sources * ref.std() + ref.mean()

        task["progress"] = 80

        task_output_dir = OUTPUT_DIR / task_id
        task_output_dir.mkdir(parents=True, exist_ok=True)

        stems_dict = {
            "vocals": sources[0] if sources.shape[0] > 0 else None,
            "drums": sources[1] if sources.shape[0] > 1 else None,
            "bass": sources[2] if sources.shape[0] > 2 else None,
            "other": sources[3] if sources.shape[0] > 3 else None,
        }

        result = merge_stems(stems_dict, task_output_dir, model.samplerate)

        task["progress"] = 100
        task["status"] = "done"
        task["stems"] = result

        if process_path != file_path and os.path.exists(process_path):
            os.remove(process_path)

    except Exception as e:
        task["status"] = "error"
        task["error"] = str(e)


@app.post("/separate")
async def separate_audio(
    file: UploadFile = File(...),
    start_time: float = Form(0),
    end_time: float = Form(-1),
    stems: str = Form("vocals,music,sfx"),
):
    ext = Path(file.filename or "audio.wav").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"不支持的格式: {ext}，支持: {', '.join(ALLOWED_EXTENSIONS)}")

    task_id = uuid.uuid4().hex

    upload_path = UPLOAD_DIR / f"{task_id}{ext}"
    with open(upload_path, "wb") as f:
        content = await file.read()
        f.write(content)

    tasks[task_id] = {
        "task_id": task_id,
        "status": "loading",
        "progress": 0,
        "stems": None,
        "error": None,
        "file_path": str(upload_path),
    }

    thread = threading.Thread(
        target=run_separation,
        args=(task_id, str(upload_path), start_time, end_time),
        daemon=True,
    )
    thread.start()

    return JSONResponse({
        "task_id": task_id,
        "status": "loading",
        "message": "音频已接收，AI模型加载中",
    })


@app.get("/status/{task_id}")
async def get_status(task_id: str):
    task = tasks.get(task_id)
    if not task:
        raise HTTPException(404, "任务不存在")

    response = {
        "task_id": task["task_id"],
        "status": task["status"],
        "progress": task["progress"],
    }

    if task["status"] == "done":
        stems_info = {}
        for stem_name, stem_data in task.get("stems", {}).items():
            stems_info[stem_name] = {
                "url": f"/download/{stem_name}/{task_id}",
                "duration": stem_data.get("duration", 0),
            }
        response["stems"] = stems_info
    elif task["status"] == "error":
        response["error"] = task.get("error", "未知错误")

    return JSONResponse(response)


@app.get("/download/{stem}/{task_id}")
async def download_stem(stem: str, task_id: str, format: str = "wav"):
    task = tasks.get(task_id)
    if not task or task["status"] != "done":
        raise HTTPException(404, "任务未完成或不存在")

    stems_data = task.get("stems", {})
    if stem not in stems_data:
        raise HTTPException(404, f"音轨 {stem} 不存在")

    file_path = stems_data[stem]["path"]

    if format == "mp3":
        mp3_path = convert_to_mp3(file_path)
        return FileResponse(
            mp3_path,
            media_type="audio/mpeg",
            filename=f"AudioSift_{stem}.mp3",
        )

    return FileResponse(
        file_path,
        media_type="audio/wav",
        filename=f"AudioSift_{stem}.wav",
    )


@app.get("/health")
async def health():
    return {"status": "ok", "gpu_available": torch.cuda.is_available()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
