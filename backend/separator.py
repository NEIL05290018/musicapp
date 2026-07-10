import os
import uuid
import asyncio
import subprocess
from pathlib import Path

import torch
import numpy as np
import soundfile as sf

_original_load = torch.load
torch.load = lambda *a, **kw: _original_load(*a, **{**kw, "weights_only": False})

from demucs import pretrained

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "outputs"))

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

MODEL_NAME = os.getenv("DEMUCS_MODEL", "mdx_extra_q")

_model = None
_model_lock = asyncio.Lock()


async def get_model():
    global _model
    if _model is None:
        async with _model_lock:
            if _model is None:
                _model = pretrained.get_model(MODEL_NAME)
                if torch.cuda.is_available():
                    _model.cuda()
    return _model


def slice_audio(input_path: str, start_time: float, end_time: float) -> str:
    input_ext = Path(input_path).suffix.lower()
    slice_path = str(Path(input_path).parent / f"slice_{uuid.uuid4().hex[:8]}{input_ext}")

    cmd = ["ffmpeg", "-y", "-i", input_path, "-ss", str(start_time)]
    if end_time > 0:
        cmd += ["-t", str(end_time - start_time)]
    cmd.append(slice_path)
    subprocess.run(cmd, capture_output=True, check=True)
    return slice_path


def save_wav(path: str, tensor: torch.Tensor, sample_rate: int):
    audio = tensor.cpu().numpy().T
    sf.write(path, audio, sample_rate)


def merge_stems(stems: dict, output_dir: Path, sample_rate: int = 44100) -> dict:
    result = {}

    if stems.get("vocals") is not None:
        v_path = output_dir / "vocals.wav"
        save_wav(str(v_path), stems["vocals"], sample_rate)
        result["vocals"] = {"path": str(v_path), "duration": stems["vocals"].shape[-1] / sample_rate}

    bass = stems.get("bass")
    other = stems.get("other")
    music_tensor = None
    if bass is not None and other is not None:
        music_tensor = bass + other
    elif bass is not None:
        music_tensor = bass
    elif other is not None:
        music_tensor = other

    if music_tensor is not None:
        m_path = output_dir / "music.wav"
        save_wav(str(m_path), music_tensor, sample_rate)
        result["music"] = {"path": str(m_path), "duration": music_tensor.shape[-1] / sample_rate}

    if stems.get("drums") is not None:
        d_path = output_dir / "sfx.wav"
        save_wav(str(d_path), stems["drums"], sample_rate)
        result["sfx"] = {"path": str(d_path), "duration": stems["drums"].shape[-1] / sample_rate}

    return result


def convert_to_mp3(input_path: str) -> str:
    mp3_path = input_path.replace(".wav", ".mp3")
    subprocess.run(
        ["ffmpeg", "-y", "-i", input_path, "-b:a", "320k", mp3_path],
        capture_output=True, check=True,
    )
    return mp3_path
