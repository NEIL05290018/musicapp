# AudioSift 开发者学习指南

> 本文档帮助你快速理解 AudioSift 项目的全貌：如何跑起来、前后端如何协同工作、核心代码在哪里。

---

## 1. 一分钟了解这个项目

**AudioSift** = 一个 AI 音频分离 Web 应用。你把 MP3 拖进去 → AI 帮你把人声、配乐、音效拆开 → 下载三个独立的音频文件。v2.1 新增了登录系统 + MySQL 数据库，支持收藏歌曲和歌单。

```
拖拽上传 → 看波形 → 点"开始分离" → 等待 AI 处理 → 试听/下载三个音轨
        ↳ 登录后 → 收藏喜欢的歌曲和歌单
```

**技术栈一句话**：Vue 3 前端 + FastAPI Python 后端 + Meta Demucs AI 模型 + MySQL 8.0 数据库。

---

## 2. 怎么把项目跑起来

### 2.1 前提

- Node.js 18+（前端）
- Python 3.10+（后端）
- MySQL 8.0+（数据库）
- 约 10GB 磁盘空间（AI 模型权重约 160MB）

### 2.1.1 数据库准备

```bash
# 登录 MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE audiosift DEFAULT CHARSET utf8mb4;

# 退出
exit;
```

环境变量（可选，不设则使用默认值）：
```bash
# 数据库连接（默认值）
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=audiosift

# JWT 密钥（默认值）
JWT_SECRET_KEY=your-secret-key
```

### 2.2 启动后端

```bash
cd backend

# 创建虚拟环境（首次）
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # Mac/Linux

# 安装依赖（首次）
pip install -r requirements.txt

# 启动服务（首次启动会自动下载 Demucs 模型，需要等待）
python main.py
```

看到 `Model loaded. Sources: ['drums', 'bass', 'other', 'vocals']` 就表示后端就绪。

启动时会自动在 MySQL 中创建 `users`、`favorite_songs`、`favorite_playlists` 三张表。

**初始化测试数据**（可选，给数据库填充 5 个测试账号）：
```bash
cd backend
python seed_data.py
```

**验证**：打开浏览器访问 http://localhost:8000/health，看到 `{"status":"ok","gpu_available":false}` 表示正常。

测试账号（运行 seed_data.py 后可用）：

| 邮箱 | 密码 |
|------|------|
| test@alice.com | password123 |
| test@bob.com | password123 |
| test@carol.com | password123 |
| admin@audiosift.com | admin123 |
| guest@audiosift.com | guest123 |

### 2.3 启动前端

```bash
# 在项目根目录
npm install        # 首次
npm run dev        # 启动开发服务器
```

打开 http://localhost:5173 就能看到界面了。

### 2.4 为什么前端能调到后端？

[Vite 配置了代理](file:///c:/Users/NEIL/AppData/Roaming/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/6a4da5c25923191041f7bc77/vite.config.ts#L37-L44)：前端 `/api/*` 请求会自动转发到 `http://127.0.0.1:8000`，去掉了 `/api` 前缀。

```
浏览器 fetch('/api/separate')
  → Vite Proxy → http://127.0.0.1:8000/separate  ← FastAPI 监听的路径
```

**不需要处理跨域**，Vite 在中间代劳了。

---

## 3. 前端架构 —— 从入口到每个组件

### 3.1 入口流程

```
main.ts
  → createApp(App)     // 创建 Vue 实例
  → app.use(router)    // 装路由
  → app.mount('#app')  // 挂到 index.html 的 <div id="app">

App.vue
  → AlbumWall    (全局背景动画)
  → AppSidebar   (左边 240px 导航栏)
  → <router-view /> (根据 URL 显示不同页面)
```

### 3.2 路由是怎么工作的

[文件: src/router/index.ts](file:///c:/Users/NEIL/AppData/Roaming/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/6a4da5c25923191041f7bc77/src/router/index.ts)

```typescript
const router = createRouter({
  history: createWebHistory(),  // 无 # 的干净 URL
  routes: [
    { path: '/',                      component: () => import('@/pages/HomePage.vue') },
    { path: '/discover',              component: () => import('@/pages/DiscoverPage.vue') },
    { path: '/discover/playlist/:id', component: () => import('@/pages/PlaylistPage.vue') },
    { path: '/about',                 component: () => import('@/pages/AboutPage.vue') },
    { path: '/auth',                  component: () => import('@/pages/AuthPage.vue') },
  ],
})
```

- `() => import(...)` 是**懒加载**——用户第一次访问该页面时才下载对应的 JS 文件，首页加载更快
- `:id` 是**动态路由**——`/discover/playlist/p001` 和 `/discover/playlist/p005` 都匹配同一条
- 在组件中通过 `useRoute().params.id` 获取这个动态参数

### 3.3 状态管理 —— 不需要 Pinia，一个 reactive 就够了

[文件: src/composables/useAudioStore.ts](file:///c:/Users/NEIL/AppData/Roaming/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/6a4da5c25923191041f7bc77/src/composables/useAudioStore.ts)

**核心思路**：在模块顶层创建一个 `reactive` 对象，用工厂函数包装它。任何组件调用 `useAudioStore()` 拿到的都是**同一个对象**。

```typescript
// 简化版理解：
const state = reactive({ audioFile: null, audioBuffer: null, ... })

export function useAudioStore() {
  // 所有组件调用此函数，共享同一个 state
  return { state, setAudioFile, setAudioBuffer, ... }
}
```

**为什么这样设计？** 因为 AudioSift 是单页面状态（一次只处理一个音频），不需要 Pinia 的模块化能力。16 个 setter 方法让状态修改可追溯。

**关键状态字段**：

| 字段 | 含义 | 谁写 | 谁读 |
|------|------|------|------|
| `audioBuffer` | 解码后的音频数据 | UploadZone | WaveformViewer, HomePage |
| `timeSelections` | 波形选区列表 | WaveformViewer | SeparationPanel |
| `activeStems` | 要分离哪些音轨 | SeparationPanel | uploadAndSeparate |
| `separationStatus` | 分离状态 | SeparationPanel | HomePage(控制显隐) |
| `results` | 分离完成的音轨 | SeparationPanel(轮询) | TrackCard, ExportPanel |
| `volumes` | 各音轨音量 | TrackCard(滑块) | TrackCard(播放时用) |

### 3.4 用户认证 —— useAuthStore（v2.1 新增）

[文件: src/composables/useAuthStore.ts](file:///c:/Users/NEIL/AppData/Roaming/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/6a4da5c25923191041f7bc77/src/composables/useAuthStore.ts)

和 `useAudioStore` 同样的 `reactive` + 工厂函数模式。管理三件事：**Token**、**用户信息**、**收藏列表**。

```typescript
// 核心数据结构
const state = reactive({
  token: '',                          // JWT，存在 localStorage
  user: null,                         // { id, username, email, avatar_url }
  favoriteSongIds: [],                // 收藏的歌曲 ID 列表
  favoritePlaylistIds: [],            // 收藏的歌单 ID 列表
})
```

**关键函数**：

| 函数 | 流程 |
|------|------|
| `register(username, email, password)` | `apiFetch('/user/register', POST)` → `setAuth(token, user)` → `loadFavorites()` |
| `login(email, password)` | `apiFetch('/user/login', POST)` → `setAuth(token, user)` → `loadFavorites()` |
| `restoreSession()` | 从 localStorage 取 token → `apiFetch('/user/me')` 验证 → `loadFavorites()` |
| `toggleFavoriteSong(songId)` | `apiFetch('/user/favorite/song', POST)` → 根据返回的 `favorited` 增删本地数组 |
| `clearAuth()` | 清空 token + user + 收藏 → `localStorage.removeItem('auth_token')` |

**JWT 怎么传**：`apiFetch()` 内部自动在每个请求头加上 `Authorization: Bearer <token>`。

**Token 持久化流程**：
```
登录成功 → localStorage.setItem('auth_token', token)
  ↓
页面刷新 → AppSidebar onMounted → restoreSession()
  ↓
GET /api/user/me (带 Bearer Token) → 验证通过 → 恢复用户状态和收藏
```

### 3.5 组件逐个讲

#### UploadZone.vue —— 上传入口

[文件](file:///c:/Users/NEIL/AppData/Roaming/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/6a4da5c25923191041f7bc77/src/components/UploadZone.vue)

**做什么**：拖拽或点击上传音频文件 → 验证格式和大小 → 解码 → 存入全局状态。

**关键函数**：
- `validateFile(file)` → 检查扩展名 `.mp3/.wav/.flac/.ogg/.m4a/.aac` + 大小 ≤ 100MB
- `processFile(file)` → 验证 → `decodeAudioFile()` → `setAudioFile()` + `setAudioBuffer()`
- `onDrop/onDragOver/onDragLeave` → 拖拽事件的蓝色高亮反馈

**三种 UI 状态**：空（等待上传）、加载中（解码 spinner）、已上传（文件名 + 更换按钮）

#### WaveformViewer.vue —— 波形可视化

[文件](file:///c:/Users/NEIL/AppData/Roaming/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/6a4da5c25923191041f7bc77/src/components/WaveformViewer.vue)

**做什么**：把 AudioBuffer 画成波形图，支持缩放和选区。

**关键函数**：
- `draw()` → canvas 2D 核心绘制：提取峰值 → 画蓝色柱状条 → 画时间刻度 → 画已有选区
- `extractPeaks(buffer, width, startTime, endTime)` → 从第一声道按像素分组取最大绝对值
- `onMouseDown/Move/Up` → 拖拽选区（粉红虚线矩形 → 松手后转蓝色）
- `onWheel` → 滚轮缩放 `zoom` 变量 1~50x

**Canvas 渲染原理**：拿到 Canvas 的 DOM → `getContext('2d')` → 考虑 devicePixelRatio 适配高分屏 → `extractPeaks` 拿到每个像素位置的最大振幅 → 画矩形条（alpha 随振幅变化 0.15~0.7）

#### SeparationPanel.vue —— 分离引擎控制

[文件](file:///c:/Users/NEIL/AppData/Roaming/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/6a4da5c25923191041f7bc77/src/components/SeparationPanel.vue)

**做什么**：选择音轨 → 发起分离 → 轮询状态 → 拿结果。

**关键函数**：
- `handleSeparate()` → 读选区时间+选中音轨 → `uploadAndSeparate()` POST 文件 → 获取 taskId → `startPolling(taskId)`
- `startPolling(taskId)` → `setInterval(每 2 秒)` → `pollStatus()` → 根据返回值更新 status/progress/results
- `handleStop()` → 清掉定时器 → 重置状态

**状态机**：
```
idle → uploading → processing → done
                            ↘ error
```

#### TrackCard.vue —— 单轨预览播放

[文件](file:///c:/Users/NEIL/AppData/Roaming/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/6a4da5c25923191041f7bc77/src/components/TrackCard.vue)

**做什么**：显示一条分离结果，播放/暂停/调音量/下载。

**关键函数**：
- `togglePlay()` → `<audio>` 元素的 play()/pause()，同步更新 `playingTrack` 全局状态
- `onVolumeChange()` → `<input range>` 的输入事件 → 改 audio 音量
- `handleDownload()` → 创建隐藏 `<a>` 标签，href 指向下载 URL → `click()` 触发下载

**props**：`stemType`（vocals/music/sfx）、`stemUrl`、`duration`

#### ExportPanel.vue —— 批量导出

[文件](file:///c:/Users/NEIL/AppData/Roaming/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/6a4da5c25923191041f7bc77/src/components/ExportPanel.vue)

**做什么**：WAV/MP3 格式切换 + 打包下载（三个文件依次触发） + 单轨下载。

**关键函数**：
- `downloadAll()` → 遍历三个 stem → 每个创建一个隐藏 `<a>` 并 click
- `downloadSingle(stem)` → 单个 stem 创建下载链接

#### AuthPage.vue —— 登录/注册（v2.1 新增）

[文件](file:///c:/Users/NEIL/AppData/Roaming/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/6a4da5c25923191041f7bc77/src/pages/AuthPage.vue)

**做什么**：单页切换登录/注册模式，调用 useAuthStore 的 API。

**关键函数**：
- `submit()` → 表单验证 → `auth.register()` 或 `auth.login()` → 成功后 `router.push('/discover')`
- 通过 `isRegister` 变量切换表单显示（登录 2 个字段 vs 注册 4 个字段）
- 底部 4 个测试账号按钮 → 一键填入邮箱和密码

**设计要点**：未登录时侧边栏的「登录/注册」按钮跳转到此页面；登录后自动跳转回 `/discover`。

#### AppSidebar 中的用户区（v2.1 修改）

侧边栏 `onMounted` 时调用 `auth.restoreSession()` 自动恢复登录态。根据 `auth.isLoggedIn()` 的结果显示不同 UI：
- **未登录**：渐变色「登录 / 注册」按钮
- **已登录**：用户名 + 邮箱 + "X首收藏 · Y个歌单" + 退出按钮

---

## 4. 后端架构 —— 从接收请求到返回音轨

### 4.1 五个文件的分工（v2.1 从 2 个文件扩展到 5 个）

| 文件 | 角色 |
|------|------|
| [main.py](file:///c:/Users/NEIL/AppData/Roaming/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/6a4da5c25923191041f7bc77/backend/main.py) | API 服务器：接收请求、路由调度、进度管理、启动推理线程。v2.1 新增：注册 user_router + startup 自动建表 |
| [separator.py](file:///c:/Users/NEIL/AppData/Roaming/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/6a4da5c25923191041f7bc77/backend/separator.py) | 工具模块：模型加载、音频切片、4→3轨映射、格式转码 |
| [database.py](file:///c:/Users/NEIL/AppData/Roaming/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/6a4da5c25923191041f7bc77/backend/database.py) | ★新增：SQLAlchemy ORM 模型 + MySQL 连接配置 |
| [auth.py](file:///c:/Users/NEIL/AppData/Roaming/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/6a4da5c25923191041f7bc77/backend/auth.py) | ★新增：bcrypt 密码哈希 + JWT 签发/验证 + `get_current_user` 依赖注入 |
| [user_routes.py](file:///c:/Users/NEIL/AppData/Roaming/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/6a4da5c25923191041f7bc77/backend/user_routes.py) | ★新增：7 个用户/收藏 API 端点（前缀 `/user`） |

### 4.2 十一个 API 端点（v2.1 从 4 个扩展到 11 个）

**音频分离相关（4 个）**：

| 端点 | 方法 | 用途 | 前端调用时机 |
|------|------|------|------------|
| `/separate` | POST | 接收上传文件 + 启动后台推理线程 | 用户点"开始 AI 分离" |
| `/status/{task_id}` | GET | 查询进度/结果 | 每 2 秒轮询一次 |
| `/download/{stem}/{task_id}?format=` | GET | 下载分离完成的 WAV/MP3 | 用户点下载按钮 |
| `/health` | GET | 健康检查 + GPU 状态 | 部署运维使用 |

**用户认证相关（7 个，v2.1 新增）**：

| 端点 | 方法 | 认证 | 用途 |
|------|------|------|------|
| `/user/register` | POST | 无 | 注册（返回 token + user） |
| `/user/login` | POST | 无 | 登录（返回 token + user） |
| `/user/me` | GET | Bearer | 获取当前用户信息 |
| `/user/favorite/song` | POST | Bearer | 收藏/取消收藏歌曲（toggle） |
| `/user/favorite/playlist` | POST | Bearer | 收藏/取消收藏歌单（toggle） |
| `/user/favorites/songs` | GET | Bearer | 获取收藏歌曲 ID 列表 |
| `/user/favorites/playlists` | GET | Bearer | 获取收藏歌单 ID 列表 |

### 4.3 为什么不直接返回结果？

音频分离是**长任务**（CPU/GPU 上可能要几十秒到几分钟）。如果等推理完再返回，HTTP 请求会超时。所以设计成**异步模式**：

```
POST /separate → 立刻返回 task_id + "loading"
                  ↓（后台线程继续跑）
GET /status/id  → 前端每 2 秒问一次"完了没？"
                  ↓
GET /download/  → 完成后再下载
```

线程用 `threading.Thread(daemon=True)` 启动，主进程退出时自动清理。

### 4.4 run_separation 全流程（逐步骤）

[main.py 的 run_separation()](file:///c:/Users/NEIL/AppData/Roaming/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/6a4da5c25923191041f7bc77/backend/main.py#L43-L116)

```
progress 0%
  ↓  status = "processing"
progress 5%
  ↓  如果 start_time>0 或 end_time>0 → ffmpeg 切片 (只处理选区)
progress 10%
  ↓  异步加载 Demucs 模型 (首次最慢，之后复用)
progress 20%
  ↓  soundfile 读取 WAV → torch.from_numpy 转张量
  ↓  如果采样率不匹配 → torchaudio 重采样
  ↓  归一化: (wav - mean) / std
progress 30%
  ↓  ┌────────────────────────┐
  ↓  │ apply_model(model, wav)│  ← AI 推理核心（最耗时）
  ↓  │  参数: shifts=2        │     对输入做时间偏移增强
  ↓  │        overlap=0.25    │     分块推理 25% 重叠
  ↓  │        split=True      │     长音频自动切块
  ↓  └────────────────────────┘
  ↓  返回: sources = [vocals, drums, bass, other] 四个张量
  ↓  反归一化: sources * std + mean
progress 80%
  ↓  merge_stems() → 4 轨 → 3 轨 + 保存 WAV 文件
  ↓    vocals → vocals.wav     (人声)
  ↓    bass+other → music.wav  (配乐 = 贝斯 + 其他乐器)
  ↓    drums → sfx.wav         (音效 = 鼓组)
progress 100%
  ↓  status = "done"
```

### 4.5 Demucs 模型做了什么？

Demucs 是 Meta（Facebook）开源的音频源分离模型。`mdx_extra_q` 是带量化的混合 Transformer 版本。

**可以这样理解**：
- 输入：一段混合音频（44.1kHz 立体声）
- 过程：6 层 Transformer 网络学出了"哪些频率成分属于人声、哪些属于鼓、哪些属于贝斯..."
- 输出：4 条独立的音轨波形（vocals, drums, bass, other）

**shifts 参数是什么？** 把输入信号在时间轴上偏移几个采样点，分别做推理，再把结果对齐平均。可以提升分离质量，代价是推理时间翻倍（shifts=2 就是 2 倍时间）。

**overlap 参数是什么？** 长音频会被切成小块逐个推理。overlap=0.25 表示块之间重叠 25%，避免拼接处的不自然。重叠越大越平滑但越慢。

### 4.6 存储位置

```
uploads/          ← 用户上传的文件 (UUID 命名)
outputs/          ← 分离结果
  {task_id}/
    vocals.wav    ← 人声
    music.wav     ← 配乐
    sfx.wav       ← 音效
```

---

## 5. 前端全链路数据流 —— 跟着数据走一遍

下面跟踪一次完整的"上传 → 分离 → 下载"流程：

```
【第 1 步：上传】
用户拖拽 MP3 到 UploadZone
  → validateFile() 通过
  → processFile()
    → decodeAudioFile(file):
        FileReader.readAsArrayBuffer(file)
        → AudioContext.decodeAudioData(arrayBuffer)
        → resolve(AudioBuffer)
    → setAudioFile(file)      ← 存到全局 state
    → setAudioBuffer(buffer)  ← 存到全局 state
    → setAudioInfo(duration, sampleRate)

【第 2 步：波形】
WaveformViewer 监听 state.audioBuffer 变化
  → nextTick(draw)
  → extractPeaks(buffer, canvasWidth, 0, duration)
  → Canvas ctx.fillRect(每个像素画一个柱状条)

【第 3 步：选区】
用户在波形上拖拽鼠标
  → onMouseDown → 记录起始时间
  → onMouseMove → 记录当前时间，Canvas 画粉色虚线
  → onMouseUp → 如果 >0.1 秒 → addTimeSelection({id, startTime, endTime})

【第 4 步：启动分离】
用户点"开始 AI 分离"
  → handleSeparate()
  → uploadAndSeparate(file, startTime, endTime, activeStems):
      const formData = new FormData()
      formData.append('file', file)
      formData.append('start_time', '12.5')
      formData.append('end_time', '45.3')
      formData.append('stems', 'vocals,music,sfx')
      fetch('/api/separate', { method:'POST', body:formData })
  → 拿到 { task_id: "abc123...", status: "loading" }
  → setTaskId("abc123...")
  → setSeparationStatus("processing")
  → setSeparationProgress(10)
  → startPolling("abc123...")

【第 5 步：轮询】
每 2 秒执行一次：
  → pollStatus("abc123...")  → GET /api/status/abc123...
  → 返回: { status:"processing", progress:45 }
  → setSeparationProgress(45)
  → (2 秒后) 返回: { status:"processing", progress:78 }
  → setSeparationProgress(78)
  → (2 秒后) 返回: {
        status:"done", progress:100,
        stems: {
          vocals: { url:"/download/vocals/abc123", duration:30.5 },
          music:  { url:"/download/music/abc123",  duration:30.5 },
          sfx:    { url:"/download/sfx/abc123",    duration:30.5 }
        }
      }
  → setSeparationStatus("done")
  → setResults(stems)

【第 6 步：展示结果】
HomePage 中 v-if="Object.keys(state.results).length > 0" 条件渲染
  → TrackCard ×3 显示
    每张卡片:
    audioRef.src = getDownloadUrl(stemType, taskId, 'wav')
    → 指向 /api/download/vocals/abc123?format=wav

【第 7 步：试听】
用户点 TrackCard 的播放按钮
  → togglePlay()
  → audioRef.play()
  → setPlayingTrack('vocals')

【第 8 步：下载】
用户点导出
  → ExportPanel downloadAll()
  → 遍历三个 stem, 每个执行:
      const a = document.createElement('a')
      a.href = '/api/download/vocals/abc123?format=wav'
      a.download = 'AudioSift_人声.wav'
      a.click()
  → 浏览器弹出三次下载
```

---

## 5.5 用户认证全链路数据流（v2.1 新增）

```
【第 1 步：进入 /auth】
用户在侧边栏点击「登录 / 注册」→ router.push('/auth')
  → AuthPage.vue 渲染
  → 默认显示登录模式（isRegister=false）

【第 2 步：登录】
用户输入邮箱 + 密码 → submit()
  → auth.login(email, password):
      apiFetch('/user/login', { method:'POST', body:{email, password} })
        ← 后端 user_routes.py → 查 users 表 → bcrypt 验证 → 签发 JWT
        ← 返回: { token: "eyJ...", user: {id, username, email, ...} }
  → setAuth(token, user):
      state.token = token
      state.user = user
      localStorage.setItem('auth_token', token)
  → loadFavorites():
      Promise.all([
        apiFetch('/user/favorites/songs'),   ← GET，带 Bearer
        apiFetch('/user/favorites/playlists')
      ])
      state.favoriteSongIds = ['s001', 's003', ...]
      state.favoritePlaylistIds = ['p001', 'p003', ...]
  → router.push('/discover')

【第 3 步：显示用户信息】
AppSidebar 的 onMounted → restoreSession()
  → 从 localStorage 取 token → GET /user/me → 验证
  → 显示"用户名、邮箱、X首收藏 · Y个歌单"

【第 4 步：收藏歌曲】
用户在 DiscoverPage 点击心形按钮
  → auth.toggleFavoriteSong('s005')
      apiFetch('/user/favorite/song', { method:'POST', body:{song_id:'s005'} })
        ← 后端查 favorite_songs 表
        ← 已有记录 → DELETE → 返回 {favorited: false}
        ← 无记录 → INSERT → 返回 {favorited: true}
  → 前者: state.favoriteSongIds.push('s005')  ← 心形变填充
  → 后者: state.favoriteSongIds.filter(...)    ← 心形变空心
```

---

## 6. 调试技巧

### 6.1 前端调试

1. **浏览器 DevTools → Network 面板**：看 `/api/separate` 的请求是否发出、响应是什么
2. **Vue DevTools**：装浏览器扩展，直接看 `useAudioStore` 的 state 当前值
3. **console.log**：在 `useAudioStore` 的 setter 方法里加 log，追踪谁在改状态

### 6.2 后端调试

```bash
# 直接运行看输出
python backend/main.py

# 测试健康检查
curl http://localhost:8000/health

# 用 curl 模拟上传（不通过前端）
curl -X POST http://localhost:8000/separate \
  -F "file=@test.mp3" \
  -F "start_time=0" \
  -F "end_time=-1" \
  -F "stems=vocals,music,sfx"

# 查询任务状态（替换 task_id）
curl http://localhost:8000/status/你的task_id
```

### 6.3 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| 前端访问 localhost:5173 空白 | 后端没启动导致 /api 请求报错但页面渲染正常 | 检查控制台 Network 面板 |
| "无法连接后端服务" | 后端没启动 | `python backend/main.py` |
| 上传后没有波形 | AudioContext 解码失败 | 检查文件格式 |
| 分离一直不结束 | 模型推理慢（CPU 模式几十秒到几分钟） | 耐心等，progress 在变即可 |
| 分离报错 | 文件损坏/磁盘空间不足 | 看后端终端输出 |
| 登录/注册报 500 | MySQL 没连上 | 确认数据库已创建，DB_PASSWORD 正确 |
| 收藏点不动 | 没登录 | 检查侧边栏是否显示用户信息 |
| "ModuleNotFoundError: No module named 'sqlalchemy'" | 新依赖没装 | `pip install sqlalchemy pymysql python-jose passlib[bcrypt]` |

---

## 7. 项目演示准备

如果你需要在课上演示这个项目，建议按这个顺序：

### 7.1 演示脚本

1. **自我介绍 + 一句话项目介绍**："我做的是一个 AI 音频分离平台。前端 Vue 3，后端 Python FastAPI + MySQL 数据库，AI 模型用 Meta 的 Demucs。支持用户注册登录和收藏功能。"

2. **展示运行**：
   - 展示未登录 → 侧边栏「登录/注册」按钮 → 点进去 → 用测试账号登录
   - 登录后展示侧边栏用户信息 + 收藏统计
   - 回到 Discover → 展示心形收藏按钮 → 点几个收藏 → 展示「我的音乐中心」区块
   - 去 Workbench → 拖 MP3 进去 → 点"开始分离"→ 展示进度条 → 展示三条音轨 → 播放对比 → 下载

3. **技术亮点**（可以提到但不需要演示）：
   - 波形图用 Canvas 2D 手写绘制，支持缩放和选区
   - 状态管理用 Vue reactive 单例，不需要 Pinia
   - Vite proxy 解决跨域，前后端分离架构
   - 后端异步设计：POST 立即返回 + 轮询，不阻塞

### 7.2 可能的临场问题

| 老师可能问 | 回答思路 |
|-----------|---------|
| "为什么选 Vue 而不是 React？" | Vue 3 Composition API 简洁、和 TypeScript 配合好、学习曲线平滑 |
| "为什么不用 Pinia？" | 单页面状态简单，一个 reactive 对象就够，没必要引入额外的依赖 |
| "模型是哪里来的？" | Meta 开源的 Demucs，用 Python 的 demucs 库加载预训练权重 |
| "分离一次要多久？" | GPU 约 10 倍实时（1 分钟音频 6 秒分离完），CPU 约 0.5 倍实时 |
| "如果让你加一个 XX 功能，怎么做？" | 见下方速查表 |
| "收藏功能怎么实现的？" | 后端 toggle 模式（INSERT/DELETE），前端同步本地数组，localStorage 存储 JWT，每次请求自动带 Bearer Token |
| "密码安全吗？" | bcrypt 哈希存储，不存明文；JWT HS256 签名，24 小时过期 |
| "数据库表关系是什么？" | users 一对多 favorite_songs/favorite_playlists，通过 user_id 关联 |

### 7.3 常见修改需求速查

| 需求 | 操作 |
|------|------|
| "把配乐再拆成贝斯和伴奏" | 改 `separator.py` 的 `merge_stems()`：不要 `bass+other`，分别保存 bass.wav 和 other.wav；前端 `useAudioStore.ts` 加 `StemType`；`STEM_COLORS` 加颜色；`SeparationPanel.vue` 加按钮；`HomePage.vue` 加 TrackCard |
| "加一个上传进度条" | `UploadZone.vue` 中用 `XMLHttpRequest` 代替 fetch，监听 `progress` 事件 |
| "支持导出 FLAC 格式" | `separator.py` 加 `convert_to_flac()` → `main.py` 的 download 端点判断 format=flac → 前端 ExportPanel 加 FLAC 按钮 |
| "改界面颜色" | `style.css` 改 body background → `STEM_COLORS` 改音轨色 → `.range-slider` 改品牌粉 |
| "加用户登录" | ✅ 已实现。参见 `useAuthStore.ts` + `backend/auth.py` + `backend/user_routes.py` |
| "加新收藏类型（如专辑收藏）" | 参考 `favorite_songs` 模式：backend 建 FavoriteAlbum 表 + user_routes 加 API + 前端 useAuthStore 加 toggle/get 方法 |
| "改 JWT 过期时间" | `backend/auth.py` 改 `ACCESS_TOKEN_EXPIRE_HOURS` |
| "改密码强度要求" | `backend/user_routes.py` 的注册校验中改 `len(req.password) < 6` |
| "显示歌词" | 已有 `useMusicApi.ts` 的 `parseLyricText()` 和 `fetchLyric()`，只需在底部播放器组件中渲染 |
