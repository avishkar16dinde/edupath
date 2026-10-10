import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  type Node as FlowNode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./components/roadmap/roadmap.css";

import type {
  EdgeType,
  GenerationIntent,
  GraphEdge,
  GraphNode,
  NodeType,
  PathwayGraph,
} from "./types";

import { computeRoadmapLayout } from "./utils/roadmapLayout";
import { RoadmapNode } from "./components/roadmap/RoadmapNode";
import { RoadmapToolbar } from "./components/roadmap/RoadmapToolbar";
import { NodeInspectorDrawer } from "./components/roadmap/NodeInspectorDrawer";

// Register custom node types for React Flow
const nodeTypes = {
  roadmapNode: RoadmapNode,
};

interface GraphExplorerProps {
  graph: PathwayGraph | null;
  loading: boolean;
  error: string | null;
  onGenerateInitial: (intent: GenerationIntent, count: number) => void;
  onExpandGraph: (
    selectedNodeIds: string[],
    intent: GenerationIntent,
    count: number
  ) => void;
  isExpanding: boolean;
  onReturnToProfile: () => void;
}

// Inner canvas component that consumes ReactFlow context
const RoadmapWorkspace: React.FC<{
  graph: PathwayGraph;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  expansionNodeIds: Set<string>;
  toggleExpansionSelect: (id: string) => void;
  clearExpansionSelection: () => void;
  intent: GenerationIntent;
  setIntent: (intent: GenerationIntent) => void;
  candidateCount: number;
  setCandidateCount: (count: number) => void;
  categoryFilter: NodeType | "all";
  setCategoryFilter: (cat: NodeType | "all") => void;
  viewMode: "roadmap" | "cards";
  setViewMode: (mode: "roadmap" | "cards") => void;
  onExpandGraph: (
    selectedNodeIds: string[],
    intent: GenerationIntent,
    count: number
  ) => void;
  isExpanding: boolean;
  onReturnToProfile: () => void;
}> = ({
  graph,
  selectedNodeId,
  setSelectedNodeId,
  expansionNodeIds,
  toggleExpansionSelect,
  clearExpansionSelection,
  intent,
  setIntent,
  candidateCount,
  setCandidateCount,
  categoryFilter,
  setCategoryFilter,
  viewMode,
  setViewMode,
  onExpandGraph,
  isExpanding,
  onReturnToProfile,
}) => {
  const { fitView } = useReactFlow();

  // Compute non-overlapping Left-to-Right layout using Dagre
  const { flowNodes, flowEdges } = useMemo(() => {
    return computeRoadmapLayout(graph.nodes, graph.edges, {
      direction: "LR",
      nodeSeparation: 60,
      rankSeparation: 120,
    });
  }, [graph.nodes, graph.edges]);

  // Inject current interaction state into node data without destroying layout positions
  const displayNodes = useMemo(() => {
    return flowNodes.map((fn) => {
      const nodeData = (fn.data as { node: GraphNode }).node;
      const isInspected = nodeData.node_id === selectedNodeId;
      const isMarkedForExpansion = expansionNodeIds.has(nodeData.node_id);
      const isDimmed =
        categoryFilter !== "all" && nodeData.node_type !== categoryFilter;

      return {
        ...fn,
        data: {
          node: nodeData,
          isInspected,
          isMarkedForExpansion,
          isDimmed,
          onSelectNode: (id: string) => setSelectedNodeId(id),
          onToggleExpansion: (id: string) => toggleExpansionSelect(id),
        },
      };
    });
  }, [
    flowNodes,
    selectedNodeId,
    expansionNodeIds,
    categoryFilter,
    setSelectedNodeId,
    toggleExpansionSelect,
  ]);

  // Category counts
  const nodeCounts = useMemo<Record<NodeType | "all", number>>(() => {
    const counts: Record<NodeType | "all", number> = {
      all: graph.nodes.length,
      education: 0,
      career: 0,
      exploration: 0,
      certification: 0,
    };
    graph.nodes.forEach((n) => {
      if (counts[n.node_type] !== undefined) {
        counts[n.node_type] += 1;
      }
    });
    return counts;
  }, [graph.nodes]);

  // Active inspected node object
  const inspectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return graph.nodes.find((n) => n.node_id === selectedNodeId) || null;
  }, [graph.nodes, selectedNodeId]);

  // Fit view automatically on graph topology changes
  useEffect(() => {
    if (graph.nodes.length > 0) {
      const timer = setTimeout(() => {
        fitView({ padding: 0.18, duration: 400 });
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [graph.nodes.length, fitView]);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.18, duration: 400 });
  }, [fitView]);

  const handleResetView = useCallback(() => {
    fitView({ padding: 0.18, duration: 400 });
  }, [fitView]);

  const handleExpandSelected = useCallback(() => {
    if (expansionNodeIds.size === 0) return;
    onExpandGraph(Array.from(expansionNodeIds), intent, candidateCount);
  }, [expansionNodeIds, onExpandGraph, intent, candidateCount]);

  const handleExpandDirectlyFromDrawer = useCallback(
    (nodeId: string, customIntent: GenerationIntent, customCount: number) => {
      onExpandGraph([nodeId], customIntent, customCount);
    },
    [onExpandGraph]
  );

  // Filtered nodes for the optional card grid view
  const cardsFilteredNodes = useMemo(() => {
    if (categoryFilter === "all") return graph.nodes;
    return graph.nodes.filter((n) => n.node_type === categoryFilter);
  }, [graph.nodes, categoryFilter]);

  const formatCost = (cost: number | null, currency: string | null) => {
    if (cost === null || cost === undefined) return "Free / Stipend / N/A";
    const curr = currency || "INR";
    return `${curr} ${cost.toLocaleString()}`;
  };

  const formatDuration = (months: number | null) => {
    if (months === null || months === undefined) return "Flexible";
    if (months >= 12 && months % 12 === 0) {
      return `${months / 12} ${months / 12 === 1 ? "year" : "years"}`;
    }
    return `${months} months`;
  };

  const getNodeTypeBadgeClass = (type: NodeType) => {
    switch (type) {
      case "education":
        return "badge-education";
      case "career":
        return "badge-career";
      case "exploration":
        return "badge-exploration";
      case "certification":
        return "badge-certification";
      default:
        return "";
    }
  };

  return (
    <div className="flex flex-col w-full relative">
      {/* Roadmap Top Toolbar */}
      <RoadmapToolbar
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        nodeCounts={nodeCounts}
        selectedExpansionCount={expansionNodeIds.size}
        intent={intent}
        onIntentChange={setIntent}
        candidateCount={candidateCount}
        onCandidateCountChange={setCandidateCount}
        onExpandSelected={handleExpandSelected}
        onClearExpansionSelection={clearExpansionSelection}
        isExpanding={isExpanding}
        onFitView={handleFitView}
        onResetView={handleResetView}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onReturnToProfile={onReturnToProfile}
      />

      {/* Primary Workspace: Interactive Roadmap or Card Grid */}
      {viewMode === "roadmap" ? (
        <div className="roadmap-canvas-wrapper w-full h-[660px] relative bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-inner">
          <ReactFlow
            nodes={displayNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            onNodeClick={(_event, node: FlowNode) => {
              setSelectedNodeId(node.id);
            }}
            fitView
            minZoom={0.2}
            maxZoom={2.0}
            defaultEdgeOptions={{
              type: "smoothstep",
            }}
          >
            <Background color="#cbd5e1" gap={24} size={1.2} />
            <Controls
              showInteractive={false}
              position="bottom-left"
              className="!bg-white !border !border-slate-200 !rounded-xl !shadow-xs"
            />
            <MiniMap
              nodeStrokeWidth={3}
              zoomable
              pannable
              position="bottom-right"
              className="!bg-white/90 !backdrop-blur-sm !border !border-slate-200 !rounded-xl !shadow-xs !overflow-hidden"
              nodeColor={(node) => {
                const nData = (node.data as { node?: GraphNode })?.node;
                switch (nData?.node_type) {
                  case "education":
                    return "#3b82f6";
                  case "career":
                    return "#10b981";
                  case "exploration":
                    return "#f59e0b";
                  case "certification":
                    return "#8b5cf6";
                  default:
                    return "#64748b";
                }
              }}
            />
          </ReactFlow>
        </div>
      ) : (
        /* Alternative Card Grid View */
        <div className="grid-cards-container p-4 bg-slate-50/50 rounded-2xl border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cardsFilteredNodes.map((node) => {
              const isSelected = selectedNodeId === node.node_id;
              const isMarkedForExpansion = expansionNodeIds.has(node.node_id);

              return (
                <div
                  key={node.node_id}
                  className={`graph-node-card cursor-pointer p-4 bg-white rounded-xl border-2 transition-all ${
                    isSelected
                      ? "ring-2 ring-blue-500 border-blue-500 shadow-md"
                      : isMarkedForExpansion
                      ? "ring-2 ring-purple-500 border-purple-400"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                  onClick={() => setSelectedNodeId(node.node_id)}
                >
                  <div className="node-card-top-bar flex items-center justify-between mb-2">
                    <span
                      className={`node-type-pill text-xs px-2 py-0.5 rounded font-semibold uppercase ${getNodeTypeBadgeClass(
                        node.node_type
                      )}`}
                    >
                      {node.node_type}
                    </span>

                    <label
                      className="node-expand-checkbox flex items-center gap-1.5 text-xs text-slate-600 font-medium cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isMarkedForExpansion}
                        onChange={() => toggleExpansionSelect(node.node_id)}
                        className="rounded text-purple-600"
                      />
                      <span>Expand</span>
                    </label>
                  </div>

                  <h4 className="node-card-title font-bold text-slate-800 text-sm mb-1">
                    {node.title}
                  </h4>
                  <p className="node-card-desc-snippet text-xs text-slate-600 line-clamp-2 mb-3">
                    {node.description}
                  </p>

                  <div className="node-card-metrics flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="metric-pill bg-slate-100 px-2 py-0.5 rounded">
                      ⏱ {formatDuration(node.duration_estimate_months)}
                    </span>
                    <span className="metric-pill bg-slate-100 px-2 py-0.5 rounded">
                      💳 {formatCost(node.cost_estimate, node.cost_currency)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Right-Side Slide-Over Node Details Drawer */}
      <NodeInspectorDrawer
        node={inspectedNode}
        graph={graph}
        isOpen={Boolean(selectedNodeId && inspectedNode)}
        onClose={() => setSelectedNodeId(null)}
        onSelectNode={(id: string) => setSelectedNodeId(id)}
        isMarkedForExpansion={
          selectedNodeId ? expansionNodeIds.has(selectedNodeId) : false
        }
        onToggleExpansion={(id: string) => toggleExpansionSelect(id)}
        onExpandDirectly={handleExpandDirectlyFromDrawer}
        isExpanding={isExpanding}
      />
    </div>
  );
};

export const GraphExplorer: React.FC<GraphExplorerProps> = ({
  graph,
  loading,
  error,
  onGenerateInitial,
  onExpandGraph,
  isExpanding,
  onReturnToProfile,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [expansionNodeIds, setExpansionNodeIds] = useState<Set<string>>(
    new Set()
  );
  const [intent, setIntent] = useState<GenerationIntent>("continue");
  const [candidateCount, setCandidateCount] = useState<number>(3);
  const [categoryFilter, setCategoryFilter] = useState<NodeType | "all">(
    "all"
  );
  const [viewMode, setViewMode] = useState<"roadmap" | "cards">("roadmap");

  const toggleExpansionSelect = useCallback((nodeId: string) => {
    setExpansionNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const clearExpansionSelection = useCallback(() => {
    setExpansionNodeIds(new Set());
  }, []);

  return (
    <div className="graph-explorer-container">
      {/* Top Header Bar */}
      <div className="explorer-header-bar">
        <div>
          <button
            className="secondary-button back-to-profile-btn"
            onClick={onReturnToProfile}
          >
            ← Back to Profile & Setup
          </button>
          <h2>Interactive AI Pathway Roadmap</h2>
          <p>
            Explore branching education-to-career options, inspect entry
            requirements, and dynamically expand target pathways.
          </p>
        </div>

        {graph && (
          <div className="graph-stats-summary">
            <div className="stat-item">
              <span className="stat-label">Total Stages</span>
              <span className="stat-value">{graph.nodes.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Transitions</span>
              <span className="stat-value">{graph.edges.length}</span>
            </div>
            {graph.target_outcome && (
              <div className="stat-item outcome-stat">
                <span className="stat-label">Focus</span>
                <span className="stat-value">{graph.target_outcome}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="explorer-error-banner" role="alert">
          <strong>Error: </strong> {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="explorer-loading-state">
          <div className="loading-spinner"></div>
          <h3>Simulating AI Pathway Graph...</h3>
          <p>
            Analyzing academic profile, calculating realistic progression
            routes, and verifying acyclic prerequisite integrity.
          </p>
        </div>
      )}

      {/* Empty State */}
      {!loading && (!graph || graph.nodes.length === 0) && (
        <div className="explorer-empty-state">
          <div className="empty-icon">🕸️</div>
          <h3>No Pathway Graph Generated Yet</h3>
          <p>
            Ready to generate a tailored education and career simulation based
            on your student profile snapshot.
          </p>

          <div className="initial-gen-controls">
            <div className="control-group">
              <label>Initial Intent:</label>
              <select
                value={intent}
                onChange={(e) =>
                  setIntent(e.target.value as GenerationIntent)
                }
              >
                <option value="explore_alternatives">
                  Explore Parallel Alternatives
                </option>
                <option value="continue">Forward Progression</option>
                <option value="recover_from_blocked_route">
                  Alternate Detours & Bridge Routes
                </option>
              </select>
            </div>

            <div className="control-group">
              <label>Initial Stages Count:</label>
              <select
                value={candidateCount}
                onChange={(e) => setCandidateCount(Number(e.target.value))}
              >
                <option value="3">3 Stages</option>
                <option value="4">4 Stages</option>
                <option value="5">5 Stages</option>
              </select>
            </div>

            <button
              className="primary-button"
              onClick={() => onGenerateInitial(intent, candidateCount)}
            >
              Generate AI Pathway Graph
            </button>
          </div>
        </div>
      )}

      {/* Main Roadmap & Drawer Workspace */}
      {!loading && graph && graph.nodes.length > 0 && (
        <ReactFlowProvider>
          <RoadmapWorkspace
            graph={graph}
            selectedNodeId={selectedNodeId}
            setSelectedNodeId={setSelectedNodeId}
            expansionNodeIds={expansionNodeIds}
            toggleExpansionSelect={toggleExpansionSelect}
            clearExpansionSelection={clearExpansionSelection}
            intent={intent}
            setIntent={setIntent}
            candidateCount={candidateCount}
            setCandidateCount={setCandidateCount}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onExpandGraph={onExpandGraph}
            isExpanding={isExpanding}
            onReturnToProfile={onReturnToProfile}
          />
        </ReactFlowProvider>
      )}
    </div>
  );
};
