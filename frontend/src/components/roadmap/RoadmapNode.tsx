import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GraduationCap, Briefcase, Compass, Award, CheckSquare, Square, Clock, Coins } from 'lucide-react';
import type { GraphNode, NodeType } from '../../types/pathwayGraph';

export interface RoadmapNodeData {
  node: GraphNode;
  isInspected?: boolean;
  isMarkedForExpansion?: boolean;
  isDimmed?: boolean;
  onSelectNode?: (nodeId: string) => void;
  onToggleExpansion?: (nodeId: string) => void;
}

const CATEGORY_STYLES: Record<
  NodeType,
  {
    badge: string;
    label: string;
    cardBorder: string;
    cardBg: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
  }
> = {
  education: {
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    label: 'Education',
    cardBorder: 'border-blue-200 hover:border-blue-400',
    cardBg: 'bg-white hover:bg-blue-50/30',
    icon: GraduationCap,
    accentColor: '#3b82f6',
  },
  career: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    label: 'Career',
    cardBorder: 'border-emerald-200 hover:border-emerald-400',
    cardBg: 'bg-white hover:bg-emerald-50/30',
    icon: Briefcase,
    accentColor: '#10b981',
  },
  exploration: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    label: 'Exploration',
    cardBorder: 'border-amber-200 hover:border-amber-400',
    cardBg: 'bg-white hover:bg-amber-50/30',
    icon: Compass,
    accentColor: '#f59e0b',
  },
  certification: {
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    label: 'Certification',
    cardBorder: 'border-purple-200 hover:border-purple-400',
    cardBg: 'bg-white hover:bg-purple-50/30',
    icon: Award,
    accentColor: '#8b5cf6',
  },
};

export const RoadmapNode = memo(({ data }: NodeProps) => {
  const nodeData = data as unknown as RoadmapNodeData;
  const { node, isInspected, isMarkedForExpansion, isDimmed, onSelectNode, onToggleExpansion } = nodeData;

  const styleConfig = CATEGORY_STYLES[node.node_type] || CATEGORY_STYLES.education;
  const CategoryIcon = styleConfig.icon;

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectNode?.(node.node_id);
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpansion?.(node.node_id);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`relative w-[260px] min-h-[110px] rounded-2xl border-2 p-3 text-left transition-all duration-200 cursor-pointer shadow-xs select-none ${
        styleConfig.cardBg
      } ${
        isInspected
          ? 'ring-3 ring-blue-500 border-blue-500 shadow-md scale-[1.02] z-30'
          : isMarkedForExpansion
          ? 'ring-2 ring-purple-500 border-purple-400 shadow-xs'
          : styleConfig.cardBorder
      } ${isDimmed ? 'opacity-30 grayscale-[40%]' : 'opacity-100'}`}
    >
      {/* Target Handle (Left) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-slate-400 hover:!bg-blue-600 !border-2 !border-white transition-colors"
      />

      {/* Top Meta Bar */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border tracking-wide uppercase ${styleConfig.badge}`}
        >
          <CategoryIcon className="w-3 h-3" />
          <span>{styleConfig.label}</span>
        </span>

        {/* Expansion Selection Toggle */}
        <button
          type="button"
          onClick={handleCheckboxClick}
          title={isMarkedForExpansion ? 'Selected for expansion' : 'Click to select for expansion'}
          className={`p-0.5 rounded hover:bg-slate-100 transition-colors cursor-pointer ${
            isMarkedForExpansion ? 'text-purple-600 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {isMarkedForExpansion ? (
            <CheckSquare className="w-4 h-4 fill-purple-100 text-purple-600" />
          ) : (
            <Square className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Node Title */}
      <h4
        className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug mb-2 group-hover:text-blue-600"
        title={node.title}
      >
        {node.title}
      </h4>

      {/* Metadata Badges */}
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
        {node.duration_estimate_months !== null && node.duration_estimate_months !== undefined && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
            <Clock className="w-2.5 h-2.5" />
            <span>
              {node.duration_estimate_months >= 12
                ? `${(node.duration_estimate_months / 12).toFixed(1).replace('.0', '')}y`
                : `${node.duration_estimate_months}m`}
            </span>
          </span>
        )}

        {node.cost_estimate !== null && node.cost_estimate !== undefined && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
            <Coins className="w-2.5 h-2.5" />
            <span>
              {node.cost_currency ? `${node.cost_currency} ` : ''}
              {node.cost_estimate >= 1000
                ? `${(node.cost_estimate / 1000).toFixed(0)}k`
                : node.cost_estimate}
            </span>
          </span>
        )}

        {node.prerequisite_node_ids && node.prerequisite_node_ids.length > 0 && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/60 font-medium">
            {node.prerequisite_node_ids.length} prereq
          </span>
        )}
      </div>

      {/* Source Handle (Right) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-slate-400 hover:!bg-blue-600 !border-2 !border-white transition-colors"
      />
    </div>
  );
});

RoadmapNode.displayName = 'RoadmapNode';
