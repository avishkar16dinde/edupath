import React, { useEffect } from 'react';
import {
  X,
  Clock,
  Coins,
  ArrowRight,
  ArrowLeft,
  CheckSquare,
  Square,
  Sparkles,
  GraduationCap,
  Briefcase,
  Compass,
  Award,
  Link as LinkIcon,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';
import type {
  GraphEdge,
  GraphNode,
  NodeType,
  EdgeType,
  GenerationIntent,
  PathwayGraph,
} from '../../types/pathwayGraph';

interface NodeInspectorDrawerProps {
  node: GraphNode | null;
  graph: PathwayGraph | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
  isMarkedForExpansion: boolean;
  onToggleExpansion: (nodeId: string) => void;
  onExpandDirectly: (nodeId: string, intent: GenerationIntent, count: number) => void;
  isExpanding: boolean;
}

const CATEGORY_BADGES: Record<
  NodeType,
  { label: string; bg: string; text: string; icon: React.ComponentType<{ className?: string }> }
> = {
  education: {
    label: 'Education Stage',
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    icon: GraduationCap,
  },
  career: {
    label: 'Career Outcome',
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
    icon: Briefcase,
  },
  exploration: {
    label: 'Exploration Milestone',
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    icon: Compass,
  },
  certification: {
    label: 'Certification / Skill',
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    icon: Award,
  },
};

const EDGE_TYPE_LABELS: Record<EdgeType, { label: string; badge: string }> = {
  progression: { label: 'Direct Progression', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  alternative: { label: 'Alternative Route', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  conditional: { label: 'Conditional Path', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  dependency: { label: 'Core Dependency', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  prerequisite: { label: 'Prerequisite Requirement', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export const NodeInspectorDrawer: React.FC<NodeInspectorDrawerProps> = ({
  node,
  graph,
  isOpen,
  onClose,
  onSelectNode,
  isMarkedForExpansion,
  onToggleExpansion,
  onExpandDirectly,
  isExpanding,
}) => {
  const [localIntent, setLocalIntent] = React.useState<GenerationIntent>('explore_alternatives');
  const [localCount, setLocalCount] = React.useState<number>(3);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !node) {
    return null;
  }

  const category = CATEGORY_BADGES[node.node_type] || CATEGORY_BADGES.education;
  const CategoryIcon = category.icon;

  // Filter incoming and outgoing connections from current graph
  const incomingEdges: GraphEdge[] =
    graph?.edges.filter((e) => e.target_node_id === node.node_id) || [];
  const outgoingEdges: GraphEdge[] =
    graph?.edges.filter((e) => e.source_node_id === node.node_id) || [];

  const nodesMap = new Map<string, GraphNode>();
  graph?.nodes.forEach((n) => nodesMap.set(n.node_id, n));

  return (
    <>
      {/* Subtle Background Dimming Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-[1.5px] z-40 transition-opacity animate-in fade-in duration-150"
        aria-hidden="true"
      />

      {/* Right-Side Slide-Over Drawer Panel */}
      <aside
        className="fixed top-0 right-0 bottom-0 w-full sm:w-[420px] md:w-[460px] lg:w-[480px] bg-white z-50 shadow-2xl border-l border-slate-200 flex flex-col transform transition-transform duration-200 animate-in slide-in-from-right"
        role="dialog"
        aria-label="Node Details Inspector"
      >
        {/* Drawer Header (Fixed) */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/70 shrink-0">
          <div className="space-y-1.5 min-w-0 pr-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${category.bg} ${category.text}`}
            >
              <CategoryIcon className="w-3.5 h-3.5" />
              <span>{category.label}</span>
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug break-words">
              {node.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer shrink-0"
            aria-label="Close Inspector"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-slate-700">
          {/* Section 1: Full Description */}
          <section className="space-y-2">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Overview & Context
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50/80 p-3.5 rounded-xl border border-slate-100 whitespace-pre-wrap">
              {node.description || 'No detailed description provided for this stage.'}
            </p>
          </section>

          {/* Section 2: Key Information & Estimates */}
          <section className="space-y-2.5">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Key Metrics & Planning Estimates
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                  <Clock className="w-3 h-3 text-slate-400" />
                  Estimated Duration
                </span>
                <span className="text-sm font-bold text-slate-800 mt-1">
                  {node.duration_estimate_months !== null && node.duration_estimate_months !== undefined
                    ? node.duration_estimate_months >= 12
                      ? `${(node.duration_estimate_months / 12).toFixed(1).replace('.0', '')} Years (${node.duration_estimate_months} mos)`
                      : `${node.duration_estimate_months} Months`
                    : 'Flexible / Self-paced'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                  <Coins className="w-3 h-3 text-slate-400" />
                  Estimated Cost
                </span>
                <span className="text-sm font-bold text-slate-800 mt-1">
                  {node.cost_estimate !== null && node.cost_estimate !== undefined
                    ? `${node.cost_currency || '₹'} ${node.cost_estimate.toLocaleString()}`
                    : 'Variable / Verify with institution'}
                </span>
              </div>
            </div>
          </section>

          {/* Section 3: Prerequisites */}
          <section className="space-y-2.5">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Prerequisite Milestones
            </h3>
            {node.prerequisite_node_ids && node.prerequisite_node_ids.length > 0 ? (
              <div className="space-y-1.5">
                {node.prerequisite_node_ids.map((prereqId) => {
                  const prereqNode = nodesMap.get(prereqId);
                  return (
                    <button
                      key={prereqId}
                      onClick={() => onSelectNode(prereqId)}
                      className="w-full text-left p-2.5 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100/70 transition-colors flex items-center justify-between group cursor-pointer"
                    >
                      <div>
                        <span className="text-xs font-bold text-amber-900 group-hover:text-blue-700">
                          {prereqNode?.title || prereqId}
                        </span>
                        <span className="text-[10px] text-amber-700 block">
                          Type: {prereqNode?.node_type || 'stage'}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 text-slate-500 text-xs italic border border-slate-100">
                Direct entry milestone — no prior prerequisites required.
              </div>
            )}
          </section>

          {/* Section 4: Connected Pathways (Incoming & Outgoing Transitions) */}
          <section className="space-y-3">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Connected Pathways
            </h3>

            {/* Incoming Routes */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Incoming Pathways ({incomingEdges.length})
              </span>
              {incomingEdges.length > 0 ? (
                incomingEdges.map((e) => {
                  const src = nodesMap.get(e.source_node_id);
                  const edgeStyle = EDGE_TYPE_LABELS[e.edge_type] || EDGE_TYPE_LABELS.progression;
                  return (
                    <div
                      key={e.edge_id}
                      onClick={() => onSelectNode(e.source_node_id)}
                      className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-800 hover:text-blue-600 flex items-center gap-1.5">
                          <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
                          <span>{src?.title || e.source_node_id}</span>
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${edgeStyle.badge}`}>
                          {edgeStyle.label}
                        </span>
                      </div>
                      {e.condition && (
                        <p className="text-[10px] text-purple-700 italic pl-5">
                          Condition: {e.condition}
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-[11px] text-slate-400 italic">Starting route milestone.</p>
              )}
            </div>

            {/* Outgoing Routes */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Next Progression Stages ({outgoingEdges.length})
              </span>
              {outgoingEdges.length > 0 ? (
                outgoingEdges.map((e) => {
                  const tgt = nodesMap.get(e.target_node_id);
                  const edgeStyle = EDGE_TYPE_LABELS[e.edge_type] || EDGE_TYPE_LABELS.progression;
                  return (
                    <div
                      key={e.edge_id}
                      onClick={() => onSelectNode(e.target_node_id)}
                      className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-800 hover:text-blue-600 flex items-center gap-1.5">
                          <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                          <span>{tgt?.title || e.target_node_id}</span>
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${edgeStyle.badge}`}>
                          {edgeStyle.label}
                        </span>
                      </div>
                      {e.condition && (
                        <p className="text-[10px] text-purple-700 italic pl-5">
                          Condition: {e.condition}
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-[11px] text-slate-400 italic">
                  End of current mapped branch. Expand from this stage to explore next milestones.
                </p>
              )}
            </div>
          </section>

          {/* Section 5: Real Verified Evidence / References (Only if present) */}
          {(Boolean(node.institution_ids?.length) ||
            Boolean(node.evidence_ids?.length) ||
            Boolean(node.milestone_ids?.length)) && (
            <section className="space-y-2">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <LinkIcon className="w-3 h-3 text-slate-400" />
                Verified Reference IDs
              </h3>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1 font-mono text-[10px] text-slate-600">
                {node.institution_ids && node.institution_ids.length > 0 && (
                  <div>Institutions: {node.institution_ids.join(', ')}</div>
                )}
                {node.evidence_ids && node.evidence_ids.length > 0 && (
                  <div>Evidence: {node.evidence_ids.join(', ')}</div>
                )}
                {node.milestone_ids && node.milestone_ids.length > 0 && (
                  <div>Milestones: {node.milestone_ids.join(', ')}</div>
                )}
              </div>
            </section>
          )}

          {/* Section 6: Expansion Actions */}
          <section className="pt-2 border-t border-slate-100 space-y-3">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Explore & Expand from this Stage
            </h3>

            {/* Toggle selection */}
            <button
              type="button"
              onClick={() => onToggleExpansion(node.node_id)}
              className={`w-full py-2.5 px-3.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isMarkedForExpansion
                  ? 'bg-purple-100 border-purple-300 text-purple-800'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {isMarkedForExpansion ? (
                <>
                  <CheckSquare className="w-4 h-4 text-purple-700" />
                  <span>Selected for Multi-Node Expansion</span>
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 text-slate-400" />
                  <span>+ Select for Expansion</span>
                </>
              )}
            </button>

            {/* Direct 1-Click Expansion Trigger */}
            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] text-blue-900 font-semibold">
                <span>Immediate Exploration:</span>
                <span className="text-[10px] text-blue-700 font-normal">Single-node expand</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={localIntent}
                  onChange={(e) => setLocalIntent(e.target.value as GenerationIntent)}
                  className="bg-white border border-blue-200 rounded-lg px-2 py-1.5 text-[11px] text-slate-800 font-medium"
                >
                  <option value="explore_alternatives">Alternatives</option>
                  <option value="continue">Continue Path</option>
                  <option value="recover_from_blocked_route">Recovery Route</option>
                </select>

                <select
                  value={localCount}
                  onChange={(e) => setLocalCount(Number(e.target.value))}
                  className="bg-white border border-blue-200 rounded-lg px-2 py-1.5 text-[11px] text-slate-800 font-medium"
                >
                  <option value={2}>2 Candidates</option>
                  <option value={3}>3 Candidates</option>
                  <option value={4}>4 Candidates</option>
                </select>
              </div>

              <button
                type="button"
                disabled={isExpanding}
                onClick={() => onExpandDirectly(node.node_id, localIntent, localCount)}
                className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isExpanding ? 'Synthesizing...' : 'Expand from this Node Now'}</span>
              </button>
            </div>
          </section>
        </div>
      </aside>
    </>
  );
};
