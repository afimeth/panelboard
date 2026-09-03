import {
  Background,
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type EdgeTypes,
  type Node,
  type NodeTypes,
} from "reactflow";
import "reactflow/dist/style.css";
import ActiveProcessPopup from "./ActiveProcessPopup";
import EdgeLine from "./nodes/EdgeLine";
import NodeCard, { type WorkflowNodeData } from "./nodes/NodeCard";
import "./nodes/workflow.css";

const nodeTypes: NodeTypes = { workflow: NodeCard };
const edgeTypes: EdgeTypes = { glow: EdgeLine };

const initialNodes: Node<WorkflowNodeData>[] = [
  {
    id: "coordinator",
    type: "workflow",
    position: { x: 40, y: 140 },
    data: {
      title: "coordinator",
      role: "assistant",
      status: "plan · static",
      accent: "cyan",
    },
  },
  {
    id: "api-agent",
    type: "workflow",
    position: { x: 300, y: 140 },
    data: {
      title: "api ajani",
      role: "uygulayici",
      status: "doing · static",
      accent: "violet",
    },
  },
  {
    id: "local",
    type: "workflow",
    position: { x: 560, y: 140 },
    data: {
      title: "yerel model",
      role: "bound task",
      status: "idle · static",
      accent: "cyan",
    },
  },
  {
    id: "output",
    type: "workflow",
    position: { x: 820, y: 140 },
    data: {
      title: "cikti",
      role: "dosya",
      status: "ornek · static",
      accent: "violet",
    },
  },
];

const initialEdges: Edge[] = [
  { id: "e-coordinator-api", source: "coordinator", target: "api-agent", type: "glow" },
  { id: "e-api-local", source: "api-agent", target: "local", type: "glow" },
  { id: "e-local-output", source: "local", target: "output", type: "glow" },
];

export default function WorkflowCanvas(): JSX.Element {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="workflow-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.28 }}
        panOnDrag
        zoomOnScroll
        minZoom={0.4}
        maxZoom={1.8}
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={22} size={1} color="rgba(79, 209, 255, 0.16)" />
        <Controls showInteractive={false} />
      </ReactFlow>
      <div className="workflow-canvas__hud">pipeline · ornek akis</div>
      <ActiveProcessPopup />
    </div>
  );
}
