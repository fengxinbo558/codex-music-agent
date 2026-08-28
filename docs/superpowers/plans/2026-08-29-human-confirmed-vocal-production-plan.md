# 音乐创作台：人机确认、真实分轨与逐句演唱实施计划

设计依据：`docs/superpowers/specs/2026-08-29-human-confirmed-vocal-production-design.md`  
目标：把当前“一次提交自动跑完 + 混合 WAV 结构示意”改造成可确认、可分轨、可逐句重唱、可精确改音高的本地音乐产品。

## 实施总则

- 每个阶段先写状态与服务测试，再接 UI；不先画可点击假控件。
- 每个真实处理阶段都有 `idle / preparing / running / ready / failed` 状态和可恢复输入。
- 现有用户音频、版本和本地数据库必须迁移兼容，不能通过清空数据解决升级问题。
- `demo-output/` 和现有未跟踪截图不在本计划范围内，不修改或提交。
- 每个阶段单独验收并提交；前一阶段失败时不把后一阶段能力暴露给用户。

## 阶段 0：建立基线与拆分巨型状态

### 目标

在改变行为前固定现有可用链路，并把 `App.tsx` 中的创作会话、播放、资产和生成任务状态拆成可测试边界。

### 文件

- 修改 `music-studio/src/App.tsx`
- 新增 `music-studio/src/hooks/useCreationSession.ts`
- 新增 `music-studio/src/hooks/useAudioPlayback.ts`
- 新增 `music-studio/src/hooks/useProjectVersions.ts`
- 新增对应 `*.test.ts`

### 任务

1. 记录现有测试数量、生产构建结果、ACE-Step 健康状态和一条真实音频资产可读取性。
2. 将纯状态转换和副作用分离；`App` 只负责组合视图和跨域事件。
3. 保留旧本地存储键兼容读取，但新业务逻辑不直接散落调用 `localStorage`。
4. 为旧版本、旧歌词、旧音频资产恢复补回归测试。

### 验收

- 行为和当前版本一致。
- 现有测试全部通过，生产构建通过。
- 刷新后旧歌曲仍可播放。

## 阶段 1：先修产品真实性、品牌、删除和滚动

### 目标

优先解决用户当前能直接看见的问题，不等待新模型能力。

### 文件

- 修改 `music-studio/index.html`
- 修改 `music-studio/src/components/Sidebar.tsx`
- 修改 `music-studio/src/components/Modal.tsx`
- 修改 `music-studio/src/components/ProductDialogs.tsx`
- 修改 `music-studio/src/components/AgentPanel.tsx`
- 修改 `music-studio/src/components/Timeline.tsx`
- 修改 `music-studio/src/components/BottomWorkspace.tsx`
- 修改 `music-studio/src/views/ProjectsView.tsx`
- 修改 `music-studio/src/views/ModelsView.tsx`
- 修改 `music-studio/src/data/productData.ts`
- 修改 `music-studio/src/styles.css`
- 修改 `music-studio/src/product.css`
- 修改 `music-studio/src/services/localAudioStore.ts`
- 新增 `music-studio/src/services/versionDeletion.ts`
- 新增 `music-studio/src/services/versionDeletion.test.ts`

### 任务

1. 产品名统一为“音乐创作台”，把 `C/` 换成内联原创音符波形 SVG，移除所有用户可见 Codex 文案。
2. 先把当前模拟四轨时间线替换为单一真实混合波形；删除 `createGeneratedTracks` 在真实 Provider 结果中的调用。
3. 建立唯一纵向滚动拥有者；右侧输入和动作区改为固定底部，流程记录在自身区域滚动。
4. 760px 以下使用“创作流程 / 编辑工作台”页签，不再把右栏和三段编辑器顺序堆成超长页面。
5. 版本卡、播放器详情和素材库增加真实删除入口。
6. 删除服务先解析版本引用，只删除该版本独占的源 WAV、优化 WAV、Stem、歌词对齐和派生产物；共享资产保留。
7. 删除当前播放版本时先停止播放，再选择最近可用版本；存储失败时界面不提前移除。

### 测试

- 品牌字符串扫描不包含用户可见 Codex。
- 单一混合 WAV 不产生人声、鼓、贝斯等模拟轨道。
- 删除一个子版本不会删除父版本仍引用的资产。
- 删除失败保留版本和播放状态。
- Playwright/浏览器实测 760、1024、1280 和全屏下主动作、删除、返回均可达。

### 验收提交

`feat: make studio layout and audio controls truthful`

## 阶段 2：建立可持久化的人机确认状态机

### 目标

提交创意只生成方向候选，不允许越过确认门调用音乐模型。

### 文件

- 修改 `music-studio/src/types.ts`
- 替换 `music-studio/src/services/musicWorkflow.ts`
- 修改 `music-studio/src/services/musicWorkflow.test.ts`
- 新增 `music-studio/src/services/creationSession.ts`
- 新增 `music-studio/src/services/creationSession.test.ts`
- 新增 `music-studio/src/services/creationSessionStore.ts`
- 新增 `music-studio/src/services/creationSessionStore.test.ts`
- 新增 `music-studio/src/components/CreationStagePanel.tsx`
- 新增 `music-studio/src/components/ProductionHistory.tsx`
- 修改 `music-studio/src/components/AgentPanel.tsx`

### 数据

- `CreationSession`
- `CreationStage`
- `StageStatus`
- `ApprovedAssetSnapshot`
- `RevisionFeedback`

### 任务

1. 固定阶段：`idea → direction → lyrics-vocal → sample → full-song → editing → delivered`。
2. 只允许显式事件推进：`SUBMIT_IDEA`、`APPROVE_DIRECTION`、`APPROVE_LYRICS`、`APPROVE_SAMPLE`、`REQUEST_REVISION`、`TASK_SUCCEEDED`、`TASK_FAILED`。
3. 状态机拒绝非法跃迁；例如 `lyrics-vocal` 未批准时不能提交 `text2music`。
4. 每次批准保存不可变快照和版本号；修改创建新分支。
5. IndexedDB 保存会话和已批准资产，页面刷新后恢复到等待确认位置。
6. 右侧只显示当前阶段，历史步骤折叠显示真实产出摘要。

### 测试

- 覆盖所有合法与非法跃迁。
- 刷新恢复 `AWAITING_CONFIRMATION`。
- 修改当前阶段不会清除上一阶段已批准资产。
- 未批准方向和歌词时，Provider 调用次数为零。

### 验收提交

`feat: add persistent human approval workflow`

## 阶段 3：创作方向三方案与歌词演唱确认

### 目标

让音乐总监给出可选推荐，让歌词和唱法成为用户真正确认的资产。

### 文件

- 修改 `music-studio/src/services/agentClient.ts`
- 修改 `music-studio/src/services/fallbackPlanner.ts`
- 新增 `music-studio/src/services/directionRecommendations.ts`
- 新增 `music-studio/src/services/directionRecommendations.test.ts`
- 新增 `music-studio/src/services/lyricDraft.ts`
- 新增 `music-studio/src/services/lyricDraft.test.ts`
- 新增 `music-studio/src/services/vocalCueRecommendations.ts`
- 新增 `music-studio/src/services/vocalCueRecommendations.test.ts`
- 新增 `music-studio/src/components/DirectionConfirmation.tsx`
- 新增 `music-studio/src/components/LyricsVocalConfirmation.tsx`
- 新增 `music-studio/src/components/VocalCueEditor.tsx`

### 任务

1. 规划协议返回严格结构化的三套候选：推荐、稳妥、大胆。
2. 每套包含曲风、情绪、BPM、调性、人声、质感、配器、结构、时长和推荐理由。
3. 本机规划器在智能规划失败时仍返回三套不同且合法的候选，不复制同一套只换标题。
4. 歌词阶段保留用户原文来源，补写内容单独标记；逐行检测字数、节拍拥挤和咬字风险。
5. 建立 `VocalCue`：字符范围、技巧、强度、半音、时值、咬字、来源和推荐理由。
6. 默认每句只显示最多三个推荐标签；“更多唱法”展开完整分类和冲突规则。
7. 用户框选字词、点击整句和手动修改标签都写入同一 `VocalCue` 数据。

### 测试

- 三套候选字段完整、身份不同、BPM/时长范围合法。
- 用户原文不被静默改写。
- 怒音与贴耳气声等冲突组合被阻止。
- 字符范围在歌词修改后正确迁移或明确失效。
- 键盘可完成候选选择、歌词编辑和确认。

### 验收提交

`feat: add direction and vocal confirmation stages`

## 阶段 4：真实核心小样确认与整首门控

### 目标

默认先生成副歌核心小样，用户批准后才生成整首。

### 文件

- 修改 `music-studio/src/providers/aceStepMusicProvider.ts`
- 修改 `music-studio/src/providers/aceStepMusicProvider.test.ts`
- 新增 `music-studio/src/services/sampleGeneration.ts`
- 新增 `music-studio/src/services/sampleGeneration.test.ts`
- 新增 `music-studio/src/components/SampleReview.tsx`
- 修改 `music-studio/src/components/GenerationResultActions.tsx`
- 修改 `music-studio/src/App.tsx`

### 任务

1. 从已批准结构中选择副歌或情绪峰值，建立 20–30 秒样本 Brief。
2. 小样版本和整首版本分开保存，记录共同的方向、歌词与 `VocalCue` 快照。
3. 小样返回后提供：生成整首、人声更清楚、情绪调整、修改歌词、换唱法、返回方向。
4. `APPROVE_SAMPLE` 是整首任务的唯一默认入口。
5. “直接整首”要求一次显式确认并记录 `sampleBypassed=true`。
6. 失败重试复用已批准输入，不重新运行前置 Agent。

### 测试

- 默认请求时长不超过 30 秒。
- 未批准小样时整首调用次数为零。
- 小样反馈只重跑小样，不破坏方向和歌词快照。
- 整首版本保存 `sampleVersionId` 和批准记录。

### 实机验收

- 用固定中文歌词生成真实小样。
- 确认后生成一首完整 WAV，并验证刷新后可播放。

### 验收提交

`feat: gate full generation behind sample approval`

## 阶段 5：建立独立本地音频服务

### 目标

为真实分轨、中文对齐、基频检测、半音处理和重新混合建立隔离的本地服务，不污染 ACE-Step 第三方源码。

### 文件

- 新增 `music-studio/local-audio-service/pyproject.toml`
- 新增 `music-studio/local-audio-service/audio_service/__init__.py`
- 新增 `music-studio/local-audio-service/audio_service/app.py`
- 新增 `music-studio/local-audio-service/audio_service/jobs.py`
- 新增 `music-studio/local-audio-service/audio_service/assets.py`
- 新增 `music-studio/local-audio-service/audio_service/stems.py`
- 新增 `music-studio/local-audio-service/audio_service/alignment.py`
- 新增 `music-studio/local-audio-service/audio_service/pitch.py`
- 新增 `music-studio/local-audio-service/audio_service/mixing.py`
- 新增 `music-studio/local-audio-service/tests/`
- 新增 `music-studio/electron/local-audio-runtime.mjs`
- 修改 `music-studio/electron/main.mjs`
- 修改 `music-studio/scripts/dev-desktop.mjs`
- 新增 `music-studio/src/services/localAudioClient.ts`
- 新增 `music-studio/src/services/localAudioClient.test.ts`

### 依赖与端口

- Python 服务固定监听 `127.0.0.1:8002`。
- 分轨：Demucs `htdemucs`。
- 对齐：FunASR `paraformer-zh` 时间戳模型 + 已知歌词编辑距离。
- 基频：TorchCrepe。
- 半音处理：TorchAudio。
- 读写与混合：SoundFile、NumPy、SciPy。
- ACE-Step 2B Base 作为单独模型槽和分轨备用，不替换 Turbo 主生成槽。

### 任务

1. 建立 `/health`、任务提交、任务轮询、音频读取和清理接口。
2. 音频输入通过 multipart 上传，服务只接受音频 MIME、限制大小和时长。
3. 临时文件存入服务自己的任务目录；响应只返回不透明 ID 和受控音频端点，不返回绝对路径。
4. Electron 启动和关闭服务；浏览器模式检测服务离线并明确降级。
5. 首次模型下载显示真实阶段与磁盘需求；下载失败可重试。
6. 每种任务限制单机并发，防止 ACE-Step 与分轨同时抢占内存导致系统失稳。

### 测试

- 路径穿越、非音频、超长文件和任务 ID 越权被拒绝。
- 任务取消和应用退出能清理临时文件。
- 服务重启后不会把旧任务伪装为运行中。
- Electron 能检测健康、启动、退出和失败状态。

### 验收提交

`feat: add isolated local audio processing service`

## 阶段 6：真实四 Stem、存储与播放

### 目标

整首歌曲保存后后台生成真实 `vocals / drums / bass / other`，通过同一播放头同步播放和混音。

### 文件

- 修改 `music-studio/src/types.ts`
- 修改 `music-studio/src/services/localAudioStore.ts`
- 修改 `music-studio/src/services/localAudioStore.test.ts`
- 新增 `music-studio/src/services/stemPipeline.ts`
- 新增 `music-studio/src/services/stemPipeline.test.ts`
- 新增 `music-studio/src/services/stemPlayback.ts`
- 新增 `music-studio/src/services/stemPlayback.test.ts`
- 修改 `music-studio/src/components/Timeline.tsx`
- 修改 `music-studio/src/components/StudioToolbar.tsx`
- 修改 `music-studio/src/components/BottomWorkspace.tsx`
- 修改 `music-studio/src/views/ModelsView.tsx`

### 任务

1. `MusicAsset.audioRole` 扩展为混合、模型原声、优化版和四类 Stem。
2. IndexedDB 升级版本并迁移旧资产，不删除已有 Blob。
3. 整首保存后后台提交分轨；混合歌曲立即播放，不等待 Stem。
4. 校验每条 Stem 的解码、时长、采样率、有效能量和重构误差。
5. 只有四条真实 Blob 保存成功且通过质量门时，时间线切换为四轨。
6. 使用 Web Audio `AudioContext` 同时调度四个 BufferSource，支持播放、暂停、跳转、静音、独奏、音量和声像。
7. Stem 播放失败时自动回到完整混音，不中断用户听歌。

### 测试

- 旧数据库升级后资产数量和 Blob 内容不变。
- 模拟四个短 WAV 验证同步开始、暂停和跳转误差。
- 静音、独奏、音量和声像改变真实 Gain/Panner 状态。
- 缺任意 Stem 时不显示完整多轨编辑器。

### 实机验收

- 对真实 30 秒中文歌曲分轨并逐轨试听。
- 四轨合成与原混音做响度和差异检查，记录基准时间与内存。

### 验收提交

`feat: add real stem timeline and playback`

## 阶段 7：中文逐词对齐与逐句演唱操作

### 目标

让歌词、真实波形和选区同步，用户可以选择一句或几个字发起演唱修改。

### 文件

- 修改 `music-studio/src/types.ts`
- 替换 `music-studio/src/services/lyricTiming.ts`
- 修改 `music-studio/src/services/lyricTiming.test.ts`
- 新增 `music-studio/src/services/lyricAlignment.ts`
- 新增 `music-studio/src/services/lyricAlignment.test.ts`
- 修改 `music-studio/src/components/KaraokeLyrics.tsx`
- 修改 `music-studio/src/components/VocalCueEditor.tsx`
- 新增 `music-studio/src/components/LyricWaveSelection.tsx`
- 修改 `music-studio/src/components/Timeline.tsx`

### 任务

1. 对人声 Stem 运行词级时间戳，并与已批准歌词对齐。
2. 保存字符开始/结束、时间开始/结束、置信度和来源。
3. 高置信度显示逐词点击；低置信度降级为逐句，并提示手动调整边界。
4. 选中歌词同步更新时间线选区；拖动波形边界更新 `VocalCue` 时间范围。
5. 播放时逐句和逐词高亮；点击歌词跳转到真实时间。
6. 歌词修改后只使受影响的对齐失效，重新运行对应段落。

### 测试

- 中文标点、重复句、空行、段落标签和不同字词结果可对齐。
- 低置信度不会显示伪精确逐字时间。
- 手动边界优先于自动结果并可持久化。
- 播放头和歌词选择保持双向一致。

### 验收提交

`feat: add word-aligned vocal cue editing`

## 阶段 8：局部重唱与双候选 A/B

### 目标

怒音、哭腔、气声、颤音等表演改变使用真实 ACE-Step `repaint`，不使用滤镜伪装。

### 文件

- 修改 `music-studio/src/providers/aceStepMusicProvider.ts`
- 修改 `music-studio/src/providers/aceStepMusicProvider.test.ts`
- 新增 `music-studio/src/services/vocalRepaint.ts`
- 新增 `music-studio/src/services/vocalRepaint.test.ts`
- 新增 `music-studio/src/components/VocalRepaintReview.tsx`
- 修改 `music-studio/src/components/ToneVersionControls.tsx`
- 修改 `music-studio/src/App.tsx`

### 任务

1. Provider 增加 `repaint` 方法，强制携带源 WAV、开始/结束秒、当前歌词、唱法、强度和上下文。
2. 自动在选区前后增加安全缓冲，但 UI 仍标明用户目标范围。
3. 一次生成两个候选；未采用前只作为临时候选，不进入正式版本树。
4. 用户 A/B 试听后采用一个，保存新混合和父版本关系。
5. 仅对受影响范围重新对齐；分轨可先沿用完整新混合后台重跑，完成前使用混合播放。
6. 重绘接缝或歌词校验失败时不自动采用。

### 测试

- 请求正确映射 `task_type=repaint`、源音频和时间范围。
- 候选取消会释放临时 Blob。
- 采用候选创建新版本且不覆盖父版本。
- 失败后原版本仍可播放。

### 实机验收

- 对一句中文歌词生成“明显怒音”两个候选并 A/B 试听。
- 检查歌词顺序、接缝和前后伴奏连续性。

### 验收提交

`feat: add real vocal repaint candidates`

## 阶段 9：精确半音编辑与重新混合

### 目标

对真实人声选区执行确定性的升降半音，并验证结果。

### 文件

- 新增 `music-studio/src/services/pitchEditing.ts`
- 新增 `music-studio/src/services/pitchEditing.test.ts`
- 新增 `music-studio/src/components/PitchEditControls.tsx`
- 新增 `music-studio/src/components/PitchEditReview.tsx`
- 修改 `music-studio/src/components/VocalCueEditor.tsx`
- 修改 `music-studio/src/components/Timeline.tsx`
- 修改 `music-studio/src/types.ts`
- 修改 `music-studio/src/App.tsx`

### 任务

1. 只有真实人声 Stem 和有效时间范围存在时才开放精确音高。
2. 快捷值提供 ±1、±2、±3；高级值限制在 ±12。
3. 提交前分析原始基频和可编辑性；无声、强噪声或无稳定基频时阻止确定性处理并推荐重唱。
4. 服务端对选区执行等长半音移动，前后交叉淡化，与其余 Stem 重新混合。
5. 处理后重新检测中位基频；目标比率误差超限时标记未通过，不自动采用。
6. 大于 ±3 时显示音色风险；用户试听原版和修改版后再采用。
7. 采用后保存操作参数、原人声、新人声、新混合、验证结果和父版本 ID。

### 测试

- 半音与频率比转换准确。
- `+2` 半音目标比率为 `2^(2/12)`，允许误差由固定阈值控制。
- 处理后时长与原选区一致，交叉淡化不越界。
- 无 Stem、低置信度对齐和无基频时按钮不可用且原因明确。
- 撤销只切换版本，不做破坏性逆处理。

### 实机验收

- 对真实人声一句执行 `+2` 和 `-2` 半音，验证时长、基频和 A/B 播放。
- 验证大幅移动的风险提示和“改用重新演唱”。

### 验收提交

`feat: add verified semitone vocal editing`

## 阶段 10：端到端恢复、响应式与最终验收

### 目标

把所有阶段收成一个稳定 Demo，而不是若干互不连接的页面。

### 任务

1. 刷新恢复：等待确认、已批准方向、歌词、`VocalCue`、小样、整首、Stem、对齐、编辑操作和版本树。
2. 任务恢复：应用重开后查询正在运行的 ACE-Step 和本地音频任务；失联任务标记失败并允许重试。
3. 键盘与辅助功能：焦点顺序、阶段状态播报、歌词选区、播放、删除确认和错误提示。
4. 响应式：760、1024、1280 和全屏；确保唯一滚动、固定主动作不遮挡内容。
5. 性能：大 Blob 不进入 React 状态和 `localStorage`，Object URL 在切换、删除和退出时释放。
6. 最终截图覆盖创意、方向确认、歌词唱法、小样、单波形、真实四轨、局部重唱、精确音高和删除。

### 自动验证

在 `music-studio` 目录运行：

```bash
pnpm test
pnpm build
```

检查 Electron 入口：

```bash
node --check electron/main.mjs
node --check electron/ace-step-runtime.mjs
node --check electron/local-audio-runtime.mjs
node --check scripts/dev-desktop.mjs
```

检查 Python 服务：

```bash
uv run --project local-audio-service pytest
```

### 最终实机路径

1. 输入一句中文创意。
2. 从三套方向中选择推荐方案。
3. 修改一句歌词，为词语添加怒音和尾音下坠。
4. 生成并确认 20–30 秒小样。
5. 生成整首并立即播放混合 WAV。
6. 等待真实四 Stem，分别静音、独奏和调节音量。
7. 点击歌词执行一次怒音局部重唱并采用候选。
8. 对另一句执行 `+2` 半音并通过基频验证。
9. 刷新页面，确认全部版本、音频和进度恢复。
10. 删除最新版本，确认父版本和共享资产仍可播放。

### 最终完成门

- 所有自动测试和构建通过。
- 上述实机路径完整通过。
- 用户可见区域无 Codex 品牌、假音轨、假保存或不可达动作。
- 分轨、对齐、局部重唱或音高任一能力失败时，产品能诚实降级并保留已有歌曲。
- 最终 Demo 在 `http://127.0.0.1:5175/` 可打开并完成核心路径。

## 风险与控制

- **模型首次下载较大**：在模型中心显示真实大小、阶段和重试，不阻塞已有歌曲播放。
- **Apple Silicon 分轨耗时**：限制单任务并发，先交付混合 WAV，记录 30 秒和整首基准。
- **中文逐词对齐偏差**：置信度门和手动波形边界是必备能力，不宣传百分百逐字准确。
- **局部重绘改变伴奏**：扩大上下文、双候选和采用前 A/B；失败不覆盖原版。
- **大幅音高改变音色**：±3 以内为默认，超出显示风险并推荐重新演唱。
- **第三方依赖与未来商业化**：本阶段记录每个代码包和模型权重许可证；商业化前做独立许可证与训练数据审查。
