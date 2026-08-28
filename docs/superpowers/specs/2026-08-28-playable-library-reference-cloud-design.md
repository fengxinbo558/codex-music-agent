# Codex Music Agent：真实试听、参考模仿与云端素材库设计

日期：2026-08-28  
状态：已确认，等待规格复核后进入实施

## 1. 背景与问题

当前产品已经可以调用 ACE-Step 生成真实音乐，但音频资产链路仍是原型状态：

- 素材导入只保存显示信息，没有保存可播放的文件。
- 素材详情中的播放图标没有真实播放行为。
- 时间线片段只能用于选择 Agent 操作范围，不能试听片段。
- 生成结果只存在于当前页面内存，没有自动进入素材库。
- 刷新或关闭页面后，Blob URL 失效，用户可能无法继续试听旧版本。
- 产品没有把参考音频传给 ACE-Step，因此“模仿”只是文案，不是模型能力。
- 素材库没有账号归属和跨设备同步。

本设计把上述问题拆成三个可独立验证的子项目，按顺序交付：

1. 真实可播放的本机素材库。
2. 参考风格与翻唱改编两种真实模仿。
3. 中国大陆优先的账号与云端同步。

每个阶段必须留下可运行、可验证的产品，不允许用不可播放的示例数据或空按钮代替功能。

## 2. 目标

- 导入的音频、模型生成结果和作品版本都成为同一种可管理的音频资产。
- 用户可以在素材库、创作台和时间线明确地播放、暂停和试听片段。
- 页面刷新、应用重启后，本机素材仍然存在并可以播放。
- 用户可以选择“参考风格”或“翻唱/改编”，并把真实音频发送给 ACE-Step。
- 用户登录后，素材、作品和版本可以在多设备之间同步。
- 离线时优先使用本机缓存；联网后自动恢复上传和同步。
- 云服务通过适配层接入，避免业务逻辑绑定单一供应商。

## 3. 非目标

本轮不包含：

- 面向公众的音乐发布、社交关注、评论或排行榜。
- 商业版权授权、版税结算或内容指纹系统。
- 多人实时协作编辑。
- 完整 DAW 波形剪辑、音高修正或 Stem 分离。
- 无限容量承诺或无边界的云端免费存储。

产品会记录参考来源和用户权利确认，但不会声称替用户完成版权判断。

## 4. 云方案选择

### 4.1 选择

中国大陆首发采用腾讯 CloudBase 作为默认托管方案：

- CloudBase Auth：用户注册、登录、会话和找回流程。
- CloudBase Database：资产、项目、版本和同步状态元数据。
- CloudBase Storage：用户私有音频对象。
- CloudBase Functions：签名、权限校验、删除和必要的服务端操作。

官方资料显示 CloudBase 支持用户名密码、短信验证码、邮箱和微信等登录方式。本产品首个可交付版本先实现邮箱注册/登录、密码登录、退出和找回密码；手机号与微信登录使用同一账号接口，后续开启，不阻塞音频闭环。

### 4.2 为什么不直接绑定 CloudBase

前端和业务状态只依赖以下接口：

- `AuthRepository`
- `AudioAssetRepository`
- `ProjectRepository`
- `ObjectStorage`
- `SyncQueue`

CloudBase 实现放在 `cloudbase` 适配目录。未来迁移到阿里 OSS、自建 S3 兼容存储或其他数据库时，不修改播放器、素材库、Agent 和音乐 Provider。

### 4.3 成本原则

- 上传前计算文件大小，并向用户显示本次上传量。
- 播放优先使用本机缓存，减少云端下行流量。
- 新设备只同步元数据和缩略波形，播放时再取音频。
- 生成结果默认保留 WAV 本机文件；云端可使用无损 WAV，也可在后续增加试听用压缩副本，本轮不静默转码。
- 设置用户级容量统计和明确的“本机 / 上传中 / 已同步 / 失败”状态。

参考资料：

- CloudBase 身份认证：https://cloud.tencent.com/document/product/876/121347
- CloudBase 计量说明：https://cloud.tencent.com/document/product/876/120342
- 阿里 OSS 流量费用：https://help.aliyun.com/zh/oss/traffic-fees
- Supabase Auth：https://supabase.com/docs/guides/auth
- Supabase Storage Pricing：https://supabase.com/docs/guides/storage/pricing

## 5. 领域模型

### 5.1 AudioAsset

```ts
type AudioAsset = {
  id: string;
  ownerId: string;
  name: string;
  kind: "reference" | "vocal" | "loop" | "recording" | "generated";
  mimeType: string;
  size: number;
  duration: number;
  bpm?: number;
  musicKey?: string;
  localBlobKey?: string;
  cloudObjectKey?: string;
  previewUrl?: string;
  waveform: number[];
  syncState: "local" | "queued" | "uploading" | "synced" | "failed";
  syncProgress?: number;
  origin: {
    type: "import" | "generation" | "recording";
    projectId?: string;
    versionId?: string;
  };
  referenceConsent?: {
    confirmedAt: string;
    note: string;
  };
  createdAt: string;
  updatedAt: string;
};
```

`ProjectVersion` 不再把临时 Blob URL 当作长期资产，而是保存 `audioAssetId`。播放器通过资产仓库解析本机 Blob URL或云端临时播放 URL。

### 5.2 ReferenceMode

```ts
type ReferenceMode =
  | { type: "none" }
  | {
      type: "style";
      assetId: string;
      strength: number;
    }
  | {
      type: "cover";
      assetId: string;
      strength: number;
    };
```

- `style` 默认强度 `0.2`，只引导风格、节奏、配器与声音质感。
- `cover` 默认强度 `0.7`，保留参考歌曲的旋律和结构倾向，同时允许改变歌词、声线和编曲。
- UI 使用“轻微 / 明显 / 接近参考”三档生活化标签，Provider 再转换成模型数值。

## 6. 子项目一：真实可播放的素材库

### 6.1 导入

用户选择音频后立即：

1. 校验 MIME、扩展名、文件大小和可解码性。
2. 使用 Web Audio 读取真实时长并生成轻量波形数据。
3. 把 Blob 保存到 IndexedDB，本机持久化完成后才显示“已导入”。
4. 创建 `AudioAsset` 元数据。
5. 用户已登录且联网时，把上传加入 `SyncQueue`。

不再创建只有文件名的伪素材。无法解码的文件显示原因并且不进入可播放列表。

### 6.2 统一播放引擎

应用只保留一个 `AudioPlaybackController`：

- 当前资产 ID、当前 URL、播放位置、时长和播放状态由它管理。
- 切换资产时停止上一条并释放临时 URL。
- 素材列表提供独立播放/暂停键；点击行仍只负责选择素材。
- 详情区使用真实 `<audio>` 状态，不再使用装饰性播放图标。
- 创作台顶部播放器、素材库和时间线共享同一个状态，不会同时播放多条声音。

### 6.3 时间线片段试听

每个片段增加明确的“试听”动作：

1. 获取当前版本的 `audioAssetId`。
2. 将片段在工程时间线上的开始/结束位置映射到真实音频秒数。
3. 从片段开始处播放。
4. 到片段结束处自动暂停。

单击片段继续用于选择 Agent 操作范围；试听按钮和键盘快捷键负责播放，避免一个点击同时承担两个含义。

### 6.4 生成结果入库

ACE-Step 返回结果后：

1. 下载音频 Blob。
2. 立即保存到 IndexedDB。
3. 为每个 A/B 结果创建独立 `AudioAsset`。
4. `ProjectVersion.audioAssetId` 指向对应资产。
5. 自动出现在素材库的“生成结果”筛选中。
6. 已登录时进入云端同步队列。

页面刷新后，版本通过资产 ID 恢复播放，不依赖旧 Blob URL。

## 7. 子项目二：真实参考模仿

### 7.1 参考风格

用途：借鉴氛围、节奏、配器和声音质感，不保留原旋律。

请求方式：

- 使用 `text2music`。
- 通过 multipart 的 `ref_audio` 上传选中的真实音频。
- 设置 `reference_audio_path` 由 ACE-Step 服务端临时文件处理。
- 使用较低的 `audio_cover_strength`，默认 `0.2`。

### 7.2 翻唱/改编

用途：保留参考旋律与结构倾向，改变歌词、声线或编曲。

请求方式：

- 使用 `task_type=cover`。
- 通过 multipart 的 `ctx_audio` / `src_audio` 上传源音频。
- 默认 `audio_cover_strength=0.7`。
- 用户的文字要求、歌词和演唱方式作为目标条件一并发送。

### 7.3 创作台体验

- Agent 输入区上方显示“当前参考”卡片，包含播放、模式、强度和移除动作。
- 素材详情提供两个明确入口：“参考这种风格”和“用它做翻唱/改编”。
- 选择后自动返回创作台，并在提示词附近显示参考已生效。
- 生成任务、版本和最终资产记录参考资产 ID、模式和强度。
- 提交翻唱/改编前显示一次权利确认；确认时间写入资产来源记录。

如果参考资产只有云端副本，生成前先取得可读取的 Blob；下载失败时不提交假任务。

## 8. 子项目三：账号与云端同步

### 8.1 账号

首个版本提供：

- 邮箱注册和邮箱验证。
- 密码登录。
- 找回密码。
- 退出登录。
- 会话刷新和多设备登录。
- 未登录状态下继续使用本机素材库，登录后可选择合并本机素材。

手机号和微信登录通过相同 `AuthRepository` 扩展，但不阻塞第一版交付。

### 8.2 私有数据边界

所有云端记录包含 `ownerId`。数据库权限和对象存储规则保证：

- 用户只能列出、读取、更新和删除自己的资产、项目与版本。
- 客户端不持有云服务管理员密钥。
- 播放使用短期临时 URL，素材桶不设为公开读取。
- 删除资产时先检查是否仍被项目版本引用。
- 账号删除属于破坏性操作，必须二次确认并异步清理对象。

### 8.3 同步队列

同步采用本机优先、可恢复队列：

- IndexedDB 保存待上传任务和重试次数。
- 上传状态实时显示，失败不会丢失本机文件。
- 网络恢复、重新登录或应用启动时继续处理队列。
- 同一资产使用稳定 ID 和内容哈希避免重复上传。
- 多设备冲突采用版本元数据追加而不是覆盖；资产名称冲突保留两份并标明设备。

### 8.4 新设备恢复

登录后按以下顺序恢复：

1. 用户和容量信息。
2. 项目、版本和资产元数据。
3. 波形缩略数据。
4. 用户点击播放时按需下载音频并写入本机缓存。

这样不会在登录瞬间下载全部 WAV。

## 9. 状态与错误恢复

### 9.1 素材状态

- `正在保存到本机`
- `可本机试听`
- `等待上传`
- `上传中 0–100%`
- `已同步`
- `同步失败 · 重试`

### 9.2 播放失败

- 本机 Blob 缺失且云端存在：重新下载。
- 临时 URL 过期：刷新 URL 后重试一次。
- 浏览器阻止自动播放：保持选中状态，提示用户点击播放。
- 音频解码失败：显示具体格式和文件名，不显示假波形。

### 9.3 生成失败

- 参考音频上传失败：不创建 ACE-Step 任务。
- ACE-Step 不支持格式：先在客户端明确报错，本轮不静默转码。
- cover 请求失败：保留参考选择、提示词和设置，支持原样重试。
- 生成成功但云同步失败：本机结果仍可播放，后台继续上传。

## 10. 组件与模块边界

- `AudioPlaybackController`：唯一的播放状态和片段结束控制。
- `LocalAudioStore`：IndexedDB Blob、波形和队列数据。
- `AudioAssetRepository`：资产元数据读写，不关心界面。
- `SyncQueue`：上传、下载、重试、冲突与进度。
- `CloudBaseAuthRepository`：账号和会话。
- `CloudBaseObjectStorage`：私有音频对象和临时 URL。
- `LibraryView`：真实素材列表、播放和参考选择。
- `Timeline`：选择片段与请求片段试听，不直接操作 `<audio>`。
- `MusicProvider`：接收可选参考 Blob 与模式，构造 ACE-Step multipart 请求。
- `App`：连接项目版本、当前参考和资产 ID，不持有长期 Blob URL。

## 11. 数据流

```text
导入音频
  ↓
解码时长 / 生成波形 / IndexedDB 保存
  ↓
AudioAsset（本机可播放）
  ↓                     ↘
选择参考风格或翻唱         登录后进入 SyncQueue
  ↓                         ↓
ACE-Step multipart         CloudBase 私有存储
  ↓                         ↓
A/B 真实 WAV ←── 创建资产与版本 ──→ 多设备元数据同步
  ↓
素材库 / 创作台 / 时间线共享播放引擎
```

## 12. 验收标准

### 12.1 本机素材库

- 导入 WAV、MP3 或 M4A 后可以立即播放。
- 刷新页面和重启应用后仍可播放。
- 素材列表和详情的播放状态一致。
- 点击时间线试听动作只播放目标片段。
- 生成 A/B 后素材库新增两个可播放资产。
- 版本切换使用资产 ID 恢复对应音频。

### 12.2 参考模仿

- 参考风格请求实际包含 `ref_audio` 和正确强度。
- 翻唱/改编请求实际使用 `task_type=cover` 和 `src_audio`。
- 不选参考时继续走原来的 text-to-music 链路。
- 参考文件不存在或不可解码时禁止提交。
- 至少实机生成一次风格参考结果和一次 cover 结果并可播放。

### 12.3 账号与同步

- 两个账号互相不可见对方资产。
- 未登录用户可以完整使用本机素材库。
- 登录后可以合并并上传本机素材。
- 新设备登录后看到相同项目和素材列表，并能按需播放。
- 断网导入和生成不会丢失；恢复网络后继续同步。
- 临时播放 URL 过期可以自动恢复。

### 12.4 工程质量

- 领域模型、IndexedDB、播放控制、Provider multipart 和同步队列有自动测试。
- TypeScript、生产构建和 Electron 入口检查通过。
- 不再存在没有行为的播放按钮或会消失的伪素材。
- 移动端仍能在时间线之前完成导入、参考选择、生成和试听。

## 13. 实施顺序与边界

本设计分三份实施计划执行，每份独立验收：

1. `playable-local-library`：资产模型、IndexedDB、统一播放、片段试听、生成入库。
2. `real-reference-generation`：两种参考模式、ACE-Step multipart、权利确认和真实生成验证。
3. `cloud-account-sync`：CloudBase 账号、私有存储、数据库、队列和多设备恢复。

第三阶段开始前需要用户提供或授权创建 CloudBase 环境。这是唯一不能通过本地代码推断的关键外部条件；在获得环境 ID 前，不会用假云端状态代替。
