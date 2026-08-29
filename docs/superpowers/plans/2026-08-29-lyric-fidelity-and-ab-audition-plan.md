# 歌词质量闭环与 A/B 试听实施计划

## 目标

把当前“提交歌词后直接生成、按时长平均估算字幕、单版本假 A/B”的链路，替换为可验证的专业闭环：

```text
素材 → 内容骨架 → 专业歌词评分 → 可唱编译
→ ACE-Step 双候选 → 真实人声分轨 → 中文转写
→ 唱词忠实/咬字/时间轴质量门 → A/B 试听 → 用户采用
```

旧生成音频在新链路通过自动测试后统一清空，再用用户原始体育口播素材重建演示项目。

## 阶段 1：歌词专业度与可唱编译

### 文件

- 新增 `music-studio/src/services/lyricProfessionalism.ts`
- 新增 `music-studio/src/services/lyricProfessionalism.test.ts`
- 新增 `music-studio/src/services/lyricCompiler.ts`
- 新增 `music-studio/src/services/lyricCompiler.test.ts`
- 新增 `music-studio/src/components/LyricProfessionalReview.tsx`
- 修改 `music-studio/src/types.ts`
- 修改 `music-studio/src/components/LyricsVocalConfirmation.tsx`
- 修改 `music-studio/src/App.tsx`

### 行为

1. 从素材和歌词建立核心命题、说话人、对象、事实锚点、段落职责和中心意象。
2. 评分卡覆盖核心命题、人物关系、事实覆盖、段落推进、意象一致、副歌因果、可演唱性和陈词滥调风险。
3. 提供五条专业写作路线与三级抽象控制。
4. 当前歌词模式只拆句和加结构标签，不改正文字符和顺序。
5. 根据中文字符数和 BPM 给出建议时长，支持 90、120、180、240 秒。
6. 评分未过线时不允许确认歌词并启动模型。

## 阶段 2：本地中文转写与逐句对齐

### 文件

- 修改 `music-studio/local-audio-service/pyproject.toml`
- 修改 `music-studio/local-audio-service/uv.lock`
- 新增 `music-studio/local-audio-service/audio_service/alignment.py`
- 新增 `music-studio/local-audio-service/tests/test_alignment.py`
- 修改 `music-studio/local-audio-service/audio_service/app.py`
- 修改 `music-studio/src/services/localAudioClient.ts`
- 修改 `music-studio/src/services/localAudioClient.test.ts`
- 新增 `music-studio/src/services/lyricAlignment.ts`
- 新增 `music-studio/src/services/lyricAlignment.test.ts`

### 行为

1. `POST /local-audio/align-lyrics` 接收真实人声和批准歌词。
2. MLX Whisper large-v3-turbo 返回无提示中文转写与词级时间戳。
3. 单调动态规划对齐批准字符与真实转写，保留错字、漏唱和新增内容。
4. 输出逐句时间、逐句匹配率、总体字符匹配、重点词匹配、识别置信度和演唱覆盖率。
5. 低置信度不伪造精确逐词时间。

## 阶段 3：三道质量门与真实时间轴

### 文件

- 修改 `music-studio/src/types.ts`
- 修改 `music-studio/src/services/musicWorkflow.ts`
- 修改 `music-studio/src/services/musicWorkflow.test.ts`
- 修改 `music-studio/src/components/KaraokeLyrics.tsx`
- 新增 `music-studio/src/components/LyricQualityReport.tsx`
- 修改 `music-studio/src/components/DeliveryReview.tsx`
- 修改 `music-studio/src/App.tsx`

### 行为

1. 人声歌曲先保存为 `processing`，不能马上标记交付。
2. 分轨完成后对 vocals 运行真实对齐。
3. 逻辑、唱词忠实度或咬字未通过时，版本可试听但不可交付。
4. 卡拉 OK 使用 `aligned` 逐句时间；估时仅用于旧版或处理中状态，并明确提示。
5. 逐句音高只对高置信度真实范围开放。

## 阶段 4：真正的双候选与 A/B 播放

### 文件

- 修改 `music-studio/src/providers/aceStepMusicProvider.ts`
- 修改 `music-studio/src/providers/aceStepMusicProvider.test.ts`
- 修改 `music-studio/src/components/ProductDialogs.tsx`
- 修改 `music-studio/src/product.css`
- 修改 `music-studio/src/App.tsx`

### 行为

1. 核心小样生成一个候选；完整歌曲默认生成两个候选。
2. A、B 各有独立真实播放器、进度、暂停与从头播放。
3. 试听不改变正式版本；“采用 A/B”才改变当前采用状态。
4. 质量失败的版本显示原因并支持试听，但不能进入交付确认。
5. 一版失败时不伪装为完整 A/B。

## 阶段 5：作品级清理

### 文件

- 修改 `music-studio/src/services/localAudioStore.ts`
- 修改 `music-studio/src/services/localAudioStore.test.ts`
- 修改 `music-studio/src/services/creationSessionStore.ts`
- 新增 `music-studio/src/services/projectCleanup.ts`
- 新增 `music-studio/src/services/projectCleanup.test.ts`
- 修改 `music-studio/local-audio-service/audio_service/assets.py`
- 修改 `music-studio/local-audio-service/audio_service/app.py`
- 修改 `music-studio/src/components/DeleteConfirmDialog.tsx`
- 修改 `music-studio/src/App.tsx`

### 行为

1. 清理所有生成/编辑版本、混音、原声、Stem、对齐和任务。
2. 保留创意、专业歌词骨架、批准歌词和生成偏好。
3. 前端、IndexedDB 和本地音频服务一致删除；失败时不只隐藏 UI。
4. 新增可复用的“清空本作品生成结果”确认动作。

## 阶段 6：验证与重建 Demo

### 自动验证

- 前端所有 Vitest。
- 本地音频服务所有 Pytest。
- TypeScript 正式构建。
- Electron 脚本语法检查。
- Git 差异检查。

### 实机验证

1. 当前坏歌执行无提示转写，验证质量门能判为未通过。
2. 执行旧版本清理，确认版本、音频、Stem 和旧任务均不可恢复。
3. 使用用户原始体育口播建立“观点叙事摇滚 + 对话念唱”内容骨架。
4. 生成两个完整候选并运行分轨、转写和对齐。
5. 人工试听歌词逻辑、咬字、逐句同步和 A/B 播放。
6. 只有合格候选可以采用和确认交付。
7. 刷新后复测恢复状态。

## 提交顺序

1. `feat: add professional lyric planning and compilation`
2. `feat: add real lyric transcription and alignment`
3. `feat: gate delivery on lyric quality`
4. `feat: add audition-first AB comparison`
5. `feat: add project generation cleanup`
6. `fix: rebuild demo with verified lyrics`
