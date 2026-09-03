import { getBezierPath, type EdgeProps } from "reactflow";

export default function EdgeLine({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgeProps): JSX.Element {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const pathId = `workflow-edge-${id}`;
  const markerId = `workflow-arrow-${id}`;

  return (
    <g className="workflow-edge">
      <defs>
        <marker
          id={markerId}
          markerWidth="10"
          markerHeight="8"
          refX="8"
          refY="4"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path d="M 0 0 L 10 4 L 0 8 z" fill="var(--accent-cyan)" />
        </marker>
      </defs>
      <path id={pathId} d={edgePath} className="workflow-edge__base" />
      <path
        d={edgePath}
        className="workflow-edge__flow"
        markerEnd={`url(#${markerId})`}
      />
      <circle r={3.4} className="workflow-edge__packet">
        <animateMotion dur="2.2s" repeatCount="indefinite" rotate="auto">
          <mpath href={`#${pathId}`} />
        </animateMotion>
      </circle>
    </g>
  );
}
