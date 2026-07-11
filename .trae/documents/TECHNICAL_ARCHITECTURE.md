## 1. 架构设计

```
┌────────────────────────────────────────────┐
│                  浏览器                     │
│  ┌──────────────────────────────────────┐  │
│  │     Vue 3 SPA 单页应用               │  │
│  │   ┌─────┐ ┌──────┐ ┌──────────┐    │  │
│  │   │路由 │ │状态  │ │Web Audio │    │  │
│  │   │Vue  │ │reactive│API/Canvas│    │  │
│  │   │Router│ │Store │ │2D        │    │  │
│  │   └─────┘ └──────┘ └──────────┘    │  │
│  └──────────────────────────────────────┘  │
└──────────────┬─────────────────────────────┘
               │ REST API (FormData / JSON)
               ▼
┌────────────────────────────────────────────┐
│              Nginx (端口 80)                │
│    /          → 前端静态文件               │
│    /api/*     → 反代到 127.0.0.1:8000      │
└──────────────┬─────────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────┐
│         FastAPI 后端 (端口 8000 内部)       │
│  ┌──────────────────────────────────────┐  │
│  │  POST /api/separate  ← 接收文件      │  │
│  │  GET  /api/status/id  ← 轮询状态     │  │
│  │  GET  /api/download/   ← 下载结果    │  │
│  │  GET  /api/health      ← 健康检查    │  │
│  └──────────────┬───────────────────────┘  │
│                 │ threading.Thread          │
│  ┌──────────────▼───────────────────────┐  │
│  │  Demucs mdx_extra_q 模型推理         │  │
│  │  输入: stereo audio → torch tensor   │  │
│  │  输出: 4 轨 (vocals/drums/bass/other)│  │
│  │  映射: 4 轨 → 3 轨 (合并策略)        │  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

**核心说明**：
- AI 分离在**服务端**运行，使用 threading 线程避免阻塞 FastAPI 事件循环
- 开发模式：Vite 开发代理将 `/api/*` → `http://127.0.0.1:8000`（去除 /api 前缀）
- 生产模式：Nginx 提供前端静态文件 + `/api/*` 反代到后端

## 2. 技术选型

| 层级 | 技术 | 说明 |
|-----|------|------|
| 前端框架 | Vue 3.4 + TypeScript 5.3 | Composition API (`<script setup>`) |
| 构建工具 | Vite 5 | HMR，生产关闭 sourcemap，lucide 单独 chunk |
| 样式方案 | TailwindCSS 3.4 | 原子化 CSS，dark mode class 策略 |
| 状态管理 | Vue `reactive`（Composable 工厂） | 单例全局状态，无需 Pinia |
| 路由 | Vue Router 4 (History 模式) | 4 条路由，全部 `() => import()` 懒加载 |
| 图标 | lucide-vue-next 0.511 | SVG 图标 |
| HTTP | 原生 fetch + FormData | 文件上传 + JSON 轮询 |
| Canvas | 原生 2D API | 波形图、AlbumWall、About 粒子 |
| 音频 | Web Audio API (AudioContext) | 浏览器端解码 AudioBuffer |
| 后端框架 | FastAPI (Python) | 异步 API，CORS 全开 |
| AI 模型 | Demucs `mdx_extra_q` | Meta 预训练，Hybrid Transformer |
| 音频处理 | torchaudio + soundfile + ffmpeg | 读取、重采样、切片、转码 |
| 部署 | ECS + Nginx + systemd | GitHub Actions 自托管 Runner |

## 3. 路由定义

**文件**: [src/router/index.ts](file:///c:/Users/NEIL/AppData/Roaming/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/6a4da5c25923191041f7bc77/src/router/index.ts)

```typescript
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),    // History 模式（无 #），需 Nginx try_files
  routes: [
    { path: '/',                      name: 'workbench', component: () => import('@/pages/HomePage.vue') },
    { path: '/discover',              name: 'discover',  component: () => import('@/pages/DiscoverPage.vue') },
    { path: '/discover/playlist/:id', name: 'playlist',  component: () => import('@/pages/PlaylistPage.vue') },
    { path: '/about',                 name: 'about',     component: () => import('@/pages/AboutPage.vue') },
  ],
})
```

| 路径 | 路由名 | 页面组件 | 功能 |
|------|--------|----------|------|
| `/` | workbench | HomePage.vue | 主工作台（上传→波形→分离→预览→导出） |
| `/discover` | discover | DiscoverPage.vue | 音乐发现（Banner/热歌/新歌/歌单/搜索） |
| `/discover/playlist/:id` | playlist | PlaylistPage.vue | 歌单详情（动态路由 `:id`） |
| `/about` | about | AboutPage.vue | 品牌展示（多层 Canvas 动画） |

> **添加新页面**：在此文件 routes 数组中新增一条，再在 AppSidebar.vue 的 navItems 中添加导航项。

## 4. 前端组件树

```
App.vue (根布局)
├── AlbumWall.vue          ← 全局背景，9×7 封面无限滚动
├── AppSidebar.vue         ← 240px 固定侧栏，3 个导航项
└── <router-view />        ← 主内容区 ml-[240px]

    ├── HomePage.vue [/]                    工作台
    │   ├── UploadZone.vue                  上传 + 解码
    │   ├── WaveformViewer.vue              Canvas 波形 + 拖拽选区
    │   ├── SeparationPanel.vue             音轨选择 + 分离 + 进度
    │   ├── TrackCard.vue ×3               播放 + 音量 + 下载
    │   └── ExportPanel.vue                WAV/MP3 + 打包下载

    ├── DiscoverPage.vue [/discover]        音乐发现
    │   ├── Banner 区 (3 列渐变卡片)
    │   ├── Trending Now (横向 scroll-snap)
    │   ├── New Releases (纵向列表)
    │   ├── Featured Playlists (6 列 Grid)
    │   ├── Browse All (搜索 + 流派筛选)
    │   └── 底部播放器 (Teleport to body)

    ├── PlaylistPage.vue [/discover/playlist/:id]
    │   ├── 头部（返回 + 封面 + 歌单信息）
    │   ├── 歌曲列表
    │   └── 底部播放器

    └── AboutPage.vue [/about]
        ├── Canvas 背景层 (封面轮换)
        ├── Canvas 粒子系统 (60 粒子)
        ├── Canvas 鼠标遮罩 (destination-out)
        └── 内容层 (标题 + 卡片 ×3)
```

## 5. 数据层 —— 状态管理与数据流

### 5.1 useAudioStore（全局状态中心）

**文件**: [src/composables/useAudioStore.ts](file:///c:/Users/NEIL/AppData/Roaming/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/6a4da5c25923191041f7bc77/src/composables/useAudioStore.ts)

使用 Vue `reactive` + 工厂函数模式实现全局状态（非 Pinia）。每次 `useAudioStore()` 调用返回**同一个 reactive 对象的引用**，所有组件共享。

```typescript
// 核心数据结构
export interface AudioState {
  audioFile: File | null          // 用户上传的原始文件
  audioBuffer: AudioBuffer | null // 解码后的 AudioBuffer
  audioDuration: number           // 音频总时长 (秒)
  audioSampleRate: number         // 采样率，默认 44100

  timeSelections: TimeSelection[] // 波形选区 [{id, startTime, endTime}]
  activeStems: StemType[]         // 选中要分离的音轨 ['vocals','music','sfx']

  separationStatus: SeparationStatus // 'idle'|'uploading'|'processing'|'done'|'error'
  separationProgress: number         // 0-100
  separationError: string | null
  taskId: string | null              // 后端任务 UUID
  results: Record<string, StemInfo>  // 分离结果 {vocals:{url,duration}, ...}

  exportFormat: 'wav' | 'mp3'       // 导出格式
  playingTrack: StemType | null     // 当前播放的音轨
  soloTrack: StemType | null        // Solo 独奏模式
  volumes: Record<StemType, number> // 各音轨音量 {vocals:0.8, music:0.8, sfx:0.8}
}
```

**暴露的方法**（全部是纯 setter，无业务逻辑）：
`setAudioFile`, `setAudioBuffer`, `setAudioInfo`, `addTimeSelection`, `removeTimeSelection`, `clearTimeSelections`, `toggleStem`, `setActiveStems`, `setSeparationStatus`, `setSeparationProgress`, `setSeparationError`, `setTaskId`, `setResults`, `setExportFormat`, `setPlayingTrack`, `setSoloTrack`, `setVolume`, `reset`

> **修改指引**：若需添加新状态（如"分离完成后自动播放"开关），在此文件添加字段 + 方法即可。

### 5.2 数据流图 —— 谁读谁写

```
                    ┌─────────────────────────────────┐
                    │         useAudioStore            │
                    │        (reactive 单例)            │
                    │                                 │
  UploadZone ───────┤ setAudioFile/setAudioBuffer      │
  UploadZone ───────┤ setAudioInfo                     │
  UploadZone ───────┤ reset                            │
  WaveformViewer ───┤ addTimeSelection/removeTimeSel   │读取: audioBuffer, timeSelections
  SeparationPanel ──┤ setSeparationStatus/Progress/    │读取: audioFile, timeSelections,
                    │    Error/TaskId/Results           │      activeStems
  SepPanel poll ────┤ setSeparationProgress/Results    │
  TrackCard ────────┤ setPlayingTrack, setSoloTrack    │读取: results, volumes, taskId
  ExportPanel ──────┤ setExportFormat                  │读取: results, exportFormat, taskId
  HomePage ────────┤ (读取 state 驱动组件显隐)          │读取: audioBuffer, results
```

### 5.3 useAudioUtils（工具函数集）

**文件**: [src/composables/useAudioUtils.ts](file:///c:/Users/NEIL/AppData/Roaming/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/6a4da5c25923191041f7bc77/src/composables/useAudioUtils.ts)

| 函数 | 输入 → 输出 | 用途 |
|------|------------|------|
| `decodeAudioFile` | `File` → `Promise<AudioBuffer>` | FileReader 转 ArrayBuffer → AudioContext.decodeAudioData |
| `extractPeaks` | `(AudioBuffer, 目标宽度, 起始秒, 结束秒)` → `Float32Array` | 从 buffer 第一通道提取波形峰值，按像素聚合取最大绝对值 |
| `formatTime` | `秒数` → `"MM:SS.ms"` | 时间格式化 |
| `generateUUID` | 无 → `string` | `crypto.randomUUID()` |
| `uploadAndSeparate` | `(File, startTime, endTime, stems[])` → `Promise<SeparateResponse>` | FormData 封装 → POST /api/separate |
| `pollStatus` | `taskId` → `Promise<StatusResponse>` | GET /api/status/{taskId} |
| `getDownloadUrl` | `(stem, taskId, format)` → `string` | `/api/download/{stem}/{taskId}?format=wav\|mp3` |

**音轨颜色常量 `STEM_COLORS`**：

| Stem | bg | border | glow | label |
|------|-----|--------|------|-------|
| vocals | rgba(79,143,255,0.15) | #4f8fff 蓝 | rgba(79,143,255,0.3) | 人声 |
| music | rgba(180,100,255,0.15) | #b464ff 紫 | rgba(180,100,255,0.3) | 配乐 |
| sfx | rgba(255,140,60,0.15) | #ff8c3c 橙 | rgba(255,140,60,0.3) | 音效 |

> **修改指引**：改音轨颜色只改这个对象即可，所有组件自动跟随。

### 5.4 useMusicApi（音乐搜索 API）

**文件**: [src/composables/useMusicApi.ts](file:///c:/Users/NEIL/AppData/Roaming/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/6a4da5c25923191041f7bc77/src/composables/useMusicApi.ts)

通过 Meting API (`api.injahow.cn`) 搜索网易云音乐：

| 函数 | 用途 |
|------|------|
| `searchSongs(keyword, limit=20)` | 搜索歌曲 → `MusicApiSong[]`（id/title/artist/album/coverUrl/audioUrl/lyricUrl/duration） |
| `fetchLyric(lyricUrl)` | 获取歌词文本 |
| `resolvePlayableUrl(audioUrl)` | 解析可播放的音频 URL |
| `getCachedSong(id)` | 从缓存获取歌曲 |
| `parseLyricText(rawLrc)` | 解析 LRC 歌词为 `[{time, text}]` |

### 5.5 模拟数据

| 文件 | 内容 | 关键函数 |
|------|------|----------|
| [src/data/songs.ts](file:///c:/Users/NEIL/AppData/Roaming/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/6a4da5c25923191041f7bc77/src/data/songs.ts) | 30 首歌曲、8 种流派 | 导出 `songs[]`, `genres[]` |
| [src/data/playlists.ts](file:///c:/Users/NEIL/AppData/Roaming/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/6a4da5c25923191041f7bc77/src/data/playlists.ts) | 12 个歌单 | `getPlaylistSongs`, `getNewSongs`, `getTopSongs` |

> **修改指引**：增加歌曲直接在 songs.ts 的数组中追加；增加歌单在 playlists.ts 中追加，songIds 引用 songs.ts 中的 id。

## 6. 全局样式体系

**文件**: [src/style.css](file:///c:/Users/NEIL/AppData/Roaming/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/6a4da5c25923191041f7bc77/src/style.css)

| 层级 | 内容 |
|------|------|
| **Base** | 全局 reset；body 背景 `#08080c` 文字 `#e4e4ec`；自定义 6px 滚动条（`#1a1a25` 深色滑条） |
| **Components** | `.glass-card` — 毛玻璃卡片（backdrop-blur:24px + 1px 半透明边框 + 16px 圆角，hover 亮度提升）；`.glow-button` — 发光按钮容器；`.range-slider` — 粉色滑块（#e04090 带阴影） |
| **Utilities** | `.scrollbar-hide` — 隐藏滚动条兼容 Firefox + WebKit |
| **Animations** | `shimmer`（2s 扫描光效）、`fade-in-up`（0.6s 淡入上浮）、`hue-rotate-slow`、`aurora-flow`（8s 渐变流动）、`glow-pulse`；实用类 `.shimmer-bg` / `.stagger-fade-in` / `.aurora-bg` / `.rainbow-card` |

> **修改指引**：改页面主色调在 style.css 的 `body` 中改 `background` 和 `color`；改品牌粉在 `.range-slider` 和 `.shimmer-bg` 中改 `#e04090`。

## 7. 后端 API 定义

### 7.1 POST /separate — 上传并启动分离

**文件**: [backend/main.py](file:///c:/Users/NEIL/AppData/Roaming/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/6a4da5c25923191041f7bc77/backend/main.py) 的 `separate_audio()` 函数

```
请求: multipart/form-data
  file: 音频文件
  start_time: float (默认 0)
  end_time: float (默认 -1 = 全文)
  stems: string (逗号分隔, 如 "vocals,music,sfx")

响应: { "task_id": "uuid", "status": "loading", "message": "音频已接收，AI模型加载中" }
```

内部流程：接收文件 → UUID 命名保存到 `uploads/` → 存入 `tasks` 字典 → 启动 `threading.Thread(target=run_separation)` daemon 线程 → 立即返回 task_id。

### 7.2 GET /status/{task_id} — 轮询任务状态

**文件**: `main.py` 的 `get_status()` 函数

```
响应 (处理中): { "task_id": "uuid", "status": "processing", "progress": 45 }

响应 (完成):
{
  "task_id": "uuid",
  "status": "done",
  "progress": 100,
  "stems": {
    "vocals": { "url": "/download/vocals/uuid", "duration": 30.5 },
    "music":  { "url": "/download/music/uuid",  "duration": 30.5 },
    "sfx":    { "url": "/download/sfx/uuid",    "duration": 30.5 }
  }
}

响应 (错误): { "task_id": "uuid", "status": "error", "progress": 0, "error": "错误详情" }
```

### 7.3 GET /download/{stem}/{task_id}?format=wav|mp3 — 下载音轨

**文件**: `main.py` 的 `download_stem()` 函数

返回 `FileResponse`，format=mp3 时先用 ffmpeg 转码（320kbps）再返回。文件名格式：`AudioSift_{stem}.wav` 或 `.mp3`。

### 7.4 GET /health — 健康检查

响应：`{ "status": "ok", "gpu_available": true/false }`

## 8. 完整数据流（音频分离全链路）

```
┌─ 前端 ────────────────────────────────────────────────────────┐
│                                                                 │
│  1. UploadZone: onDrop/onClick                                  │
│     → validateFile (格式+大小)                                  │
│     → decodeAudioFile (FileReader → AudioContext.decodeAudioData)
│     → setAudioFile / setAudioBuffer / setAudioInfo              │
│                                                                 │
│  2. WaveformViewer: watch(audioBuffer)                          │
│     → draw() → extractPeaks(buffer, canvasWidth, 0, duration)  │
│     → Canvas 2D 绘制蓝色柱状波形                                 │
│     → 拖拽选区 → addTimeSelection({id, startTime, endTime})    │
│                                                                 │
│  3. SeparationPanel: handleSeparate()                           │
│     → 读取 state.activeStems, state.timeSelections              │
│     → uploadAndSeparate(file, startTime, endTime, activeStems) │
│                                                                 │
│  4. uploadAndSeparate:                                          │
│     → FormData: file + start_time + end_time + stems            │
│     → POST /api/separate → 获取 task_id                         │
│     → setTaskId / setSeparationStatus('processing')              │
│     → startPolling(task_id): setInterval(每 2 秒)               │
│                                                                 │
│  5. pollStatus 轮询:                                            │
│     → GET /api/status/{task_id} → 获取 progress/stems/error    │
│     → setSeparationProgress(res.progress)                       │
│     → status=done → setResults(res.stems) → setStatus('done')  │
│     → status=error → setSeparationError → setStatus('error')   │
│                                                                 │
│  6. TrackCard ×3:                                               │
│     → 读取 state.results, state.volumes                         │
│     → audioRef.src = getDownloadUrl(stem, taskId, 'wav')        │
│     → togglePlay → audioRef.play()/pause() + setPlayingTrack   │
│                                                                 │
│  7. ExportPanel:                                                │
│     → setExportFormat('wav'|'mp3')                              │
│     → downloadAll → forEach stem create <a> + click            │
│     → downloadSingle → create <a> + click                       │
│                                                                 │
└──────────────────┬──────────────────────────────────────────────┘
                   │ POST /api/separate
                   ▼
┌─ 后端 ────────────────────────────────────────────────────────┐
│                                                                 │
│  separate_audio():                                              │
│    → 验证格式 → UUID 命名 → 保存到 uploads/                    │
│    → tasks[task_id] = {status:"loading", progress:0, ...}      │
│    → threading.Thread(run_separation, daemon=True).start()     │
│    → 返回 {"task_id", "status": "loading"}                     │
│                                                                 │
│  run_separation(task_id, file_path, start_time, end_time):     │
│    → progress 0: status="processing"                           │
│    → progress 5:  slice_audio(ffmpeg -ss -t)  ← 如有切片需求  │
│    → progress 10: get_model() 异步加载 mdx_extra_q             │
│    → progress 20: sf.read → torch.from_numpy                  │
│    → 重采样(如需要) + normalize(mean/std)                      │
│    → progress 30: apply_model(model, wav)  ← AI 推理核心      │
│    → 反归一化 denormalize                                      │
│    → progress 80: stems_dict = {vocals, drums, bass, other}   │
│    → progress 100: merge_stems(stems_dict, output_dir)         │
│    → status="done", stems=result                               │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

## 9. AI 模型方案 —— Demucs mdx_extra_q

**文件**: [backend/separator.py](file:///c:/Users/NEIL/AppData/Roaming/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/6a4da5c25923191041f7bc77/backend/separator.py) + [backend/main.py](file:///c:/Users/NEIL/AppData/Roaming/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/6a4da5c25923191041f7bc77/backend/main.py)

- **模型名称**: `mdx_extra_q`（由环境变量 `DEMUCS_MODEL` 控制，默认为此值）
- **加载方式**: `separator.py` 中 `get_model()` 通过 `asyncio.Lock` 实现单例加载，首次调用时下载预训练权重
- **推理参数**: `shifts=2, split=True, overlap=0.25, num_workers=0`
- **输入**: 立体声 WAV，自动重采样到模型采样率
- **输出**: 4 轨原始分离 → 3 轨映射

### 9.1 关键函数详解

**`get_model()`** — [separator.py:L28-L36](file:///c:/Users/NEIL/AppData/Roaming/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/6a4da5c25923191041f7bc77/backend/separator.py#L28-L36)

```python
async def get_model():
    global _model
    if _model is None:
        async with _model_lock:           # 双检查锁，防止并发重复加载
            if _model is None:
                _model = pretrained.get_model(MODEL_NAME)  # "mdx_extra_q"
                if torch.cuda.is_available():
                    _model.cuda()         # 有 GPU 则移到显存
    return _model
```

**`slice_audio()`** — [separator.py:L39-L48](file:///c:/Users/NEIL/AppData/Roaming/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/6a4da5c25923191041f7bc77/backend/separator.py#L39-L48)

```python
def slice_audio(input_path, start_time, end_time):
    cmd = ["ffmpeg", "-y", "-i", input_path, "-ss", str(start_time)]
    if end_time > 0:
        cmd += ["-t", str(end_time - start_time)]  # -t 指定时长
    cmd.append(slice_path)
    subprocess.run(cmd, capture_output=True, check=True)
```

**`merge_stems()`** — [separator.py:L56-L84](file:///c:/Users/NEIL/AppData/Roaming/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/6a4da5c25923191041f7bc77/backend/separator.py#L56-L84)

```python
def merge_stems(stems, output_dir, sample_rate=44100):
    result = {}
    # vocals → 直接保留为 vocals.wav
    if stems.get("vocals") is not None:
        save_wav("vocals.wav", stems["vocals"])
        result["vocals"] = {...}

    # bass + other → 相加为 music.wav
    bass, other = stems.get("bass"), stems.get("other")
    if bass is not None or other is not None:
        music_tensor = (bass if bass is not None else 0) + (other if other is not None else 0)
        save_wav("music.wav", music_tensor)
        result["music"] = {...}

    # drums → 直接保留为 sfx.wav
    if stems.get("drums") is not None:
        save_wav("sfx.wav", stems["drums"])
        result["sfx"] = {...}
    return result
```

> **修改指引**：如需 4 轨全保留（不做合并），删掉 `bass + other` 的逻辑，改为分别 `save_wav("bass.wav")` 和 `save_wav("other.wav")`，同时前端需增加对应的 `StemType` 和 UI 卡片。

**`run_separation()`** — [main.py:L43-L116](file:///c:/Users/NEIL/AppData/Roaming/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/6a4da5c25923191041f7bc77/backend/main.py#L43-L116)

关键推理代码（第 80-90 行）：

```python
with torch.no_grad():
    sources = apply_model(
        model, wav[None],
        device=device, shifts=2, split=True,
        overlap=0.25, progress=True, num_workers=0,
    )[0]
sources = sources * ref.std() + ref.mean()  # 反归一化
```

- `shifts=2`: 时间偏移增强（对输入做 2 次偏移推理再平均，提升质量）
- `overlap=0.25`: 分块推理时 25% 重叠（避免块边界伪影）
- `split=True`: 长音频自动分块处理

> **修改指引**：想更快但质量稍降 → 改 `shifts=1, overlap=0`；想更高质量但更慢 → 改 `shifts=4, overlap=0.5`。

## 10. 关键函数修改速查表

| 修改需求 | 改哪里 | 具体操作 |
|---------|--------|---------|
| 加一种新音轨类型 | `useAudioStore.ts` 的 `StemType` + `separator.py` `merge_stems()` + `STEM_COLORS` | 类型联合加常量 → 映射加分支 → 颜色加一条 |
| 改上传文件大小限制 | `UploadZone.vue` 的 `validateFile()` | 改 `100 * 1024 * 1024` |
| 改支持的音频格式 | `UploadZone.vue` 的 `validExtensions` + 后端 `ALLOWED_EXTENSIONS` | 前后端同步加 |
| 改轮询间隔 | `SeparationPanel.vue` 的 `setInterval(..., 2000)` | 改 2000 毫秒 |
| 改 AI 模型 | `backend/separator.py` 的 `MODEL_NAME` | 改为其他 Demucs 模型名 |
| 改音轨颜色 | `useAudioUtils.ts` 的 `STEM_COLORS` | 只改这个对象 |
| 改页面主背景 | `style.css` 的 `body` | 改 `background: #08080c` |
| 改品牌粉 | `style.css` 的 `.range-slider`/`.shimmer-bg`/`.aurora-bg` | 全局替换 `#e04090` |
| 加一个新页面 | 建 .vue → `router/index.ts` 加路由 → `AppSidebar.vue` 加导航项 | 三步走 |
| 改 4→3 轨映射 | `separator.py` 的 `merge_stems()` | 重写合并逻辑 |
| 改模型推理质量/速度 | `main.py` 的 `apply_model()` 参数 | 改 `shifts`/`overlap` |
| 改 WAV→MP3 码率 | `separator.py` 的 `convert_to_mp3()` | 改 `"-b:a", "320k"` |

## 11. 构建与开发配置

### 11.1 Vite 配置

**文件**: [vite.config.ts](file:///c:/Users/NEIL/AppData/Roaming/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/6a4da5c25923191041f7bc77/vite.config.ts)

```typescript
export default defineConfig({
  build: {
    sourcemap: false,
    rollupOptions: {
      output: { manualChunks: { 'vendor-icons': ['lucide-vue-next'] } }  // 图标单独打包
    }
  },
  plugins: [vue(), Inspector(), traeBadgePlugin(...)],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },  // @ → src/
  server: {
    proxy: {
      // 开发模式: 前端请求 /api/xxx → 代理到 http://127.0.0.1:8000/xxx
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, '') }
    }
  }
})
```

### 11.2 Proxy 原理说明

开发时前端跑 `npm run dev`（默认 localhost:5173），后端跑 `python backend/main.py`（localhost:8000）。Vite 的 proxy 配置将前端的 `/api/xxx` 请求代理到后端的 `/xxx`（去掉 /api 前缀），避免跨域问题。

生产环境由 Nginx 做同样的反向代理：`location /api/ { proxy_pass http://127.0.0.1:8000/; }`

### 11.3 npm scripts

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（Vite HMR） |
| `npm run build` | 生产构建（先 vue-tsc 类型检查，再 vite build） |
| `npm run preview` | 预览生产构建 |
| `npm run lint` | ESLint 检查 |
| `npm run lint:fix` | ESLint 自动修复 |

启动流程：`cd backend && python main.py` 启动后端 → `npm run dev` 启动前端 → 打开 http://localhost:5173

## 12. 前后端交互协议总结

```
前端 Vite (localhost:5173)           Nginx (生产)           FastAPI (localhost:8000)
───────────────────────────          ────────               ────────────────────────
fetch('/api/separate')  ──proxy──▶  /api/* → 8000  ──▶   POST /separate
fetch('/api/status/id') ──proxy──▶  /api/* → 8000  ──▶   GET  /status/id
fetch('/api/download/...') ─proxy─▶ /api/* → 8000  ──▶   GET  /download/...

前端 API_BASE = '/api'  ← 开发时经 Vite proxy，生产时经 Nginx proxy
后端路由无 /api 前缀   ← 由 proxy 层去掉
```
