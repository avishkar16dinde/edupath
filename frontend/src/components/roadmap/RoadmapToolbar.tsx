import React from 'react';
import {
  Sparkles,
  Maximize2,
  RotateCcw,
  LayoutGrid,
  Map as MapIcon,
  Filter,
  CheckSquare,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import type { GenerationIntent, NodeType } from '../../types/pathwayGraph';

interface RoadmapToolbarProps {
  categoryFilter: NodeType | 'all';
  onCategoryFilterChange: (cat: NodeType | 'all') => void;
  nodeCounts: Record<NodeType | 'all', number>;
  selectedExpansionCount: number;
  intent: GenerationIntent;
  onIntentChange: (intent: GenerationIntent) => void;
  candidateCount: number;
  onCandidateCountChange: (count: number) => void;
  onExpandSelected: () => void;
  onClearExpansionSelection: () => void;
  isExpanding: boolean;
  onFitView: () => void;
  onResetView: () => void;
  viewMode: 'roadmap' | 'cards';
  onViewModeChange: (mode: 'roadmap' | 'cards') => void;
  onReturnToProfile: () => void;
}

export const RoadmapToolbar: React.FC<RoadmapToolbarProps> = ({
  categoryFilter,
  onCategoryFilterChange,
  nodeCounts,
  selectedExpansionCount,
  intent,
  onIntentChange,
  candidateCount,
  onCandidateCountChange,
  onExpandSelected,
  onClearExpansionSelection,
  isExpanding,
  onFitView,
  onResetView,
  viewMode,
  onViewModeChange,
  onReturnToProfile,
}) => {
  return (
    <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
      {/* Left: Category Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1 shrink-0">
          <Filter className="w-3 h-3 text-slate-400" />
          Filter:
        </span>

        {(
          [
            { id: 'all', label: 'All' },
            { id: 'education', label: 'Education' },
            { id: 'career', label: 'Career' },
            { id: 'certification', label: 'Certifications' },
            { id: 'exploration', label: 'Exploration' },
          ] as const
        ).map((item) => {
          const count = nodeCounts[item.id] || 0;
          const isActive = categoryFilter === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onCategoryFilterChange(item.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              <span>{item.label}</span>
              <span
                className={`text-[10px] px-1 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Center: Expansion Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {selectedExpansionCount > 0 ? (
          <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-xl animate-in fade-in">
            <span className="text-[11px] font-bold text-purple-900 flex items-center gap-1">
              <CheckSquare className="w-3.5 h-3.5 text-purple-700" />
              {selectedExpansionCount} Selected
            </span>

            <select
              value={intent}
              onChange={(e) => onIntentChange(e.target.value as GenerationIntent)}
              className="bg-white border border-purple-200 rounded-lg px-2 py-0.5 text-xs text-slate-800 font-medium"
            >
              <option value="continue">Continue</option>
              <option value="explore_alternatives">Alternatives</option>
              <option value="recover_from_blocked_route">Recovery</option>
            </select>

            <select
              value={candidateCount}
              onChange={(e) => onCandidateCountChange(Number(e.target.value))}
              className="bg-white border border-purple-200 rounded-lg px-2 py-0.5 text-xs text-slate-800 font-medium"
            >
              <option value={2}>+2</option>
              <option value={3}>+3</option>
              <option value={4}>+4</option>
              <option value={5}>+5</option>
            </select>

            <button
              onClick={onExpandSelected}
              disabled={isExpanding}
              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold rounded-lg text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
            >
              {isExpanding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Expand</span>
            </button>

            <button
              onClick={onClearExpansionSelection}
              className="text-[11px] text-purple-700 hover:text-purple-950 font-medium underline px-1 cursor-pointer"
            >
              Clear
            </button>
          </div>
        ) : (
          <span className="text-[11px] text-slate-400 italic hidden sm:inline">
            Select node checkbox to expand multiple stages
          </span>
        )}
      </div>

      {/* Right: View & Canvas Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Canvas Tools */}
        {viewMode === 'roadmap' && (
          <>
            <button
              onClick={onFitView}
              title="Fit roadmap to screen"
              className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              aria-label="Fit View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onResetView}
              title="Reset layout & zoom"
              className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              aria-label="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        {/* View Mode Switcher */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            onClick={() => onViewModeChange('roadmap')}
            className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
              viewMode === 'roadmap' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MapIcon className="w-3 h-3" />
            <span className="hidden sm:inline">Roadmap</span>
          </button>
          <button
            onClick={() => onViewModeChange('cards')}
            className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
              viewMode === 'cards' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutGrid className="w-3 h-3" />
            <span className="hidden sm:inline">Cards</span>
          </button>
        </div>

        {/* Return Button */}
        <button
          onClick={onReturnToProfile}
          className="px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3 h-3" />
          <span className="hidden md:inline">Profile</span>
        </button>
      </div>
    </div>
  );
};
