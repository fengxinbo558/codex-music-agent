import type { MusicWorkflow } from "../types";

type AgentWorkflowProps = {
  workflow: MusicWorkflow;
};

export function AgentWorkflow({ workflow }: AgentWorkflowProps) {
  return (
    <section className="workflow-board" aria-labelledby="workflow-heading">
      <div className="workflow-heading">
        <div>
          <span className="section-kicker">REAL WORKFLOW</span>
          <h3 id="workflow-heading">专业制作团队</h3>
        </div>
        <span className={`workflow-state is-${workflow.status}`}>
          {workflowStatusLabel(workflow.status)}
        </span>
      </div>
      <p className="workflow-explainer">
        每一项都对应真实输入、输出或检查；音乐模型是工具，不冒充 Agent。
      </p>
      <ol className="workflow-steps">
        {workflow.steps.map((step, index) => (
          <li className={`is-${step.status}`} key={step.id}>
            <span className="workflow-index">
              {step.status === "complete"
                ? "✓"
                : step.status === "failed"
                  ? "!"
                  : String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <span className="workflow-owner">
                {step.owner}
                <small>{step.kind === "tool" ? "模型工具" : "Agent"}</small>
              </span>
              <strong>{step.title}</strong>
              <p>{step.evidence ?? step.output}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function workflowStatusLabel(status: MusicWorkflow["status"]) {
  switch (status) {
    case "running":
      return "进行中";
    case "complete":
      return "已交付";
    case "failed":
      return "未完成";
    default:
      return "待开始";
  }
}
