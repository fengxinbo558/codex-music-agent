import type { DirectionCandidate } from "../types";

type DirectionConfirmationProps = {
  directions: DirectionCandidate[];
  selectedId: string;
  onSelect: (id: string) => void;
  onChange: (direction: DirectionCandidate) => void;
  onApprove: () => void;
  onRefresh: () => void;
  onBack: () => void;
};

export function DirectionConfirmation({
  directions,
  selectedId,
  onSelect,
  onChange,
  onApprove,
  onRefresh,
  onBack,
}: DirectionConfirmationProps) {
  const selected = directions.find((item) => item.id === selectedId);
  return (
    <section className="confirmation-stage" aria-labelledby="direction-title">
      <header className="confirmation-heading">
        <div>
          <span className="eyebrow">CONFIRM 01</span>
          <h3 id="direction-title">先确定创作方向</h3>
        </div>
        <span className="confirmation-required">需要你确认</span>
      </header>
      <p className="confirmation-intro">
        音乐模型还没有启动。先从三套方案里选一套，你也可以直接改速度和调性。
      </p>

      <div className="direction-card-list" role="radiogroup" aria-label="创作方向">
        {directions.map((direction) => {
          const isSelected = direction.id === selectedId;
          return (
            <article
              key={direction.id}
              className={`direction-card is-${direction.kind} ${isSelected ? "is-selected" : ""}`}
            >
              <button
                className="direction-card-select"
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSelect(direction.id)}
              >
                <span>{direction.label}</span>
                <strong>{direction.brief.genre}</strong>
                <small>{direction.reason}</small>
              </button>
              <div className="direction-facts">
                <label>
                  <span>速度</span>
                  <input
                    aria-label={`${direction.label}速度`}
                    type="number"
                    min={60}
                    max={180}
                    value={direction.brief.bpm}
                    onFocus={() => onSelect(direction.id)}
                    onChange={(event) =>
                      onChange({
                        ...direction,
                        brief: {
                          ...direction.brief,
                          bpm: Number(event.currentTarget.value),
                        },
                      })
                    }
                  />
                  <em>BPM</em>
                </label>
                <label>
                  <span>调性</span>
                  <input
                    aria-label={`${direction.label}调性`}
                    value={direction.brief.key}
                    onFocus={() => onSelect(direction.id)}
                    onChange={(event) =>
                      onChange({
                        ...direction,
                        brief: {
                          ...direction.brief,
                          key: event.currentTarget.value,
                        },
                      })
                    }
                  />
                </label>
              </div>
              <dl className="direction-details">
                <div>
                  <dt>情绪</dt>
                  <dd>{direction.brief.mood}</dd>
                </div>
                <div>
                  <dt>声线</dt>
                  <dd>{direction.voiceTexture}</dd>
                </div>
                <div>
                  <dt>配器</dt>
                  <dd>{direction.brief.instruments.join("、")}</dd>
                </div>
                <div>
                  <dt>结构</dt>
                  <dd>{direction.brief.structure.join(" → ")}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>

      <div className="confirmation-actions">
        <button type="button" className="quiet-button" onClick={onBack}>
          修改原始创意
        </button>
        <button type="button" className="quiet-button" onClick={onRefresh}>
          换一组推荐
        </button>
        <button
          type="button"
          className="stage-primary-action"
          disabled={!selected}
          onClick={onApprove}
        >
          采用这套并继续 <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}
