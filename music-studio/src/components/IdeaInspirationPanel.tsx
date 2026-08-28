import { createIdeaInspirations } from "../services/ideaInspiration";

type IdeaInspirationPanelProps = {
  idea: string;
  disabled: boolean;
  onApply: (suggestion: string) => void;
};

export function IdeaInspirationPanel({
  idea,
  disabled,
  onApply,
}: IdeaInspirationPanelProps) {
  const inspirations = createIdeaInspirations(idea);
  return (
    <section className="idea-booster" aria-labelledby="idea-booster-title">
      <header>
        <div>
          <span>创意助推器</span>
          <strong id="idea-booster-title">不知道怎么说完整？从这里补一块</strong>
        </div>
        <small>只追加，不覆盖原话</small>
      </header>
      <div className="idea-booster-grid">
        {inspirations.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            title={item.reason}
            onClick={() => onApply(item.suggestion)}
          >
            <span>{item.label}</span>
            <strong>{item.title}</strong>
            <p>{item.suggestion}</p>
            <em>＋ 加入我的想法</em>
          </button>
        ))}
      </div>
    </section>
  );
}
