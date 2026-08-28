import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AgentPanel } from "./components/AgentPanel";
import { BottomWorkspace } from "./components/BottomWorkspace";
import { DeleteConfirmDialog } from "./components/DeleteConfirmDialog";
import { KaraokeLyrics } from "./components/KaraokeLyrics";
import {
  CompareDialog,
  ExportDialog,
  InstallPlanDialog,
  NewProjectDialog,
  NotificationsDialog,
} from "./components/ProductDialogs";
import { Sidebar } from "./components/Sidebar";
import { StudioToolbar } from "./components/StudioToolbar";
import { Timeline } from "./components/Timeline";
import { Transport } from "./components/Transport";
import {
  initialLyrics,
  initialTracks,
  initialVersions,
} from "./data/demoProject";
import {
  initialAssets,
  initialTasks,
  recentProjects,
} from "./data/productData";
import {
  DEFAULT_GENERATION_PREFERENCES,
  normalizeGenerationPreferences,
  summarizePreferences,
} from "./data/generationPreferences";
import { TONE_PROFILES } from "./data/toneProfiles";
import {
  automaticMusicProvider,
  getAceStepStatus,
} from "./providers/aceStepMusicProvider";
import { planMusic } from "./services/agentClient";
import { analyzeAudioBlob } from "./services/audioAnalysis";
import { masterAudioBlob } from "./services/audioMastering";
import {
  createAudioAsset,
  visibleAudioAssets,
  versionsForStorage,
  versionsFromStorage,
} from "./services/audioAssets";
import { localAudioStore } from "./services/localAudioStore";
import { createEstimatedLyricCues } from "./services/lyricTiming";
import {
  activateWorkflowStep,
  completeWorkflow,
  completeWorkflowStep,
  createIdleWorkflow,
  evaluateDeliveryGate,
  failActiveWorkflow,
  startWorkflow,
} from "./services/musicWorkflow";
import { planVersionDeletion } from "./services/versionDeletion";
import type {
  AgentPlanResponse,
  AgentState,
  AppView,
  AudioVariant,
  DialogKind,
  GenerationMode,
  GenerationPreferences,
  GenerationReferenceInput,
  GenerationReferenceSettings,
  GenerationTask,
  MusicAsset,
  MusicEngineStatus,
  MusicTrack,
  MusicWorkflow,
  ProjectVersion,
  SpeechRecognitionLike,
} from "./types";
import { LibraryView } from "./views/LibraryView";
import { ModelsView } from "./views/ModelsView";
import { ProjectsView } from "./views/ProjectsView";

export default function App() {
  const [view, setView] = useState<AppView>(
    () => readStored("codex-music-view", "projects") as AppView,
  );
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [pendingDeletion, setPendingDeletion] = useState<
    | { kind: "version"; id: string; name: string; detail: string }
    | { kind: "asset"; id: string; name: string; detail: string }
    | null
  >(null);
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("等待你的想法");
  const [workflow, setWorkflow] = useState<MusicWorkflow>(createIdleWorkflow);
  const [prompt, setPrompt] = useState("");
  const [plan, setPlan] = useState<AgentPlanResponse | null>(null);
  const [tracks, setTracks] = useState<MusicTrack[]>(initialTracks);
  const [selectedClips, setSelectedClips] = useState<string[]>([]);
  const [operationScope, setOperationScope] = useState<string[]>([]);
  const [generationMode, setGenerationMode] = useState<GenerationMode>("full");
  const [generationPreferences, setGenerationPreferences] =
    useState<GenerationPreferences>(() =>
      normalizeGenerationPreferences(
        readStoredJson(
          "codex-music-generation-preferences",
          DEFAULT_GENERATION_PREFERENCES,
        ),
      ),
    );
  const [referenceSettings, setReferenceSettings] =
    useState<GenerationReferenceSettings>(() =>
      readStoredJson("codex-music-reference-settings", {
        mode: "none",
        assetId: "",
        strength: 0.2,
      }),
    );
  const [timelineZoom, setTimelineZoom] = useState(100);
  const [versions, setVersions] =
    useState<ProjectVersion[]>(readStoredVersions);
  const [lastGeneratedVersionIds, setLastGeneratedVersionIds] = useState<
    string[]
  >([]);
  const [selectedVersion, setSelectedVersion] = useState(() =>
    readStored("codex-music-version", "v3"),
  );
  const [lyrics, setLyrics] = useState<string[]>(() =>
    readStoredJson("codex-music-lyrics", initialLyrics),
  );
  const [bpm, setBpm] = useState(() =>
    Number(readStored("codex-music-bpm", "92")),
  );
  const [musicKey, setMusicKey] = useState(() =>
    readStored("codex-music-key", "C major"),
  );
  const [projectTitle, setProjectTitle] = useState(() =>
    readStored("codex-music-title", "雨停以前"),
  );
  const [assets, setAssets] = useState<MusicAsset[]>(initialAssets);
  const [assetsReady, setAssetsReady] = useState(false);
  const [tasks, setTasks] = useState<GenerationTask[]>(initialTasks);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [musicEngineStatus, setMusicEngineStatus] =
    useState<MusicEngineStatus>("checking");
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingAssetId, setPlayingAssetId] = useState<string | null>(null);
  const [audioVariant, setAudioVariant] = useState<AudioVariant>("optimized");
  const [remasteringVersionId, setRemasteringVersionId] = useState<
    string | null
  >(null);
  const [, setAuditioningClipId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [toast, setToast] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const activeObjectUrlRef = useRef<string | null>(null);
  const segmentEndRef = useRef<number | null>(null);

  const voiceAvailable = Boolean(
    window.SpeechRecognition || window.webkitSpeechRecognition,
  );
  const selectedNames = useMemo(
    () =>
      tracks.flatMap((track) =>
        track.clips
          .filter((clip) => selectedClips.includes(clip.id))
          .map((clip) => clip.name),
      ),
    [selectedClips, tracks],
  );
  const agentSelectionNames =
    selectedNames.length > 0 ? selectedNames : operationScope;
  const visibleAssets = useMemo(() => visibleAudioAssets(assets), [assets]);
  const currentVersion = useMemo(
    () => versions.find((version) => version.id === selectedVersion),
    [selectedVersion, versions],
  );
  const currentTimelineAsset = useMemo(() => {
    const assetId =
      audioVariant === "source"
        ? currentVersion?.mastering?.sourceAssetId
        : currentVersion?.audioAssetId;
    return assets.find((asset) => asset.id === assetId);
  }, [assets, audioVariant, currentVersion]);
  const currentLyricCues = useMemo(
    () =>
      currentVersion?.lyricCues?.length
        ? currentVersion.lyricCues
        : createEstimatedLyricCues(lyrics, audioDuration),
    [audioDuration, currentVersion?.lyricCues, lyrics],
  );

  const announce = useCallback((message: string) => {
    setAnnouncement(message);
    setToast(message);
  }, []);

  const releaseActiveObjectUrl = useCallback(() => {
    if (!activeObjectUrlRef.current) return;
    URL.revokeObjectURL(activeObjectUrlRef.current);
    activeObjectUrlRef.current = null;
  }, []);

  const loadAudioAsset = useCallback(
    async (
      asset: MusicAsset,
      options: {
        autoplay?: boolean;
        start?: number;
        end?: number;
        clipId?: string;
      } = {},
    ) => {
      const blob = await localAudioStore.getBlob(asset);
      if (!blob) {
        throw new Error(`《${asset.name}》的本机音频已丢失，请重新导入。`);
      }

      const audio = audioRef.current;
      audio?.pause();
      releaseActiveObjectUrl();
      const nextUrl = URL.createObjectURL(blob);
      activeObjectUrlRef.current = nextUrl;
      segmentEndRef.current = options.end ?? null;
      setAudioUrl(nextUrl);
      setAudioDuration(asset.durationSeconds);
      setPlayingAssetId(asset.id);
      setAuditioningClipId(options.clipId ?? null);
      setCurrentTime(options.start ?? 0);
      setIsPlaying(false);

      if (!audio) return;
      audio.src = nextUrl;
      audio.load();
      await waitForAudioMetadata(audio);
      if (activeObjectUrlRef.current !== nextUrl) return;
      const start = Math.min(
        Math.max(0, options.start ?? 0),
        Number.isFinite(audio.duration)
          ? audio.duration
          : asset.durationSeconds,
      );
      audio.currentTime = start;
      setCurrentTime(start);
      if (options.autoplay) await audio.play();
    },
    [releaseActiveObjectUrl],
  );

  useEffect(() => {
    localStorage.setItem("codex-music-view", view);
  }, [view]);
  useEffect(() => {
    localStorage.setItem("codex-music-title", projectTitle);
  }, [projectTitle]);
  useEffect(() => {
    localStorage.setItem("codex-music-bpm", String(bpm));
    localStorage.setItem("codex-music-key", musicKey);
  }, [bpm, musicKey]);
  useEffect(() => {
    localStorage.setItem("codex-music-version", selectedVersion);
  }, [selectedVersion]);
  useEffect(() => {
    localStorage.setItem("codex-music-lyrics", JSON.stringify(lyrics));
  }, [lyrics]);
  useEffect(() => {
    localStorage.setItem(
      "codex-music-generation-preferences",
      JSON.stringify(generationPreferences),
    );
  }, [generationPreferences]);
  useEffect(() => {
    localStorage.setItem(
      "codex-music-reference-settings",
      JSON.stringify(referenceSettings),
    );
  }, [referenceSettings]);
  useEffect(() => {
    localStorage.setItem(
      "codex-music-versions",
      JSON.stringify(versionsForStorage(versions)),
    );
  }, [versions]);
  useEffect(() => {
    let active = true;
    void localAudioStore
      .listAssets()
      .then((storedAssets) => {
        if (active) setAssets(storedAssets);
      })
      .catch((error: unknown) => {
        if (!active) return;
        announce(
          error instanceof Error ? error.message : "本机音频库暂时无法读取。",
        );
      })
      .finally(() => {
        if (active) setAssetsReady(true);
      });
    return () => {
      active = false;
    };
  }, [announce]);
  useEffect(() => {
    if (!assetsReady || referenceSettings.mode === "none") return;
    if (visibleAssets.some((asset) => asset.id === referenceSettings.assetId))
      return;
    if (visibleAssets[0]) {
      setReferenceSettings((settings) => ({
        ...settings,
        assetId: visibleAssets[0].id,
      }));
    }
  }, [
    assetsReady,
    referenceSettings.assetId,
    referenceSettings.mode,
    visibleAssets,
  ]);
  useEffect(() => {
    if (!assetsReady || audioUrl) return;
    const version = versions.find((item) => item.id === selectedVersion);
    if (version?.bpm) setBpm(version.bpm);
    if (version?.musicKey) setMusicKey(version.musicKey);
    if (version?.lyrics) setLyrics(version.lyrics);
    if (version?.tracks) setTracks(version.tracks);
    if (version?.preferences) setGenerationPreferences(version.preferences);
    if (version?.reference) setReferenceSettings(version.reference);
    const asset = assets.find((item) => item.id === version?.audioAssetId);
    if (!asset) return;
    setAudioVariant("optimized");
    void loadAudioAsset(asset).catch((error: unknown) =>
      announce(
        error instanceof Error ? error.message : "上次的试听音频无法恢复。",
      ),
    );
  }, [
    announce,
    assets,
    assetsReady,
    audioUrl,
    loadAudioAsset,
    selectedVersion,
    versions,
  ]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    let active = true;
    const refreshMusicEngine = async () => {
      const status = await getAceStepStatus();
      if (active) setMusicEngineStatus(status);
    };
    void refreshMusicEngine();
    const timer = window.setInterval(refreshMusicEngine, 15_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    const handlePageUnload = () => releaseActiveObjectUrl();
    window.addEventListener("pagehide", handlePageUnload);
    return () => window.removeEventListener("pagehide", handlePageUnload);
  }, [releaseActiveObjectUrl]);
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isEditing = ["INPUT", "TEXTAREA", "SELECT"].includes(
        target.tagName,
      );
      if (event.code === "Space" && !isEditing && view === "studio") {
        event.preventDefault();
        void handleTogglePlay();
      }
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "e" &&
        view === "studio"
      ) {
        event.preventDefault();
        setDialog("export");
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  });

  const handleSubmit = async () => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || agentState === "thinking" || agentState === "rendering")
      return;
    const taskId = `task-${Date.now()}`;
    const preferences = { ...generationPreferences };
    const reference = { ...referenceSettings };
    const referenceAsset = visibleAssets.find(
      (asset) => asset.id === reference.assetId,
    );
    setTasks((items) => [
      {
        id: taskId,
        title: modeTaskLabel(generationMode),
        status: "active",
        time: "正在进行",
        detail: `${cleanPrompt} · ${summarizePreferences(preferences)}${
          reference.mode !== "none" && referenceAsset
            ? ` · ${referenceModeLabel(reference.mode)}：${referenceAsset.name}`
            : ""
        }`,
      },
      ...items,
    ]);
    setAgentState("thinking");
    setWorkflow(startWorkflow(taskId));
    setProgress(6);
    setProgressLabel("读取当前工程与选中片段");
    setAnnouncement("音乐制作助理正在理解你的想法");
    setOperationScope(selectedNames);
    try {
      let generationReference: GenerationReferenceInput | undefined;
      if (reference.mode !== "none") {
        if (!referenceAsset) {
          throw new Error("请先在素材库选择一个真实参考音频。");
        }
        const referenceBlob = await localAudioStore.getBlob(referenceAsset);
        if (!referenceBlob) {
          throw new Error(
            `《${referenceAsset.name}》的真实文件已丢失，请重新导入。`,
          );
        }
        generationReference = {
          mode: reference.mode,
          assetId: referenceAsset.id,
          name: referenceAsset.name,
          blob: referenceBlob,
          strength: reference.strength,
        };
      }
      const referenceDirection = generationReference
        ? generationReference.mode === "style"
          ? `[参考音频：${generationReference.name}；只借鉴风格、氛围、配器和声音质感，不复制具体旋律] `
          : `[翻唱/重编源音频：${generationReference.name}；保留节奏与旋律骨架，按文字要求重做配器与演唱] `
        : "";
      const nextPlan = await planMusic({
        projectId: "rain-before-it-stops",
        prompt: `${modePrompt(generationMode)}${referenceDirection}${cleanPrompt}`,
        vocalDelivery: preferences.vocalDelivery,
        selection: selectedNames,
        currentProject: { bpm, key: musicKey, selectedVersion },
      });
      const hasCurrentLyrics = lyrics.some((line) => line.trim());
      const shouldUseCurrentLyrics =
        preferences.lyricsMode === "current" && hasCurrentLyrics;
      const generationLyrics =
        preferences.vocalStyle === "instrumental"
          ? []
          : shouldUseCurrentLyrics
            ? lyrics
            : nextPlan.brief.lyrics;
      const displayedLyrics =
        preferences.vocalStyle === "instrumental" ? lyrics : generationLyrics;
      const renderBrief = {
        ...nextPlan.brief,
        lyrics: generationLyrics,
        vocalMode:
          preferences.vocalStyle === "instrumental"
            ? "纯音乐"
            : `${vocalModePrompt(preferences.vocalStyle)}；${nextPlan.brief.vocalMode}`,
      };
      const renderPlan = { ...nextPlan, brief: renderBrief };
      setWorkflow((current) => {
        let next = completeWorkflowStep(
          current,
          "director",
          `${renderBrief.genre} · ${renderBrief.mood} · ${renderBrief.bpm} BPM · ${renderBrief.key}`,
        );
        next = completeWorkflowStep(
          next,
          "lyrics",
          preferences.vocalStyle === "instrumental"
            ? "纯音乐版本：无需演唱歌词"
            : `${generationLyrics.filter((line) => line.trim()).length} 行歌词已交接`,
        );
        next = completeWorkflowStep(
          next,
          "arrangement",
          `${renderBrief.structure.join(" → ")} · ${renderBrief.instruments.join("、")}`,
        );
        next = completeWorkflowStep(
          next,
          "vocal",
          preferences.vocalStyle === "instrumental"
            ? "纯音乐"
            : `${renderBrief.vocalMode} · ${preferences.lyricClarity === "clear" ? "歌词清晰优先" : "自然融合"}`,
        );
        return activateWorkflowStep(next, "model", "正在提交真实生成任务");
      });
      setPlan(renderPlan);
      setBpm(nextPlan.brief.bpm);
      setMusicKey(nextPlan.brief.key);
      setProjectTitle(nextPlan.brief.title);
      setLyrics(displayedLyrics);
      setAgentState("rendering");
      setProgress(27);
      setProgressLabel("制作方案已确认，准备生成");
      const generated = await automaticMusicProvider.generate(
        renderBrief,
        preferences,
        ({ progress: value, label, stage }) => {
          setProgress(Math.max(27, value));
          setProgressLabel(label);
          if (stage) {
            setWorkflow((current) =>
              activateWorkflowStep(current, "model", label),
            );
          }
        },
        generationReference,
      );
      if (!generated.length) throw new Error("音乐模型没有返回可播放版本。");
      setWorkflow((current) =>
        activateWorkflowStep(
          completeWorkflowStep(
            current,
            "model",
            `${generated.length} 个真实 WAV 已由 ACE-Step 返回`,
          ),
          "master",
          "正在处理尖锐感并保护人声咬字",
        ),
      );
      setProgress(97);
      setProgressLabel("模型原声已生成，正在柔化尖锐高频");
      const createdAt = Date.now();
      const storedResults: Array<{
        asset: MusicAsset;
        sourceAsset: MusicAsset;
        result: (typeof generated)[number];
        versionId: string;
        masteringStatus: "complete" | "failed";
        masteringWarning?: string;
        processedAt?: string;
      }> = [];
      const savedAssets: MusicAsset[] = [];
      try {
        for (const [index, result] of generated.entries()) {
          const sourceBlob = result.blob;
          const sourceAnalysis = await analyzeAudioBlob(sourceBlob);
          const versionId = `v-${createdAt}-${index + 1}`;
          const versionNumber = String(versions.length + index + 1).padStart(
            2,
            "0",
          );
          let sourceAsset = createAudioAsset({
            id: `asset-${versionId}-source`,
            name: `${renderBrief.title}·版本 ${versionNumber}·模型原声.wav`,
            type: "generated",
            blob: sourceBlob,
            durationSeconds: sourceAnalysis.duration || result.duration,
            waveform: sourceAnalysis.waveform,
            origin: `${renderBrief.title} · 模型原声`,
            projectId: "rain-before-it-stops",
            versionId,
            bpm: renderBrief.bpm,
            musicKey: renderBrief.key,
            visibility: "internal",
            audioRole: "source",
          });
          await localAudioStore.save(sourceAsset, sourceBlob);
          savedAssets.push(sourceAsset);

          let asset = sourceAsset;
          let masteringStatus: "complete" | "failed" = "failed";
          let masteringWarning: string | undefined;
          let processedAt: string | undefined;
          try {
            setProgressLabel(
              generated.length > 1
                ? `正在柔化第 ${index + 1} 个版本的尖锐高频`
                : "正在柔化尖锐高频并保留呼吸感",
            );
            const mastered = await masterAudioBlob(
              sourceBlob,
              preferences.toneProfile,
              preferences.vocalStyle === "instrumental"
                ? "natural"
                : preferences.lyricClarity,
            );
            const masteredAnalysis = await analyzeAudioBlob(mastered.blob);
            asset = createAudioAsset({
              id: `asset-${versionId}`,
              name: `${renderBrief.title}·版本 ${versionNumber}·${
                TONE_PROFILES[preferences.toneProfile].label
              }.wav`,
              type: "generated",
              blob: mastered.blob,
              durationSeconds: masteredAnalysis.duration || result.duration,
              waveform: masteredAnalysis.waveform,
              origin: `${renderBrief.title} · ${
                TONE_PROFILES[preferences.toneProfile].label
              }`,
              projectId: "rain-before-it-stops",
              versionId,
              bpm: renderBrief.bpm,
              musicKey: renderBrief.key,
              visibility: "visible",
              audioRole: "mastered",
            });
            await localAudioStore.save(asset, mastered.blob);
            savedAssets.push(asset);
            masteringStatus = "complete";
            processedAt = new Date().toISOString();
          } catch (error) {
            sourceAsset = { ...sourceAsset, visibility: "visible" };
            await localAudioStore.putAsset(sourceAsset);
            savedAssets[savedAssets.length - 1] = sourceAsset;
            asset = sourceAsset;
            masteringWarning =
              error instanceof Error
                ? error.message
                : "音频柔化没有完成，模型原声已经保留。";
          }
          setProgressLabel("正在把真实音频存入本机素材库");
          storedResults.push({
            asset,
            sourceAsset,
            result,
            versionId,
            masteringStatus,
            masteringWarning,
            processedAt,
          });
        }
      } catch (error) {
        await Promise.all(
          savedAssets
            .filter(
              (asset, index, items) =>
                items.findIndex((item) => item.id === asset.id) === index,
            )
            .map((asset) => localAudioStore.delete(asset)),
        );
        throw error;
      } finally {
        generated.forEach((result) => URL.revokeObjectURL(result.url));
      }
      const firstStored = storedResults[0];
      const firstResult = firstStored.result;
      const masteringWarning = storedResults.find(
        (stored) => stored.masteringWarning,
      )?.masteringWarning;
      setPlan({
        ...renderPlan,
        brief: {
          ...renderBrief,
          provider: firstResult.provider,
          costLabel: firstResult.costLabel,
        },
        warning: firstResult.warning ?? masteringWarning ?? nextPlan.warning,
      });
      setMusicEngineStatus(
        firstResult.provider.startsWith("ACE-Step") ? "ready" : "offline",
      );
      setCurrentTime(0);
      setIsPlaying(false);
      setTracks(firstResult.tracks);
      setSelectedClips([]);
      setGenerationMode("full");
      setWorkflow((current) =>
        activateWorkflowStep(
          completeWorkflowStep(
            current,
            "master",
            storedResults.every(
              (stored) => stored.masteringStatus === "complete",
            )
              ? "模型原声与清晰柔和版均已保存"
              : "模型原声已保存；优化版有未完成项",
          ),
          "lyricTiming",
          "正在生成可点击的逐句歌词时间轴",
        ),
      );
      const newVersions: ProjectVersion[] = storedResults.map(
        (
          {
            asset,
            sourceAsset,
            result,
            versionId,
            masteringStatus,
            processedAt,
          },
          index,
        ) => ({
          id: versionId,
          label: `版本 ${String(versions.length + index + 1).padStart(2, "0")}`,
          createdAt: "刚刚",
          note: `Agent：${renderBrief.change[0] ?? "生成新编曲"}${
            generated.length > 1 ? ` · 方案 ${index + 1}` : ""
          } · ${
            masteringStatus === "complete"
              ? TONE_PROFILES[preferences.toneProfile].label
              : "模型原声"
          }`,
          source: "generated",
          provider: result.provider,
          bpm: renderBrief.bpm,
          musicKey: renderBrief.key,
          duration: asset.durationSeconds,
          audioAssetId: asset.id,
          prompt: cleanPrompt,
          preferences: { ...preferences },
          lyrics: [...displayedLyrics],
          lyricCues:
            preferences.vocalStyle === "instrumental"
              ? []
              : createEstimatedLyricCues(
                  displayedLyrics,
                  asset.durationSeconds,
                ),
          tracks: result.tracks,
          reference: { ...reference },
          seed: result.seed,
          mastering: {
            profile: preferences.toneProfile,
            sourceAssetId: sourceAsset.id,
            status: masteringStatus,
            processedAt,
          },
        }),
      );
      setWorkflow((current) =>
        activateWorkflowStep(
          completeWorkflowStep(
            current,
            "lyricTiming",
            preferences.vocalStyle === "instrumental"
              ? "纯音乐版本无需歌词时间轴"
              : `${newVersions[0]?.lyricCues?.length ?? 0} 句歌词已完成智能估时`,
          ),
          "quality",
          "正在核验音频、版本、保存状态与歌词",
        ),
      );
      const deliveryGates = newVersions.map((version) =>
        evaluateDeliveryGate({
          versionId: version.id,
          audioAssetId: version.audioAssetId,
          audioSaved: storedResults.some(
            (stored) => stored.asset.id === version.audioAssetId,
          ),
          duration: version.duration ?? 0,
          hasVocals: preferences.vocalStyle !== "instrumental",
          lyrics: version.lyrics ?? [],
          lyricCues: version.lyricCues ?? [],
        }),
      );
      const failedChecks = deliveryGates.flatMap((gate) =>
        gate.checks.filter((check) => !check.pass).map((check) => check.label),
      );
      if (failedChecks.length) {
        throw new Error(
          `交付检查未通过：${[...new Set(failedChecks)].join("、")}`,
        );
      }
      const storedAssets = storedResults.flatMap(({ asset, sourceAsset }) =>
        asset.id === sourceAsset.id ? [asset] : [asset, sourceAsset],
      );
      setAssets((items) => [
        ...storedAssets,
        ...items.filter(
          (item) => !storedAssets.some((asset) => asset.id === item.id),
        ),
      ]);
      setVersions((items) => [...newVersions, ...items]);
      setLastGeneratedVersionIds(newVersions.map((version) => version.id));
      setSelectedVersion(newVersions[0].id);
      setAudioVariant(
        firstStored.masteringStatus === "complete" ? "optimized" : "source",
      );
      await loadAudioAsset(firstStored.asset);
      setWorkflow((current) =>
        completeWorkflow(
          completeWorkflowStep(
            current,
            "quality",
            `已核验 ${newVersions.length} 个版本：真实音频可播放、本机保存成功、歌词可跟唱`,
          ),
        ),
      );
      setAgentState("complete");
      setProgress(100);
      setProgressLabel(
        generated.length > 1
          ? `${generated.length} 个新版本已就绪`
          : "新版本已就绪",
      );
      setTasks((items) =>
        items.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: "complete",
                time: "刚刚",
                detail: `${newVersions.map((version) => version.label).join("、")} · ${firstResult.provider}`,
              }
            : task,
        ),
      );
      announce(
        firstResult.warning
          ? "已生成链路试听；启动 ACE-Step 后会自动生成真实 AI 音乐"
          : masteringWarning
            ? "歌曲已经生成并保留原声；柔化没有完成，可以直接重试"
            : generated.length > 1
              ? `${generated.length} 个温暖细腻版本已生成，可以逐个试听比较`
              : generationReference
                ? generationReference.mode === "style"
                  ? "参考风格的真实音乐已生成并完成声音优化"
                  : "翻唱 / 重编的真实音乐已生成并完成声音优化"
                : `${TONE_PROFILES[preferences.toneProfile].label}版本已生成，可以播放和导出`,
      );
    } catch (error) {
      setAgentState("error");
      setWorkflow((current) =>
        failActiveWorkflow(
          current,
          error instanceof Error ? error.message : "生成没有完成",
        ),
      );
      setProgressLabel("生成没有完成");
      setTasks((items) =>
        items.map((task) =>
          task.id === taskId
            ? { ...task, status: "failed", time: "刚刚" }
            : task,
        ),
      );
      announce(error instanceof Error ? error.message : "生成没有完成，请重试");
    }
  };

  const selectVersion = async (versionId: string, autoplay = false) => {
    const version = versions.find((item) => item.id === versionId);
    if (!version) return;
    audioRef.current?.pause();
    setIsPlaying(false);
    setSelectedVersion(versionId);
    setAudioVariant("optimized");
    setCurrentTime(0);
    if (version.bpm) setBpm(version.bpm);
    if (version.musicKey) setMusicKey(version.musicKey);
    if (version.lyrics) setLyrics(version.lyrics);
    if (version.tracks) setTracks(version.tracks);
    if (version.preferences) setGenerationPreferences(version.preferences);
    if (version.reference) setReferenceSettings(version.reference);
    const asset = assets.find((item) => item.id === version.audioAssetId);
    if (asset) {
      try {
        await loadAudioAsset(asset, { autoplay });
        announce(
          autoplay
            ? `正在试听${version.label}`
            : `已切换到${version.label}，音频已从本机库恢复`,
        );
      } catch (error) {
        announce(
          error instanceof Error
            ? error.message
            : `无法读取${version.label}的音频`,
        );
      }
      return;
    }
    releaseActiveObjectUrl();
    setAudioUrl(null);
    setAudioDuration(version.duration ?? 0);
    setPlayingAssetId(null);
    announce(`已切换到${version.label}；这个旧版本没有保存试听音频`);
  };

  const selectAudioVariant = async (variant: AudioVariant) => {
    const version = versions.find((item) => item.id === selectedVersion);
    if (!version?.audioAssetId) {
      announce("当前版本没有可以对比的真实音频。");
      return;
    }
    const assetId =
      variant === "source"
        ? version.mastering?.sourceAssetId
        : version.audioAssetId;
    const asset = assets.find((item) => item.id === assetId);
    if (!asset) {
      announce(
        variant === "source"
          ? "这个版本的模型原声已经丢失。"
          : "优化音频已经丢失。",
      );
      return;
    }
    try {
      setAudioVariant(variant);
      await loadAudioAsset(asset, { autoplay: true });
      announce(
        variant === "source"
          ? `正在试听${version.label}的模型原声`
          : `正在试听${version.label}的${
              version.mastering?.profile === "bright" ? "优化结果" : "柔化结果"
            }`,
      );
    } catch (error) {
      announce(
        error instanceof Error ? error.message : "这份对比音频无法播放。",
      );
    }
  };

  const remasterVersion = async (versionId: string) => {
    if (remasteringVersionId) return;
    const version = versions.find((item) => item.id === versionId);
    if (!version?.audioAssetId) {
      announce("这个旧版本没有真实音频，无法进行柔化重制。");
      return;
    }
    if (version.mastering?.status === "complete") {
      announce("这个版本已经完成声音优化，可以直接对比原声和柔化结果。");
      return;
    }
    const sourceAsset = assets.find(
      (asset) => asset.id === version.audioAssetId,
    );
    if (!sourceAsset) {
      announce("这个版本的本机音频已经丢失，无法进行柔化重制。");
      return;
    }
    const taskId = `master-${Date.now()}`;
    setRemasteringVersionId(versionId);
    setProgressLabel("正在柔化尖锐高频并保留呼吸感");
    setTasks((items) => [
      {
        id: taskId,
        title: `柔化 ${version.label}`,
        status: "active",
        time: "正在进行",
        detail: "温暖细腻 · 保留原版",
      },
      ...items,
    ]);
    announce(`正在为${version.label}制作温暖细腻重制版`);

    let outputAsset: MusicAsset;
    let nextVersion: ProjectVersion;
    try {
      const sourceBlob = await localAudioStore.getBlob(sourceAsset);
      if (!sourceBlob)
        throw new Error("模型原声已经丢失，请重新生成这个版本。");
      const mastered = await masterAudioBlob(
        sourceBlob,
        "warm",
        normalizeGenerationPreferences(
          version.preferences ?? generationPreferences,
        ).lyricClarity,
      );
      const analysis = await analyzeAudioBlob(mastered.blob);
      const createdAt = Date.now();
      const nextVersionId = `v-${createdAt}-warm`;
      const nextVersionNumber = String(versions.length + 1).padStart(2, "0");
      outputAsset = createAudioAsset({
        id: `asset-${nextVersionId}`,
        name: `${projectTitle}·版本 ${nextVersionNumber}·温暖重制.wav`,
        type: "generated",
        blob: mastered.blob,
        durationSeconds: analysis.duration || version.duration || 0,
        waveform: analysis.waveform,
        origin: `${projectTitle} · ${version.label}温暖重制`,
        projectId: "rain-before-it-stops",
        versionId: nextVersionId,
        bpm: version.bpm,
        musicKey: version.musicKey,
        visibility: "visible",
        audioRole: "mastered",
      });
      await localAudioStore.save(outputAsset, mastered.blob);
      nextVersion = {
        ...version,
        id: nextVersionId,
        label: `版本 ${nextVersionNumber} · 温暖重制`,
        createdAt: "刚刚",
        note: `温暖重制 · 来自 ${version.label}`,
        duration: outputAsset.durationSeconds,
        audioAssetId: outputAsset.id,
        parentVersionId: version.id,
        preferences: {
          ...normalizeGenerationPreferences(
            version.preferences ?? generationPreferences,
          ),
          toneProfile: "warm",
        },
        mastering: {
          profile: "warm",
          sourceAssetId: sourceAsset.id,
          status: "complete",
          processedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      setTasks((items) =>
        items.map((task) =>
          task.id === taskId
            ? { ...task, status: "failed", time: "刚刚" }
            : task,
        ),
      );
      announce(
        error instanceof Error
          ? error.message
          : "柔化重制没有完成，原版本没有受到影响。",
      );
      setRemasteringVersionId(null);
      return;
    }

    setAssets((items) => [outputAsset, ...items]);
    setVersions((items) => [nextVersion, ...items]);
    setLastGeneratedVersionIds([nextVersion.id]);
    setSelectedVersion(nextVersion.id);
    setAudioVariant("optimized");
    if (nextVersion.bpm) setBpm(nextVersion.bpm);
    if (nextVersion.musicKey) setMusicKey(nextVersion.musicKey);
    if (nextVersion.lyrics) setLyrics(nextVersion.lyrics);
    if (nextVersion.tracks) setTracks(nextVersion.tracks);
    if (nextVersion.preferences)
      setGenerationPreferences(nextVersion.preferences);
    setAgentState("complete");
    setProgress(100);
    setProgressLabel("温暖重制版已就绪");
    setTasks((items) =>
      items.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: "complete",
              time: "刚刚",
              detail: `${nextVersion.label} · 原版已保留`,
            }
          : task,
      ),
    );
    setRemasteringVersionId(null);
    try {
      await loadAudioAsset(outputAsset, { autoplay: true });
      announce(`${nextVersion.label}已经完成，正在播放；原版仍然保留`);
    } catch (error) {
      announce(
        error instanceof Error
          ? error.message
          : "重制版已经保存，但暂时无法自动播放。",
      );
    }
  };

  const refineChorus = () => {
    const chorusClips = tracks
      .flatMap((track) => track.clips)
      .filter((clip) => clip.sectionId.toLowerCase().includes("chorus"));
    setSelectedClips(chorusClips.map((clip) => clip.id));
    setOperationScope(
      chorusClips.length ? chorusClips.map((clip) => clip.name) : ["副歌"],
    );
    setGenerationMode("region");
    setPrompt(
      "保留主歌和整体气质，只重新设计副歌，让旋律更有记忆点、情绪更打开",
    );
    announce("已经帮你选好副歌范围，补充要求后就能生成一个新版本");
  };

  const handleTogglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) {
      announce("先让 Agent 生成一个试听版本");
      return;
    }
    if (audio.paused) {
      try {
        segmentEndRef.current = null;
        setAuditioningClipId(null);
        if (audio.ended) audio.currentTime = 0;
        await audio.play();
      } catch {
        announce("浏览器没有允许播放，请再点击一次播放键");
      }
    } else {
      audio.pause();
    }
  };
  const handleSeek = (time: number) => {
    segmentEndRef.current = null;
    setAuditioningClipId(null);
    if (audioRef.current) audioRef.current.currentTime = time;
    setCurrentTime(time);
  };
  const handleImportFiles = async (files: File[]) => {
    if (!files.length) return;
    announce(`正在读取 ${files.length} 个音频文件`);
    const additions: MusicAsset[] = [];
    const failures: string[] = [];
    for (const file of files) {
      try {
        const analysis = await analyzeAudioBlob(file);
        const id = `import-${makeId()}`;
        const asset = createAudioAsset({
          id,
          name: file.name,
          type: "reference",
          blob: file,
          durationSeconds: analysis.duration,
          waveform: analysis.waveform,
          origin: "本机导入",
        });
        await localAudioStore.save(asset, file);
        additions.push(asset);
      } catch (error) {
        failures.push(
          `${file.name}：${error instanceof Error ? error.message : "无法读取"}`,
        );
      }
    }
    if (additions.length) setAssets((items) => [...additions, ...items]);
    if (additions.length && !failures.length) {
      announce(`已真实保存 ${additions.length} 个音频，现在可以直接试听`);
    } else if (additions.length) {
      announce(`已保存 ${additions.length} 个；${failures.length} 个未导入`);
    } else {
      announce(failures[0] ?? "没有可以保存的音频。");
    }
  };
  const toggleAssetFavorite = async (asset: MusicAsset) => {
    const updated = { ...asset, favorite: !asset.favorite };
    try {
      await localAudioStore.putAsset(updated);
      setAssets((items) =>
        items.map((item) => (item.id === updated.id ? updated : item)),
      );
      announce(updated.favorite ? "已加入收藏" : "已取消收藏");
    } catch (error) {
      announce(error instanceof Error ? error.message : "收藏状态没有保存。");
    }
  };
  const toggleAssetPlayback = async (asset: MusicAsset) => {
    const audio = audioRef.current;
    if (playingAssetId === asset.id && audioUrl && audio) {
      segmentEndRef.current = null;
      setAuditioningClipId(null);
      if (audio.paused) {
        if (audio.ended) audio.currentTime = 0;
        try {
          await audio.play();
        } catch {
          announce("浏览器没有允许播放，请再点一次。");
        }
      } else {
        audio.pause();
      }
      return;
    }
    try {
      await loadAudioAsset(asset, { autoplay: true });
      announce(`正在试听《${asset.name}》`);
    } catch (error) {
      announce(error instanceof Error ? error.message : "这个素材无法播放。");
    }
  };
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      announce("当前环境不支持语音输入，可以直接输入文字");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "zh-CN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) =>
      setPrompt(
        Array.from(event.results)
          .map((result) => result[0].transcript)
          .join(""),
      );
    recognition.onerror = () => {
      announce("没有听清，可以再试一次或直接输入文字");
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const createProject = (title: string, source: string) => {
    const firstVersion: ProjectVersion = {
      id: `draft-${Date.now()}`,
      label: "版本 01",
      createdAt: "刚刚",
      note: "新作品草稿",
      source: "demo",
      provider: "尚未生成",
      bpm: 92,
      musicKey: "C major",
    };
    setProjectTitle(title);
    setBpm(92);
    setMusicKey("C major");
    setLyrics([""]);
    setTracks([]);
    setVersions([firstVersion]);
    setLastGeneratedVersionIds([]);
    setSelectedVersion(firstVersion.id);
    setGenerationMode("full");
    setReferenceSettings((settings) => ({ ...settings, mode: "none" }));
    audioRef.current?.pause();
    releaseActiveObjectUrl();
    if (audioRef.current) {
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
    }
    setAudioUrl(null);
    setAudioDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setPlayingAssetId(null);
    setAuditioningClipId(null);
    segmentEndRef.current = null;
    setPrompt(
      source === "idea"
        ? ""
        : source === "reference"
          ? "分析参考音频，并先帮我建立歌曲结构"
          : "保留人声旋律，为它制作完整伴奏",
    );
    setPlan(null);
    setAgentState("idle");
    setWorkflow(createIdleWorkflow());
    setSelectedClips([]);
    setOperationScope([]);
    setDialog(null);
    setView("studio");
    announce(`已创建《${title}》，现在可以告诉 Agent 你的想法`);
  };
  const exportAudio = () => {
    if (!audioUrl) return;
    const version = versions.find((item) => item.id === selectedVersion);
    const soundLabel =
      audioVariant === "source"
        ? "模型原声"
        : version?.mastering?.status === "complete"
          ? TONE_PROFILES[version.mastering.profile].label
          : "当前声音";
    const link = document.createElement("a");
    link.href = audioUrl;
    link.download = safeFileName(
      `${projectTitle}-${version?.label ?? "当前版本"}-${soundLabel}.wav`,
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    setDialog(null);
    announce("WAV 导出已开始");
  };

  const requestVersionDeletion = (versionId: string) => {
    const version = versions.find((item) => item.id === versionId);
    if (!version) return;
    const ownedCount = assets.filter(
      (asset) => asset.versionId === versionId,
    ).length;
    setPendingDeletion({
      kind: "version",
      id: versionId,
      name: `${projectTitle} · ${version.label}`,
      detail: ownedCount
        ? `将删除这个版本以及它独占的 ${ownedCount} 份本机音频。其他版本仍在使用的音频会保留。`
        : "将删除这个版本记录。它没有独占的本机音频。",
    });
  };

  const requestAssetDeletion = (asset: MusicAsset) => {
    if (asset.versionId && versions.some((item) => item.id === asset.versionId)) {
      requestVersionDeletion(asset.versionId);
      return;
    }
    setPendingDeletion({
      kind: "asset",
      id: asset.id,
      name: asset.name,
      detail: "将从这台设备永久删除这份音频和波形数据。",
    });
  };

  const confirmDeletion = async () => {
    const pending = pendingDeletion;
    if (!pending) return;
    if (pending.kind === "asset") {
      const asset = assets.find((item) => item.id === pending.id);
      if (!asset) {
        setPendingDeletion(null);
        return;
      }
      try {
        await localAudioStore.delete(asset);
        if (playingAssetId === asset.id) clearCurrentAudio();
        setAssets((items) => items.filter((item) => item.id !== asset.id));
        if (referenceSettings.assetId === asset.id) {
          setReferenceSettings((settings) => ({
            ...settings,
            mode: "none",
            assetId: "",
          }));
        }
        setPendingDeletion(null);
        announce(`已删除《${asset.name}》`);
      } catch (error) {
        announce(error instanceof Error ? error.message : "删除没有完成。");
      }
      return;
    }

    const deletion = planVersionDeletion({
      versionId: pending.id,
      versions,
      assets,
    });
    if (!deletion.target) {
      setPendingDeletion(null);
      return;
    }
    const deletedAssets = assets.filter((asset) =>
      deletion.assetIds.includes(asset.id),
    );
    try {
      await localAudioStore.deleteMany(deletedAssets);
      const remainingAssets = assets.filter(
        (asset) => !deletion.assetIds.includes(asset.id),
      );
      setAssets(remainingAssets);
      setVersions(deletion.remainingVersions);
      setLastGeneratedVersionIds((items) =>
        items.filter((id) => id !== pending.id),
      );
      if (selectedVersion === pending.id) {
        const nextVersion = deletion.remainingVersions[0];
        clearCurrentAudio();
        if (nextVersion) {
          setSelectedVersion(nextVersion.id);
          if (nextVersion.bpm) setBpm(nextVersion.bpm);
          if (nextVersion.musicKey) setMusicKey(nextVersion.musicKey);
          if (nextVersion.lyrics) setLyrics(nextVersion.lyrics);
          if (nextVersion.preferences)
            setGenerationPreferences(nextVersion.preferences);
          const nextAsset = remainingAssets.find(
            (asset) => asset.id === nextVersion.audioAssetId,
          );
          if (nextAsset) await loadAudioAsset(nextAsset);
        } else {
          setSelectedVersion("");
        }
      } else if (
        playingAssetId &&
        deletion.assetIds.includes(playingAssetId)
      ) {
        clearCurrentAudio();
      }
      setPendingDeletion(null);
      announce(`已删除${deletion.target.label}，其他版本保持不变`);
    } catch (error) {
      announce(error instanceof Error ? error.message : "版本删除没有完成。");
    }
  };

  const clearCurrentAudio = () => {
    audioRef.current?.pause();
    if (audioRef.current) {
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
    }
    releaseActiveObjectUrl();
    setAudioUrl(null);
    setAudioDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setPlayingAssetId(null);
    setAuditioningClipId(null);
    segmentEndRef.current = null;
  };

  return (
    <>
      <div
        className={`app-shell ${view === "studio" ? "is-studio" : "is-workspace"}`}
      >
        <Sidebar
          view={view}
          projects={recentProjects}
          versions={versions}
          selectedVersion={selectedVersion}
          musicEngineStatus={musicEngineStatus}
          onNavigate={setView}
          onNewProject={() => setDialog("new-project")}
          onSelectVersion={selectVersion}
          onDeleteVersion={requestVersionDeletion}
        />
        {view === "projects" ? (
          <ProjectsView
            onOpenStudio={() => setView("studio")}
            onNewProject={() => setDialog("new-project")}
            onNotifications={() => setDialog("notifications")}
            musicEngineStatus={musicEngineStatus}
          />
        ) : null}
        {view === "library" ? (
          <LibraryView
            assets={visibleAssets}
            assetsReady={assetsReady}
            playingAssetId={playingAssetId}
            isPlaying={isPlaying}
            onImportFiles={handleImportFiles}
            onTogglePlayback={toggleAssetPlayback}
            onToggleFavorite={toggleAssetFavorite}
            onDeleteAsset={requestAssetDeletion}
            currentReferenceId={
              referenceSettings.mode === "none" ? "" : referenceSettings.assetId
            }
            onUseAsReference={(asset) => {
              setReferenceSettings({
                mode: "style",
                assetId: asset.id,
                strength: 0.2,
              });
              announce(`已把《${asset.name}》设为风格参考音频`);
            }}
            onNotifications={() => setDialog("notifications")}
          />
        ) : null}
        {view === "models" ? (
          <ModelsView
            voiceAvailable={voiceAvailable}
            musicEngineStatus={musicEngineStatus}
            onInstallPlan={() => setDialog("install-plan")}
            onNotifications={() => setDialog("notifications")}
            onAnnounce={announce}
          />
        ) : null}
        {view === "studio" ? (
          <>
            <div className="studio-column">
              <Transport
                projectTitle={projectTitle}
                isPlaying={isPlaying}
                canPlay={Boolean(audioUrl)}
                currentTime={currentTime}
                duration={audioDuration}
                bpm={bpm}
                musicKey={musicKey}
                onBack={() => setView("projects")}
                onExport={() => setDialog("export")}
                onTogglePlay={handleTogglePlay}
                onSeek={handleSeek}
              />
              <StudioToolbar
                mode={generationMode}
                hasSelection={false}
                zoom={timelineZoom}
                onModeChange={setGenerationMode}
                onZoomChange={setTimelineZoom}
              />
              <main className="studio-main">
                <Timeline
                  waveform={currentTimelineAsset?.waveform ?? []}
                  duration={audioDuration}
                  currentTime={currentTime}
                  hasAudio={Boolean(audioUrl && currentTimelineAsset)}
                  zoom={timelineZoom}
                  onSeek={handleSeek}
                />
                <KaraokeLyrics
                  cues={currentLyricCues}
                  currentTime={currentTime}
                  hasAudio={Boolean(audioUrl)}
                  isInstrumental={
                    currentVersion?.preferences?.vocalStyle === "instrumental"
                  }
                  onSeek={handleSeek}
                />
                <BottomWorkspace
                  lyrics={lyrics}
                  bpm={bpm}
                  musicKey={musicKey}
                  versions={versions}
                  selectedVersion={selectedVersion}
                  tasks={tasks}
                  onLyricsChange={setLyrics}
                  onSelectVersion={selectVersion}
                  onDeleteVersion={requestVersionDeletion}
                  audioVariant={audioVariant}
                  remasteringVersionId={remasteringVersionId}
                  onSelectAudioVariant={selectAudioVariant}
                  onRemasterVersion={remasterVersion}
                  onCompare={() => setDialog("compare")}
                />
              </main>
            </div>
            <AgentPanel
              state={agentState}
              progress={progress}
              progressLabel={progressLabel}
              workflow={workflow}
              plan={plan}
              prompt={prompt}
              lyricsCharacterCount={lyrics.join("").replace(/\s/g, "").length}
              selectedNames={agentSelectionNames}
              isListening={isListening}
              voiceAvailable={voiceAvailable}
              generationMode={generationMode}
              musicEngineStatus={musicEngineStatus}
              preferences={generationPreferences}
              assets={visibleAssets}
              referenceSettings={referenceSettings}
              hasAudio={Boolean(audioUrl)}
              resultVersions={versions.filter((version) =>
                lastGeneratedVersionIds.includes(version.id),
              )}
              currentVersion={currentVersion}
              selectedVersion={selectedVersion}
              audioVariant={audioVariant}
              remasteringVersionId={remasteringVersionId}
              onPromptChange={setPrompt}
              onPreferencesChange={setGenerationPreferences}
              onReferenceSettingsChange={setReferenceSettings}
              onOpenLibrary={() => setView("library")}
              onSubmit={handleSubmit}
              onToggleListening={toggleListening}
              onRefineChorus={refineChorus}
              onNewProject={() => setDialog("new-project")}
              onExport={() => setDialog("export")}
              onSelectVersion={(versionId) => selectVersion(versionId, true)}
              onSelectAudioVariant={selectAudioVariant}
              onRemasterVersion={remasterVersion}
              onCompare={() => setDialog("compare")}
            />
          </>
        ) : null}
      </div>
      <audio
        ref={audioRef}
        src={audioUrl ?? undefined}
        onTimeUpdate={(event) => {
          const audio = event.currentTarget;
          const segmentEnd = segmentEndRef.current;
          if (segmentEnd !== null && audio.currentTime >= segmentEnd - 0.03) {
            audio.pause();
            audio.currentTime = segmentEnd;
            setCurrentTime(segmentEnd);
            segmentEndRef.current = null;
            setAuditioningClipId(null);
            return;
          }
          setCurrentTime(audio.currentTime);
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          segmentEndRef.current = null;
          setAuditioningClipId(null);
        }}
      />
      <p className="sr-only" aria-live="assertive">
        {announcement}
      </p>
      {toast ? (
        <div className="toast" role="status">
          <span aria-hidden="true">✓</span>
          {toast}
        </div>
      ) : null}
      {dialog === "new-project" ? (
        <NewProjectDialog
          onClose={() => setDialog(null)}
          onCreate={createProject}
        />
      ) : null}
      {dialog === "export" ? (
        <ExportDialog
          hasAudio={Boolean(audioUrl)}
          projectTitle={projectTitle}
          onClose={() => setDialog(null)}
          onExport={exportAudio}
        />
      ) : null}
      {dialog === "compare" ? (
        <CompareDialog
          versions={versions}
          selectedVersion={selectedVersion}
          onSelectVersion={(versionId) => {
            selectVersion(versionId);
          }}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog === "install-plan" ? (
        <InstallPlanDialog
          musicEngineStatus={musicEngineStatus}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog === "notifications" ? (
        <NotificationsDialog
          musicEngineStatus={musicEngineStatus}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {pendingDeletion ? (
        <DeleteConfirmDialog
          itemName={pendingDeletion.name}
          detail={pendingDeletion.detail}
          onCancel={() => setPendingDeletion(null)}
          onConfirm={confirmDeletion}
        />
      ) : null}
    </>
  );
}

function readStored(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function readStoredJson<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}
function readStoredVersions() {
  try {
    const value = localStorage.getItem("codex-music-versions");
    if (!value) return initialVersions;
    const stored = versionsFromStorage(JSON.parse(value));
    return stored.length ? stored : initialVersions;
  } catch {
    return initialVersions;
  }
}
function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}
function safeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "-");
}
function waitForAudioMetadata(audio: HTMLAudioElement) {
  if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
    return Promise.resolve();
  }
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => finish(), 8_000);
    const finish = (error?: Error) => {
      window.clearTimeout(timer);
      audio.removeEventListener("loadedmetadata", handleReady);
      audio.removeEventListener("error", handleError);
      if (error) reject(error);
      else resolve();
    };
    const handleReady = () => finish();
    const handleError = () =>
      finish(new Error("这个音频无法播放，请重新导入。"));
    audio.addEventListener("loadedmetadata", handleReady, { once: true });
    audio.addEventListener("error", handleError, { once: true });
  });
}
function modePrompt(mode: GenerationMode) {
  return {
    full: "[整首生成] ",
    region: "[只修改选中片段] ",
    extend: "[续写当前结构] ",
    rearrange: "[保留核心素材并重新编曲] ",
  }[mode];
}
function modeTaskLabel(mode: GenerationMode) {
  return {
    full: "生成整首作品",
    region: "局部重绘",
    extend: "续写作品",
    rearrange: "重新编曲",
  }[mode];
}
function vocalModePrompt(vocalStyle: GenerationPreferences["vocalStyle"]) {
  return {
    female: "female vocal",
    male: "male vocal",
    instrumental: "instrumental, no vocals",
  }[vocalStyle];
}
function referenceModeLabel(mode: GenerationReferenceSettings["mode"]) {
  return {
    none: "自由生成",
    style: "参考风格",
    cover: "翻唱 / 重编",
  }[mode];
}
