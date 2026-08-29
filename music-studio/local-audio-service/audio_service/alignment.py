from __future__ import annotations

import math
import re
from dataclasses import asdict, dataclass
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Callable

import soundfile as sf

MODEL_REPO = "mlx-community/whisper-large-v3-turbo"
LONG_AUDIO_SECONDS = 45.0
MAX_LINES_PER_WINDOW = 4
WINDOW_OVERLAP_SECONDS = 1.2


@dataclass(frozen=True)
class AlignedCue:
    id: str
    text: str
    start: float
    end: float
    source: str
    observed_text: str
    match_ratio: float
    confidence: float


def transcribe_audio(path: Path, initial_prompt: str | None = None) -> dict[str, Any]:
    try:
        import mlx_whisper
    except ImportError as exc:
        raise RuntimeError("MLX Whisper 尚未安装，无法执行真实歌词对齐。") from exc
    return mlx_whisper.transcribe(
        str(path),
        path_or_hf_repo=MODEL_REPO,
        language="zh",
        word_timestamps=True,
        condition_on_previous_text=False,
        initial_prompt=initial_prompt,
        verbose=False,
    )


def transcribe_audio_window(
    path: Path,
    initial_prompt: str | None,
    start: float,
    end: float,
) -> dict[str, Any]:
    try:
        import mlx_whisper
    except ImportError as exc:
        raise RuntimeError("MLX Whisper 尚未安装，无法执行真实歌词对齐。") from exc
    return mlx_whisper.transcribe(
        str(path),
        path_or_hf_repo=MODEL_REPO,
        language="zh",
        word_timestamps=True,
        condition_on_previous_text=False,
        initial_prompt=initial_prompt,
        clip_timestamps=[start, end],
        verbose=False,
    )


def align_audio(
    path: Path,
    lyrics: list[str],
    key_terms: list[str],
    transcriber: Callable[[Path, str | None], dict[str, Any]] = transcribe_audio,
    windowed_transcriber: Callable[
        [Path, str | None, float, float], dict[str, Any]
    ] = transcribe_audio_window,
) -> dict[str, Any]:
    # Singing is substantially harder for speech recognition than speech.  Run
    # one unbiased pass to prove that vocals are present, then a lyric-guided
    # pass to resolve Mandarin homophones and names without inventing timings.
    duration = float(sf.info(path).duration)
    clean_lines = [line.strip() for line in lyrics if normalize(line)]
    if duration > LONG_AUDIO_SECONDS and len(clean_lines) > MAX_LINES_PER_WINDOW:
        groups = balanced_groups(clean_lines, MAX_LINES_PER_WINDOW)
        windows = lyric_windows(duration, len(groups))
        guided_parts: list[tuple[dict[str, Any], float, float]] = []
        unbiased_parts: list[tuple[dict[str, Any], float, float]] = []
        for group, window in zip(groups, windows, strict=True):
            start, end, core_start, core_end = window
            group_text = normalize("".join(group))
            group_terms = [term for term in key_terms if normalize(term) in group_text]
            unbiased_parts.append(
                (windowed_transcriber(path, None, start, end), core_start, core_end)
            )
            guided_parts.append(
                (
                    windowed_transcriber(
                        path,
                        build_lyric_prompt(group, group_terms),
                        start,
                        end,
                    ),
                    core_start,
                    core_end,
                )
            )
        unbiased = merge_window_transcriptions(unbiased_parts)
        guided = merge_window_transcriptions(guided_parts)
    else:
        unbiased = transcriber(path, None)
        lyric_prompt = build_lyric_prompt(clean_lines, key_terms)
        guided = transcriber(path, lyric_prompt)
    return align_transcription(
        lyrics,
        guided,
        key_terms,
        duration,
        unbiased_transcription=unbiased,
    )


def balanced_groups(lines: list[str], max_lines: int) -> list[list[str]]:
    if not lines:
        return []
    group_count = math.ceil(len(lines) / max(1, max_lines))
    base_size, remainder = divmod(len(lines), group_count)
    groups: list[list[str]] = []
    cursor = 0
    for index in range(group_count):
        size = base_size + (1 if index < remainder else 0)
        groups.append(lines[cursor : cursor + size])
        cursor += size
    return groups


def lyric_windows(
    duration: float,
    count: int,
    overlap: float = WINDOW_OVERLAP_SECONDS,
) -> list[tuple[float, float, float, float]]:
    window_duration = duration / max(1, count)
    output: list[tuple[float, float, float, float]] = []
    for index in range(count):
        core_start = window_duration * index
        core_end = duration if index == count - 1 else window_duration * (index + 1)
        start = max(0.0, core_start - (overlap if index else 0.0))
        end = min(duration, core_end + (overlap if index < count - 1 else 0.0))
        output.append(
            tuple(round(value, 3) for value in (start, end, core_start, core_end))
        )
    return output


def merge_window_transcriptions(
    parts: list[tuple[dict[str, Any], float, float]],
) -> dict[str, Any]:
    segments: list[dict[str, Any]] = []
    for transcription, core_start, core_end in parts:
        for segment in transcription.get("segments", []):
            start = float(segment.get("start", 0.0))
            end = max(start, float(segment.get("end", start)))
            midpoint = (start + end) / 2
            is_last_boundary = math.isclose(midpoint, core_end)
            if midpoint < core_start or (midpoint > core_end or is_last_boundary):
                continue
            segments.append(dict(segment))
    segments.sort(key=lambda segment: float(segment.get("start", 0.0)))
    return {
        "text": " ".join(str(segment.get("text", "")).strip() for segment in segments),
        "segments": segments,
    }


def align_transcription(
    lyrics: list[str],
    transcription: dict[str, Any],
    key_terms: list[str],
    duration: float,
    unbiased_transcription: dict[str, Any] | None = None,
) -> dict[str, Any]:
    clean_lines = [line.strip() for line in lyrics if normalize(line)]
    expected_chars = "".join(normalize(line) for line in clean_lines)
    observed, observed_times, observed_confidences = observed_character_stream(transcription)
    matcher = SequenceMatcher(None, expected_chars, observed, autojunk=False)
    expected_to_observed: dict[int, int] = {}
    for block in matcher.get_matching_blocks():
        for offset in range(block.size):
            expected_to_observed[block.a + offset] = block.b + offset

    cues: list[AlignedCue] = []
    line_cursor = 0
    for index, line in enumerate(clean_lines):
        normalized_line = normalize(line)
        line_start = line_cursor
        line_end = line_cursor + len(normalized_line)
        mapped = [
            expected_to_observed[position]
            for position in range(line_start, line_end)
            if position in expected_to_observed
        ]
        match_ratio = len(mapped) / max(1, len(normalized_line))
        if mapped:
            observed_start = min(mapped)
            observed_end = max(mapped)
            start = observed_times[observed_start][0]
            end = observed_times[observed_end][1]
            confidence = sum(observed_confidences[position] for position in mapped) / len(mapped)
            observed_text = observed[observed_start : observed_end + 1]
        else:
            start = 0.0
            end = 0.0
            confidence = 0.0
            observed_text = ""
        cues.append(
            AlignedCue(
                id=f"aligned-{index + 1}",
                text=line,
                start=round(start, 3),
                end=round(end, 3),
                source="aligned",
                observed_text=observed_text,
                match_ratio=round(match_ratio, 4),
                confidence=round(confidence, 4),
            )
        )
        line_cursor = line_end

    overall_match = len(expected_to_observed) / max(1, len(expected_chars))
    text_precision = len(expected_to_observed) / max(1, len(observed))
    unbiased_observed = ""
    unbiased_match = overall_match
    if unbiased_transcription is not None:
        unbiased_observed, _, _ = observed_character_stream(unbiased_transcription)
        unbiased_match = sequence_match_ratio(expected_chars, unbiased_observed)
    matched_lines = [cue for cue in cues if cue.match_ratio >= 0.6 and cue.end > cue.start]
    line_coverage = len(matched_lines) / max(1, len(cues))
    normalized_terms = [normalize(term) for term in key_terms if normalize(term)]
    matched_terms = [term for term in normalized_terms if term in observed]
    key_term_match = len(matched_terms) / max(1, len(normalized_terms)) if normalized_terms else 1.0
    average_confidence = (
        sum(observed_confidences) / len(observed_confidences) if observed_confidences else 0.0
    )
    voiced_start = min((item[0] for item in observed_times), default=0.0)
    voiced_end = max((item[1] for item in observed_times), default=0.0)
    vocal_coverage = max(0.0, voiced_end - voiced_start) / max(0.001, duration)
    warnings: list[str] = []
    if overall_match < 0.88:
        warnings.append("实际唱词与批准歌词差异较大")
    if text_precision < 0.6:
        warnings.append("检测到较多批准歌词之外的演唱内容")
    if line_coverage < 0.9:
        warnings.append("存在漏唱或无法可靠定位的歌词句")
    if key_term_match < 0.92:
        warnings.append("专有名词、数字或结论重点词没有唱清")
    if average_confidence < 0.55:
        warnings.append("中文吐字识别置信度偏低，需要人工复听")
    if unbiased_match < 0.18:
        warnings.append("自然识别几乎无法听出批准歌词，可能存在引导识别误判")
    if vocal_coverage < 0.35:
        warnings.append("整首有效演唱覆盖不足")
    passed = (
        overall_match >= 0.88
        and text_precision >= 0.6
        and line_coverage >= 0.9
        and key_term_match >= 0.92
        and average_confidence >= 0.55
        and vocal_coverage >= 0.35
        and unbiased_match >= 0.18
    )
    status = "passed" if passed else "failed"
    return {
        "transcription": str(transcription.get("text", "")).strip(),
        "unbiased_transcription": str(
            (unbiased_transcription or transcription).get("text", "")
        ).strip(),
        "cues": [asdict(cue) for cue in cues],
        "quality": {
            "status": status,
            "overall_match": round(overall_match, 4),
            "text_precision": round(text_precision, 4),
            "line_coverage": round(line_coverage, 4),
            "key_term_match": round(key_term_match, 4),
            "average_confidence": round(average_confidence, 4),
            "vocal_coverage": round(vocal_coverage, 4),
            "unbiased_match": round(unbiased_match, 4),
            "matched_key_terms": matched_terms,
            "warnings": warnings,
        },
    }


def observed_character_stream(
    transcription: dict[str, Any],
) -> tuple[str, list[tuple[float, float]], list[float]]:
    characters: list[str] = []
    times: list[tuple[float, float]] = []
    confidences: list[float] = []
    for segment in transcription.get("segments", []):
        text = normalize(str(segment.get("text", "")))
        if not text:
            continue
        start = float(segment.get("start", 0.0))
        end = max(start, float(segment.get("end", start)))
        confidence = confidence_from_segment(segment)
        span = max(0.02, (end - start) / len(text))
        for index, character in enumerate(text):
            char_start = start + span * index
            char_end = min(end, char_start + span)
            characters.append(character)
            times.append((char_start, char_end))
            confidences.append(confidence)
    return "".join(characters), times, confidences


def confidence_from_segment(segment: dict[str, Any]) -> float:
    if "confidence" in segment:
        return max(0.0, min(1.0, float(segment["confidence"])))
    log_probability = float(segment.get("avg_logprob", -0.5))
    return max(0.0, min(1.0, math.exp(log_probability)))


def normalize(text: str) -> str:
    translated = verbalize_numbers(text)
    translated = re.sub(r"(?<=[零一二三四五六七八九])比(?=[零一二三四五六七八九])", "", translated)
    return "".join(re.findall(r"[\w\u3400-\u9fff]", translated, flags=re.UNICODE)).replace("_", "")


def verbalize_numbers(text: str) -> str:
    digits = "零一二三四五六七八九"

    def decimal(match: re.Match[str]) -> str:
        return "".join(digits[int(item)] for item in match.group(1)) + "点" + "".join(
            digits[int(item)] for item in match.group(2)
        )

    def score(match: re.Match[str]) -> str:
        return chinese_integer(match.group(1), digits) + "比" + chinese_integer(match.group(2), digits)

    translated = re.sub(r"(\d+)\.(\d+)", decimal, text)
    translated = re.sub(r"(\d+)\s*[-:：比]\s*(\d+)", score, translated)
    return re.sub(r"\d+", lambda match: chinese_integer(match.group(0), digits), translated)


def chinese_integer(value: str, digits: str = "零一二三四五六七八九") -> str:
    if len(value) > 4:
        return "".join(digits[int(item)] for item in value)
    units = ["", "十", "百", "千"]
    output = ""
    pending_zero = False
    for index, item in enumerate(value):
        number = int(item)
        unit_index = len(value) - index - 1
        if number == 0:
            pending_zero = bool(output) and index < len(value) - 1
            continue
        if pending_zero:
            output += "零"
        if not (number == 1 and unit_index == 1 and not output):
            output += digits[number]
        output += units[unit_index]
        pending_zero = False
    return output or "零"


def sequence_match_ratio(expected: str, observed: str) -> float:
    if not expected:
        return 1.0
    matched = sum(
        block.size
        for block in SequenceMatcher(None, expected, observed, autojunk=False).get_matching_blocks()
    )
    return matched / len(expected)


def build_lyric_prompt(lyrics: list[str], key_terms: list[str]) -> str:
    lyric_text = "。".join(line.strip() for line in lyrics if line.strip())
    terms = "、".join(term.strip() for term in key_terms if term.strip())
    suffix = f"。专有名词：{terms}" if terms else ""
    return f"以下是演唱歌词：{lyric_text}{suffix}。"
