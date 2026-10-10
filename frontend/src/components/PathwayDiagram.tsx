import React from 'react';
import { FlaskConical, BarChart3, BookOpen, Wrench, Sparkles, CheckCircle2 } from 'lucide-react';

interface BranchPathway {
  id: string;
  title: string;
  tagline: string;
  subtext: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  cardBg: string;
  cardBorder: string;
  badgeBg: string;
}

const PATHWAYS: BranchPathway[] = [
  {
    id: 'science',
    title: 'Science',
    tagline: 'Discover · Innovate · Create',
    subtext: 'Physics, Chemistry, Math & Biology',
    icon: FlaskConical,
    accentColor: '#367BA8',
    cardBg: 'bg-white hover:bg-[#F5FAF9]',
    cardBorder: 'border-[#DCEBEA] hover:border-[#367BA8]',
    badgeBg: 'bg-[#C9E6F8] text-[#367BA8]',
  },
  {
    id: 'commerce',
    title: 'Commerce',
    tagline: 'Build · Manage · Lead',
    subtext: 'Finance, Accountancy, Economics & Business',
    icon: BarChart3,
    accentColor: '#367BA8',
    cardBg: 'bg-white hover:bg-[#F5FAF9]',
    cardBorder: 'border-[#DCEBEA] hover:border-[#367BA8]',
    badgeBg: 'bg-[#A7D9E6] text-[#376E7D]',
  },
  {
    id: 'humanities',
    title: 'Humanities',
    tagline: 'Express · Understand · Create Change',
    subtext: 'Social Sciences, Literature, Psychology & Law',
    icon: BookOpen,
    accentColor: '#278F89',
    cardBg: 'bg-white hover:bg-[#F5FAF9]',
    cardBorder: 'border-[#DCEBEA] hover:border-[#278F89]',
    badgeBg: 'bg-[#CDEDE2] text-[#278F89]',
  },
  {
    id: 'diploma',
    title: 'Diploma & Vocational',
    tagline: 'Learn Skills · Build Careers · Make an Impact',
    subtext: 'Polytechnic Engineering & Industry Trades',
    icon: Wrench,
    accentColor: '#278F89',
    cardBg: 'bg-white hover:bg-[#F5FAF9]',
    cardBorder: 'border-[#DCEBEA] hover:border-[#278F89]',
    badgeBg: 'bg-[#CDEDE2] text-[#278F89]',
  },
];

export const PathwayDiagram: React.FC = () => {
  return (
    <div className="relative w-full rounded-3xl bg-white border border-[#DCEBEA] p-5 sm:p-7 shadow-xs">
      {/* Top Diagram Label */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#DCEBEA] text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#367BA8]" />
          <span className="font-bold text-[#376E7D] tracking-wide uppercase text-[11px]">
            Post-Class 10 Possibility Map
          </span>
        </div>
        <span className="text-[#5E8085] text-[11px]">
          Illustrative Pathway Framework
        </span>
      </div>

      {/* Main Diagram Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Central Foundation Node: Class 10 */}
        <div className="md:col-span-4 flex flex-col items-center justify-center text-center p-5 rounded-2xl bg-[#C9E6F8]/60 border border-[#A7D9E6]/60">
          <div className="w-12 h-12 rounded-2xl bg-[#367BA8] text-white flex items-center justify-center font-bold text-lg shadow-2xs mb-2">
            10
          </div>
          <div className="text-[11px] font-bold text-[#367BA8] uppercase tracking-wider">
            Starting Milestone
          </div>
          <h3 className="font-serif-heading text-lg font-bold text-[#376E7D] mt-0.5">
            Class 10
          </h3>
          <p className="text-[11px] text-[#5E8085] mt-1 leading-snug">
            All educational routes branch outward from your current foundation.
          </p>
        </div>

        {/* 4 Pastel Pathway Cards */}
        <div className="md:col-span-8 space-y-2.5">
          {PATHWAYS.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.id}
                className={`p-3 rounded-2xl border ${p.cardBorder} ${p.cardBg} transition-all duration-150 flex items-center justify-between gap-3 shadow-2xs`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${p.badgeBg}`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-[#376E7D] truncate">
                        {p.title}
                      </h4>
                      <span className="text-[10px] text-[#5E8085] hidden sm:inline">
                        — {p.tagline}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5E8085] truncate">
                      {p.subtext}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-[#DCEBEA]">
                  <CheckCircle2 className="w-4 h-4 text-[#A7D9E6]" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reassurance Footer note */}
      <div className="mt-4 pt-3 border-t border-[#DCEBEA] flex items-center justify-between text-[11px] text-[#5E8085]">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#278F89]" />
          <span>Illustrative options to explore — not personalized recommendations.</span>
        </span>
        <span className="hidden sm:inline font-mono text-[10px] text-[#5E8085]">
          EduPath Discovery
        </span>
      </div>
    </div>
  );
};
