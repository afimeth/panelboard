import { Handle, Position, type NodeProps } from "reactflow";

export type WorkflowNodeData = {
  title: string;
  role: string;
  status: string;
  accent: "cyan" | "violet";
};

export default function NodeCard({
  data,
}: NodeProps<WorkflowNodeData>): JSX.Element {
  const tone =
    data.accent === "violet" ? "workflow-node--violet" : "workflow-node--cyan";

  return (
    <article className={`workflow-node ${tone}`}>
      <Handle type="target" position={Position.Left} />
      <div className="workflow-node__row">
        <span className="workflow-node__title">{data.title}</span>
        <span className="workflow-node__pulse" aria-hidden="true" />
      </div>
      <div className="workflow-node__role">{data.role}</div>
      <div className="workflow-node__meta">{data.status}</div>
      <Handle type="source" position={Position.Right} />
    </article>
  );
}
