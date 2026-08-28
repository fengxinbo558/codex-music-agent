import type { LyricWritingStyle } from "../types";
import type { LyricWritingStyleGuide } from "../services/lyricWritingStyles";

type LyricWritingStyleSelectorProps = {
  styles: LyricWritingStyleGuide[];
  selectedStyle: LyricWritingStyle;
  onSelect: (style: LyricWritingStyle) => void;
};

export function LyricWritingStyleSelector({
  styles,
  selectedStyle,
  onSelect,
}: LyricWritingStyleSelectorProps) {
  return (
    <section className="lyric-style-selector" aria-labelledby="lyric-style-title">
      <header>
        <div>
          <span className="eyebrow">WRITING ROUTE</span>
          <h4 id="lyric-style-title">这首歌用什么方式写？</h4>
        </div>
        <small>已按你的创意排序</small>
      </header>
      <p className="lyric-style-help">
        新手先选一种说话方式。选择会写进制作方案，但不会擅自改掉下方现有歌词。
      </p>
      <div className="lyric-style-list">
        {styles.map((style, index) => {
          const selected = style.id === selectedStyle;
          return (
            <button
              key={style.id}
              type="button"
              className={selected ? "is-selected" : ""}
              aria-pressed={selected}
              onClick={() => onSelect(style.id)}
            >
              <span className="lyric-style-rank">
                {style.recommended ? `推荐 ${index + 1}` : "更多写法"}
              </span>
              <strong>{style.label}</strong>
              <small>{style.tagline}</small>
              <blockquote>{style.example}</blockquote>
              <p>{style.reason}</p>
              <em>{selected ? "✓ 已选择" : "选择这个写法"}</em>
            </button>
          );
        })}
      </div>
      <details className="lyric-style-guide">
        <summary>我还是不知道怎么选</summary>
        <p>
          想先把事情讲清楚，选“口语叙事”；想保留聊天原味，选“对话体”；想有画面和留白，选“现代诗意象”；想保留更多细节，选“散文感”；想让副歌马上被记住，选“短句钩子”。
        </p>
      </details>
    </section>
  );
}
