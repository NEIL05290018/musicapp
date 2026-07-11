## 1. 产品概述

AudioSift 是一款 AI 驱动的音频智能分离平台。用户上传任意音乐文件后，可选择指定的时间段和需要分离的音轨类型，通过部署在服务器上的 **Meta Demucs 深度学习模型（mdx_extra_q）** 将音频智能分离为 **人声**、**配乐**、**音效** 三条独立音轨，支持 WAV/MP3 格式下载导出。同时内建 **音乐发现** 功能，接入 Meting API（网易云音乐），提供歌单浏览、热门歌曲排行和模拟播放体验。**v2.1 新增** 用户登录/注册系统（JWT 认证），数据持久化到 **MySQL 8.0**，支持收藏歌曲和歌单。

- **目标用户**：音乐制作人、视频创作者、播客制作者、Remix 爱好者、音乐发烧友
- **核心价值**：无需安装任何软件，打开浏览器即可完成专业级 AI 音频分离；登录后可收藏心仪歌曲和歌单，打造个人音乐空间

## 2. 核心功能

### 2.1 功能模块总览

#### 音频分离工作流（Workbench 页面 — `/`）

1. **音频上传模块**（`UploadZone.vue`）：拖拽/点击上传，支持 MP3、WAV、FLAC、OGG、M4A、AAC 格式，最大 100MB。上传后用 FileReader + AudioContext 解码为 AudioBuffer，存入全局 AudioStore，展示文件信息（文件名、大小、声道数、采样率）
2. **波形可视化模块**（`WaveformViewer.vue`）：上传后自动渲染高精度 Canvas 音频波形图。从 AudioBuffer 的第一个通道提取峰值（`extractPeaks`），按像素宽度聚合。支持鼠标滚轮缩放（1x ~ 50x），拖拽选取时间区间（蓝色半透明区域 + 竖线手柄标记），已选区列表含时间码 + 删除按钮
3. **AI 分离控制面板**（`SeparationPanel.vue`）：三个音轨类型按钮组（人声/蓝色 #4f8fff、配乐/紫色 #b464ff、音效/橙色 #ff8c3c），选中态有颜色填充和辉光。一键启动分离，实时进度条 + 百分比。每 2 秒轮询后端状态。分离过程中可停止
4. **音轨预览模块**（`TrackCard.vue`）：分离完成后以三张独立卡片展示，每张含彩色标识条、音轨名（人声/配乐/音效）、时长、播放/暂停按钮、音量滑块（0-1）、下载按钮
5. **导出下载模块**（`ExportPanel.vue`）：格式切换（WAV 无损 / MP3 320kbps），打包下载全部音轨（逐个触发 download），或单轨独立下载

#### 音乐发现（Discover 页面 — `/discover`）

1. **Banner 横幅区**：3 个渐变色推广卡片（粉红/蓝色/紫色），带 Sparkles 装饰图标，hover 时微缩放效果
2. **Trending Now 热歌区**：横向可滚动卡片列表，scroll-snap 吸附，scrollbar-hide 隐藏滚动条。卡片内专辑封面 hover 放大 + 播放图标叠加层
3. **New Releases 新歌区**：纵向列表布局，按发行时间降序排列。每行含序号、小封面、歌名/艺人/专辑、时长
4. **Featured Playlists 精选歌单区**：6 列响应式 Grid，封面 hover 蒙层 + ListMusic 图标淡入。点击跳转歌单详情
5. **Browse All 全部浏览区**：搜索框 + 流派下拉筛选 + 可滚动歌曲列表（max-h-400px），空状态提示 "No matching songs found"
6. **底部播放器**：fixed bottom，ml-[240px] 避让侧边栏，bg-black/70 backdrop-blur-2xl。使用 Teleport to body + Transition player-slide 实现滑入滑出动画
7. **音乐 API（useMusicApi.ts）**：通过 Meting API（api.injahow.cn）搜索网易云音乐歌曲，支持获取封面/音频/歌词 URL，含歌词解析函数 `parseLyricText`

#### 歌单详情（Playlist 页面 — `/discover/playlist/:id`）

1. **头部信息区**：返回 Discover 按钮 + 200×200 封面 + 歌单名（4xl 粗体）+ 描述 + 歌曲数 + 流派标签
2. **歌曲列表**：与 Discover 相同的行式布局，点击触发模拟播放
3. **底部播放器**：与 Discover 共用相同 UI 和动画

#### 品牌展示（About 页面 — `/about`）

1. **多层 Canvas 背景**：底层专辑封面大图（4s 轮换）+ 中层 60 个漂浮粒子 + 顶层鼠标手电筒擦除效果（destination-out 合成）
2. **内容层**：大标题 + 技术标签毛玻璃药丸 + 鼠标视差效果
3. **功能卡片 ×3**：Vocal Extraction / Instrumental Split / Drum Separation，各自以不同速度做滚动视差位移

#### 用户系统（Auth 页面 — `/auth` + MySQL 数据库）

1. **登录/注册页面（AuthPage.vue）**：单页切换登录/注册模式。注册需用户名(2-50字符) + 邮箱 + 密码(≥6位) + 确认密码。登录需邮箱 + 密码。底部提供 4 个测试账号快捷登录按钮。登录/注册成功后自动跳转 `/discover`
2. **侧边栏用户区（AppSidebar.vue）**：未登录时显示「登录/注册」按钮（渐变色）；已登录时显示用户名、邮箱、收藏统计（"X 首收藏 · Y 个歌单"）、退出按钮。`onMounted` 自动从 localStorage 恢复登录态
3. **歌曲/歌单收藏系统（DiscoverPage.vue）**：登录后在发现页面顶部展示「我的音乐中心」区块（用户收藏的歌曲和歌单卡片）。每首歌/歌单都有心形（Heart）收藏按钮，点击 toggle 收藏/取消，未登录点击则跳转 `/auth`。收藏状态实时同步（心形填充/空心切换）
4. **JWT 认证**：后端 `auth.py` 使用 `python-jose` 签发 HS256 JWT Token（24小时过期），`bcrypt` 哈希密码。前端 `useAuthStore.ts` 管理 token（localStorage 持久化），`apiFetch` 自动附带 `Authorization: Bearer` 请求头
5. **MySQL 数据库**：3 张表 — `users`（用户）、`favorite_songs`（歌曲收藏）、`favorite_playlists`（歌单收藏），通过 SQLAlchemy ORM 管理，应用启动时自动建表。测试数据由 `backend/seed_data.py` 脚本初始化（5 个测试账号 + 各自收藏数据）

### 2.2 页面详情

| 页面名称 | 模块名称 | 功能描述 |
|---------|---------|---------|
| 主工作台 | 上传区域 (UploadZone) | 大面积拖拽上传区。支持蓝色辉光拖拽高亮。解码中显示旋转 spinner。已上传后显示文件信息 + 更换按钮。错误时红色提示 |
| 主工作台 | 波形展示区 (WaveformViewer) | 全宽 Canvas 波形图，蓝色柱状条（alpha 随峰值 0.15-0.7 变化）。中央水平基线。缩放 ≥1x 显示时间刻度。已选区间蓝色矩形 + 拖拽手柄。拖拽中粉色虚线 |
| 主工作台 | 分离控制面板 (SeparationPanel) | 三轨开关按钮（彩色填充 + 辉光）。渐变开始按钮。处理中文案动态切换。方形停止按钮。粉色→蓝色渐变进度条。错误信息提示 |
| 主工作台 | 音轨预览面板 (TrackCard) | 三列网格卡片。彩色圆点 + 标签 + 时长。装饰条纹背景。播放/暂停（粉色暂停态）。音量 range 滑块。下载按钮 |
| 主工作台 | 导出面板 (ExportPanel) | WAV/MP3 格式切换按钮组。渐变「打包下载全部」按钮。各音轨独立下载按钮 |
| 音乐发现 | Banner 横幅区 | 3 列渐变卡片，Sparkles 图标 hover 透明度变化 |
| 音乐发现 | 热歌区 | 横向 scroll-snap 列表。卡片 group hover：封面放大 + 播放按钮淡入 |
| 音乐发现 | 新歌区 | 纵向列表，序号 + 封面 + 信息 + 时长。行 hover 背景亮 |
| 音乐发现 | 精选歌单区 | 6 列 Grid（sm:3 md:4 lg:6）。封面 hover 蒙层 + 图标。点击跳转 |
| 音乐发现 | 全部浏览区 | 搜索 input + 流派 select。max-h-400px 滚动列表。流派标签 pill。空状态提示 |
| 音乐发现 | 底部播放器 | fixed bottom，ml-[240px]。player-slide Transition 动画 |
| 歌单详情 | 头部区 | 返回按钮 + 大封面 + 歌单信息 |
| 歌单详情 | 歌曲列表 | 同 Discover 行式布局 + 底部播放器 |
| 品牌展示 | 多层 Canvas | z-0 背景图(4s轮换+视差2%)，z-10 粒子(60个)，z-20 鼠标擦除(8拖尾点)，z-30 内容 |
| 品牌展示 | 功能卡片 | Vocal(0.08x)/Instrumental(0.05x)/Drum(0.1x) 独立滚动视差 |

## 3. 核心流程

### 3.1 音频分离全流程

```
用户拖拽/点击上传音频文件
  ↓
前端 FileReader + AudioContext 解码 → AudioBuffer 存入 AudioStore
  ↓
Canvas 渲染波形图 (extractPeaks → 蓝色柱状波形)
  ↓
用户拖拽选取时间段 / 滚轮缩放 / 选择音轨类型
  ↓
点击「开始 AI 分离」
  ↓
POST /api/separate (FormData: file + start_time + end_time + stems)
  ↓
后端: 接收 → 存为 UUID 文件 → 启动后台线程 → 返回 task_id
  ↓
前端每 2 秒轮询 GET /api/status/{task_id}
  ↓  (progress 0→10→20→30→80→100)
  ├─ ffmpeg 切片 (5-10%)
  ├─ 加载 Demucs 模型 (10-20%)  ← 首次加载耗时最长
  ├─ soundfile 读取 → torch tensor (20-30%)
  ├─ AI 推理 apply_model (30-80%) ← 最耗时步骤
  └─ 4轨→3轨映射 + 保存 WAV (80-100%)
  ↓
分离完成 → TrackCard ×3 展示结果 → 试听/下载
```

### 3.2 4 轨 → 3 轨映射逻辑

Demucs 模型输出 4 条原始音轨，在 `separator.py` 的 `merge_stems()` 中映射为 3 条：

| Demucs 原始输出 | 映射结果 | 文件名 | 说明 |
|----------------|---------|--------|------|
| `vocals` | → 人声轨 | `vocals.wav` | 直接保留 |
| `bass` + `other` | → 配乐轨 | `music.wav` | 张量相加（`bass + other`） |
| `drums` | → 音效轨 | `sfx.wav` | 直接保留 |

> **修改指引**：如需调整映射（如把 bass 归到音效），修改 `backend/separator.py` 的 `merge_stems()` 函数。

### 3.3 音乐发现流程

```
用户点击侧边栏 Discover → 进入 /discover
  ↓
浏览 Banner / 热歌 / 新歌 / 歌单 / 搜索
  ↓
歌单 API: useMusicApi.ts → Meting API (api.injahow.cn)
  ↓
点击歌单 → /discover/playlist/:id（动态路由）
  ↓
点击歌曲 → 底部播放器模拟播放
```

### 3.4 用户认证流程

```
访问 /auth → 登录/注册表单
  ↓
POST /api/user/login 或 /api/user/register
  ↓
后端验证 → bcrypt 密码比对 → 签发 JWT (HS256, 24h)
  ↓
前端接收 {token, user} → localStorage 存 token → useAuthStore 更新状态
  ↓
router.push('/discover') → AppSidebar 显示用户信息 + 收藏统计
  ↓
DiscoverPage 每个歌曲/歌单显示心形按钮 → 点击 toggle 收藏
  ↓
POST /api/user/favorite/song 或 /api/user/favorite/playlist
  ↓
后端 toggle 模式（已收藏则删除，未收藏则新增） → 返回 {favorited: true/false}
  ↓
前端 useAuthStore 同步更新收藏列表 → UI 实时切换心形状态
```

## 4. 用户界面设计

### 4.1 设计风格

- **整体调性**：暗色音乐工作室风格，专业音频工作台 + 沉浸式音乐发现
- **背景色**：#08080c（body）
- **品牌色**：
  - 蓝色 `#4f8fff`（人声 / 主强调色 / Upload 图标）
  - 紫色 `#b464ff`（配乐）
  - 橙色 `#ff8c3c`（音效）
  - 粉色 `#e04090`（品牌标识 / Logo 渐变 / 进度条 / 滑块 / 播放按钮）
- **字体栈**：`-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Roboto, sans-serif`
- **布局**：左侧 240px 固定侧边栏 + 主内容区 `ml-[240px]`，工作台最大宽度 1000px
- **毛玻璃**：`.glass-card` — `backdrop-filter: blur(24px)` + 1px 半透明边框 + 16px 圆角
- **动效**：shimmer 扫描光效（2s）、fade-in-up 淡入上浮（0.6s）、player-slide 滑入滑出（0.3s）、卡片 hover 微缩放
- **全局背景**：AlbumWall 9×7 专辑封面无限对角线滚动 + backdrop-blur-[6px] 遮罩

### 4.2 导航结构

```
AppSidebar (固定左侧，240px，z-40，backdrop-blur-xl)
├── Logo（红色音乐图标 + "AudioSift"）
├── Workbench（Sparkles 图标，激活态：白色文字 + 粉色图标）
├── Discover（Compass 图标）
├── About（UserRound 图标）
└── 底部用户区
    ├── 未登录 → 「登录 / 注册」渐变色按钮（跳转 /auth）
    └── 已登录 → 用户名 + 邮箱 + "X首收藏 · Y个歌单" + 退出按钮
```

### 4.3 z-index 层级

```
z-0   → AlbumWall 专辑网格背景
z-[1] → AlbumWall 毛玻璃遮罩
z-10  → 主内容区（router-view）
z-40  → AppSidebar 侧边栏
z-50  → 底部播放器（Teleport to body）
```

### 4.4 响应式设计

- 桌面端优先（1280px+）
- 平板端（768-1280px）：精选歌单 Grid 减少列数（sm:3 → md:4 → lg:6）
- 移动端（<768px）：侧边栏和波形交互需适配（当前以 PC 端优先）

## 5. 模拟数据

### 5.1 歌曲库（src/data/songs.ts）

30 首模拟歌曲，9 位虚拟艺人，8 种流派：

| 艺人 | 流派 | 代表专辑 |
|------|------|----------|
| Lynx | Electronic | Nightfall / Backlight |
| Quantum Cat | Electronic / Classical | Galactic Walk |
| Chen Nian | Pop | Four Seasons |
| Nightfall | Rock | Ruins |
| Ono | Pop | Orange Summer |
| BeatFusion | Hip-Hop | City Beats |
| Soda Green | Folk | City Memories |
| Jasmine | R&B | Midnight Paris |
| Amber Quartet | Jazz | Midnight Jazz |

数据接口：`Song { id, title, artist, album, duration(秒), coverIndex, genre, year }`

### 5.2 歌单库（src/data/playlists.ts）

12 个精选歌单，数据接口：`Playlist { id, name, description, coverIndex, songIds[], tag }`

工具函数：`getPlaylistSongs(playlist)` / `getNewSongs(limit=8)` / `getTopSongs(limit=10)`

### 5.3 专辑封面

30 张本地封面图 `/public/albums/album-1.jpg` ~ `album-30.jpg`，通过 `(coverIndex - 1) % 30 + 1` 循环映射

## 6. 非功能需求

- **性能**：音频 ≤ 100MB（前端验证）。Demucs `mdx_extra_q` 模型约 160MB 预训练权重。GPU 推理约 10x 实时，CPU 约 0.5x 实时
- **服务端处理**：AI 分离在服务端执行，使用 threading 线程避免阻塞 FastAPI 事件循环
- **兼容性**：Chrome 95+、Edge 95+、Firefox 100+（需 Web Audio API + Canvas 2D）
- **部署方式**：GitHub Actions 自托管 Runner → systemd 管理后端 → Nginx 反向代理
- **国际化**：界面语言简体中文
- **隐私**：上传文件用 UUID 命名存储，不上传任何音频到第三方

## 7. 项目文件速查

| 类别 | 文件 | 用途 |
|------|------|------|
| **入口** | `src/main.ts` | Vue 应用入口，挂载路由 |
| **根布局** | `src/App.vue` | AlbumWall + AppSidebar + router-view |
| **路由** | `src/router/index.ts` | 4 条路由（/, /discover, /discover/playlist/:id, /about） |
| **状态管理** | `src/composables/useAudioStore.ts` | 全局 reactive 状态树，工厂函数模式 |
| **工具函数** | `src/composables/useAudioUtils.ts` | 解码、波形、上传、轮询、下载 URL |
| **音乐 API** | `src/composables/useMusicApi.ts` | Meting API 封装、歌词解析 |
| **页面** | `src/pages/HomePage.vue` | 工作台主页面 |
| **页面** | `src/pages/DiscoverPage.vue` | 音乐发现页面 |
| **页面** | `src/pages/PlaylistPage.vue` | 歌单详情页面 |
| **页面** | `src/pages/AboutPage.vue` | 品牌展示页面 |
| **页面** | `src/pages/AuthPage.vue` | 登录/注册页面 |
| **状态管理** | `src/composables/useAuthStore.ts` | 认证状态管理：token、用户、收藏，localStorage 持久化 |
| **组件** | `src/components/*.vue` | UploadZone/WaveformViewer/SeparationPanel/TrackCard/ExportPanel/AppSidebar/AlbumWall 等 |
| **数据** | `src/data/songs.ts` | 30 首模拟歌曲 |
| **数据** | `src/data/playlists.ts` | 12 个精选歌单 |
| **样式** | `src/style.css` | Tailwind 指令 + 全局样式 + 自定义 CSS 类 + 动画 |
| **后端入口** | `backend/main.py` | FastAPI 主入口（v2.1.0），注册 user_router + 启动建表 |
| **分离器** | `backend/separator.py` | Demucs 模型加载/切片/映射/转码 |
| **认证模块** | `backend/auth.py` | JWT 签发/验证 + bcrypt 密码哈希 |
| **用户路由** | `backend/user_routes.py` | 7 个用户/收藏 API 端点 |
| **数据库模型** | `backend/database.py` | SQLAlchemy ORM：users / favorite_songs / favorite_playlists 三表 |
| **数据种子** | `backend/seed_data.py` | 初始化 5 个测试账号和收藏数据 |
| **配置** | `vite.config.ts` | Vite 构建配置，含 /api 代理到 127.0.0.1:8000 |
| **配置** | `tailwind.config.js` | Tailwind 主题 + 内容扫描 |
