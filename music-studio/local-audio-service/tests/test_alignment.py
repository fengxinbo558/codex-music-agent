from __future__ import annotations

from audio_service.alignment import (
    align_transcription,
    balanced_groups,
    lyric_windows,
    merge_window_transcriptions,
)


def test_aligns_real_transcription_to_approved_lines():
    result = align_transcription(
        ["巴黎今晚必须发力", "里尔主场也挡不住"],
        {
            "text": "巴黎今晚必须发力 里尔主场也挡不住",
            "segments": [
                {"text": "巴黎今晚必须发力", "start": 2.0, "end": 5.5, "avg_logprob": -0.05},
                {"text": "里尔主场也挡不住", "start": 6.0, "end": 9.6, "avg_logprob": -0.08},
            ],
        },
        ["巴黎", "里尔"],
        12.0,
    )

    assert result["quality"]["overall_match"] == 1.0
    assert result["quality"]["line_coverage"] == 1.0
    assert result["cues"][0]["start"] == 2.0
    assert result["cues"][1]["end"] == 9.6
    assert result["quality"]["status"] == "passed"


def test_fails_when_model_sings_different_words_and_stops_early():
    result = align_transcription(
        ["巴黎今晚必须发力", "里尔主场也挡不住", "这里还是七姐聊球"],
        {
            "text": "星光落进远方",
            "segments": [
                {"text": "星光落进远方", "start": 1.0, "end": 3.5, "avg_logprob": -1.2},
            ],
        },
        ["巴黎", "里尔", "七姐聊球"],
        60.0,
    )

    assert result["quality"]["status"] == "failed"
    assert result["quality"]["overall_match"] < 0.2
    assert result["quality"]["line_coverage"] == 0.0
    assert "整首有效演唱覆盖不足" in result["quality"]["warnings"]


def test_guided_pass_resolves_sung_names_but_unbiased_pass_still_guards_hallucination():
    result = align_transcription(
        ["虽然巴黎被雷恩逼平", "巴黎今晚必须发力", "里尔主场也挡不住"],
        {
            "text": "虽然巴黎被雷恩逼平 巴黎今晚必须发力 里尔主场也挡不住",
            "segments": [
                {"text": "虽然巴黎被雷恩逼平", "start": 1.0, "end": 4.0, "avg_logprob": -0.08},
                {"text": "巴黎今晚必须发力", "start": 5.0, "end": 8.0, "avg_logprob": -0.08},
                {"text": "里尔主场也挡不住", "start": 9.0, "end": 12.0, "avg_logprob": -0.08},
            ],
        },
        ["巴黎", "雷恩", "里尔", "主场"],
        15.0,
        unbiased_transcription={
            "text": "把你被雷恩逼平 今晚必须发力 也挡不住",
            "segments": [
                {"text": "把你被雷恩逼平", "start": 1.0, "end": 4.0, "avg_logprob": -0.5},
                {"text": "今晚必须发力", "start": 5.0, "end": 8.0, "avg_logprob": -0.5},
                {"text": "也挡不住", "start": 9.0, "end": 12.0, "avg_logprob": -0.5},
            ],
        },
    )

    assert result["quality"]["status"] == "passed"
    assert result["quality"]["overall_match"] == 1.0
    assert result["quality"]["unbiased_match"] >= 0.18
    assert result["unbiased_transcription"].startswith("把你")


def test_guided_words_do_not_pass_when_unbiased_audio_has_no_support():
    result = align_transcription(
        ["巴黎今晚必须发力", "里尔主场也挡不住"],
        {
            "text": "巴黎今晚必须发力 里尔主场也挡不住",
            "segments": [
                {"text": "巴黎今晚必须发力", "start": 2.0, "end": 5.5, "avg_logprob": -0.05},
                {"text": "里尔主场也挡不住", "start": 6.0, "end": 9.6, "avg_logprob": -0.08},
            ],
        },
        ["巴黎", "里尔"],
        12.0,
        unbiased_transcription={
            "text": "星光落进远方",
            "segments": [
                {"text": "星光落进远方", "start": 1.0, "end": 9.0, "avg_logprob": -0.2},
            ],
        },
    )

    assert result["quality"]["status"] == "failed"
    assert result["quality"]["unbiased_match"] < 0.18
    assert "自然识别几乎无法听出批准歌词，可能存在引导识别误判" in result["quality"]["warnings"]


def test_fails_when_approved_words_are_followed_by_large_unapproved_passage():
    result = align_transcription(
        ["巴黎今晚必须发力", "里尔主场也挡不住"],
        {
            "text": "巴黎今晚必须发力 里尔主场也挡不住 后面忽然唱了很多完全没有批准的内容",
            "segments": [
                {
                    "text": "巴黎今晚必须发力 里尔主场也挡不住 后面忽然唱了很多完全没有批准的内容",
                    "start": 1.0,
                    "end": 12.0,
                    "avg_logprob": -0.05,
                },
            ],
        },
        ["巴黎", "里尔"],
        14.0,
    )
    assert result["quality"]["overall_match"] == 1.0
    assert result["quality"]["text_precision"] < 0.6
    assert result["quality"]["status"] == "failed"
    assert "检测到较多批准歌词之外的演唱内容" in result["quality"]["warnings"]


def test_score_notation_and_spoken_score_align_as_the_same_words():
    result = align_transcription(
        ["里尔客场二比零零封昂热"],
        {
            "text": "里尔客场2-0零封昂热",
            "segments": [
                {"text": "里尔客场2-0零封昂热", "start": 1.0, "end": 5.0, "avg_logprob": -0.05},
            ],
        },
        ["二比零", "昂热"],
        7.0,
    )
    assert result["quality"]["overall_match"] == 1.0
    assert result["quality"]["key_term_match"] == 1.0


def test_multi_digit_quantity_and_spoken_quantity_align():
    result = align_transcription(
        ["已有十支球队拿分"],
        {
            "text": "已有10支球队拿分",
            "segments": [
                {"text": "已有10支球队拿分", "start": 1.0, "end": 4.0, "avg_logprob": -0.05},
            ],
        },
        ["十支"],
        6.0,
    )
    assert result["quality"]["overall_match"] == 1.0
    assert result["quality"]["key_term_match"] == 1.0


def test_long_song_lines_are_balanced_without_one_line_tail():
    groups = balanced_groups([f"第{index}句" for index in range(13)], 4)
    assert [len(group) for group in groups] == [4, 3, 3, 3]


def test_long_song_windows_overlap_but_keep_disjoint_core_ranges():
    windows = lyric_windows(59.2, 2, overlap=1.2)
    assert windows == [(0.0, 30.8, 0.0, 29.6), (28.4, 59.2, 29.6, 59.2)]


def test_window_merge_uses_core_midpoints_and_preserves_absolute_times():
    merged = merge_window_transcriptions(
        [
            (
                {
                    "segments": [
                        {"text": "第一段", "start": 2.0, "end": 5.0},
                        {"text": "重复边界", "start": 28.0, "end": 31.0},
                    ]
                },
                0.0,
                29.6,
            ),
            (
                {
                    "segments": [
                        {"text": "重复边界", "start": 28.0, "end": 31.0},
                        {"text": "第二段", "start": 32.0, "end": 36.0},
                    ]
                },
                29.6,
                59.2,
            ),
        ]
    )
    assert [item["text"] for item in merged["segments"]] == [
        "第一段",
        "重复边界",
        "第二段",
    ]
    assert merged["segments"][1]["start"] == 28.0
