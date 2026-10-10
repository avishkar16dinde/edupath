/**
 * EduPath-AI - Hierarchical Roadmap Layout Engine
 * Computes non-overlapping Left-to-Right layout coordinates for directed graphs using Dagre.
 * Gracefully handles alternative pathways, multi-parent nodes, and disconnected nodes.
 */

import dagre from '@dagrejs/dagre';
import { type Node as FlowNode, type Edge as FlowEdge, MarkerType } from '@xyflow/react';
import type { GraphEdge, GraphNode, NodeType } from '../types/pathwayGraph';

export const NODE_WIDTH = 260;
export const NODE_HEIGHT = 110;

export interface LayoutOptions {
  direction?: 'LR' | 'TB';
  nodeSeparation?: number;
  rankSeparation?: number;
}

export function computeRoadmapLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: LayoutOptions = {}
): { flowNodes: FlowNode[]; flowEdges: FlowEdge[] } {
  const { direction = 'LR', nodeSeparation = 50, rankSeparation = 100 } = options;

  if (!nodes || nodes.length === 0) {
    return { flowNodes: [], flowEdges: [] };
  }

  const dagreGraph = new dagre.graphlib.Graph({ multigraph: true });
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: nodeSeparation,
    ranksep: rankSeparation,
    align: 'DL',
  });

  const nodeSet = new Set(nodes.map((n) => n.node_id));

  // Add nodes to Dagre
  nodes.forEach((node) => {
    dagreGraph.setNode(node.node_id, {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      label: node.title,
    });
  });

  // Add edges to Dagre (only between existing nodes)
  edges.forEach((edge) => {
    if (nodeSet.has(edge.source_node_id) && nodeSet.has(edge.target_node_id)) {
      dagreGraph.setEdge(edge.source_node_id, edge.target_node_id, {}, edge.edge_id);
    }
  });

  dagre.layout(dagreGraph);

  // Map to React Flow Nodes
  const flowNodes: FlowNode[] = nodes.map((node) => {
    const dagreNode = dagreGraph.node(node.node_id);
    const x = dagreNode ? dagreNode.x - NODE_WIDTH / 2 : 0;
    const y = dagreNode ? dagreNode.y - NODE_HEIGHT / 2 : 0;

    return {
      id: node.node_id,
      type: 'roadmapNode',
      position: { x, y },
      data: {
        node,
      },
    };
  });

  // Map to React Flow Edges with directional markers
  const flowEdges: FlowEdge[] = edges
    .filter((edge) => nodeSet.has(edge.source_node_id) && nodeSet.has(edge.target_node_id))
    .map((edge) => {
      const isAlternative = edge.edge_type === 'alternative';
      const isConditional = edge.edge_type === 'conditional';

      let strokeColor = '#94a3b8';
      let strokeDasharray: string | undefined = undefined;

      if (isAlternative) {
        strokeColor = '#f59e0b';
        strokeDasharray = '5,5';
      } else if (isConditional) {
        strokeColor = '#8b5cf6';
        strokeDasharray = '4,4';
      } else if (edge.edge_type === 'progression') {
        strokeColor = '#3b82f6';
      }

      return {
        id: edge.edge_id,
        source: edge.source_node_id,
        target: edge.target_node_id,
        type: 'smoothstep',
        animated: isConditional,
        style: {
          stroke: strokeColor,
          strokeWidth: 2,
          strokeDasharray,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
          color: strokeColor,
        },
        data: {
          edgeType: edge.edge_type,
          condition: edge.condition,
        },
      };
    });

  return { flowNodes, flowEdges };
}
