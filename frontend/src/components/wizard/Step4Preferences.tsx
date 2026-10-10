import React from 'react';
import { 
  StudentProfileCreate, 
  PriorityType, 
  StudyDestination, 
  CareerCertainty, 
  BudgetStatus 
} from '../../types/studentProfile';
import { 
  PRIORITY_OPTIONS, 
  DESTINATION_OPTIONS, 
  CERTAINTY_OPTIONS, 
  BUDGET_STATUS_LABELS 
} from '../../data/wizardOptions';
import { IndianRupee, Globe, Check } from 'lucide-react';

interface Step4Props {
  profile: StudentProfileCreate;
  onChange: (updates: Partial<StudentProfileCreate>) => void;
  errors?: Record<string, string>;
}

export const Step4Preferences: React.FC<Step4Props> = ({ profile, onChange, errors }) => {
  const togglePriority = (p: PriorityType) => {
    let updated: PriorityType[];
    if (profile.priorities.includes(p)) {
      updated = profile.priorities.filter((item) => item !== p);
    } else {
      updated = Array.from(new Set([...profile.priorities, p]));
    }
    onChange({ priorities: updated });
  };

  const currentAmount = profile.annual_budget.amount;
  const currentStatus = profile.annual_budget.budget_status;

  const handleBudgetAmountChange = (val: string) => {
    const num = val === '' ? null : Math.max(0, Number(val));
    onChange({
      annual_budget: {
        currency: 'INR',
        amount: num,
        budget_status: num === null ? 'not_sure' : currentStatus === 'not_sure' ? 'estimated' : currentStatus,
      },
    });
  };

  const handleBudgetStatusChange = (status: BudgetStatus) => {
    onChange({
      annual_budget: {
        currency: 'INR',
        amount: status === 'not_sure' ? null : currentAmount,
        budget_status: status,
      },
    });
  };

  const presetBudgetAmounts = [
    { label: 'Under ₹50,000', amount: 45000 },
    { label: '₹50,000 – ₹1,50,000', amount: 100000 },
    { label: '₹1,50,000 – ₹3,50,000', amount: 250000 },
    { label: '₹3,50,000 – ₹8,00,000', amount: 500000 },
    { label: 'Above ₹8,00,000', amount: 1000000 },
  ];

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="border-b border-[#DCEBEA] pb-5">
        <h2 className="font-serif-heading text-2xl sm:text-3xl font-bold text-[#376E7D] tracking-tight">
          Step 4: Preferences & Budget
        </h2>
        <p className="text-sm text-[#5E8085] mt-1 leading-relaxed">
          Help us understand practical parameters like budget comfort, scholarships, and preferred study locations. We do not ask for exact household income or banking details.
        </p>
      </div>

      {/* 1. Annual Budget in INR */}
      <section className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-[#C9E6F8] text-[#367BA8]">
              <IndianRupee className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-[#376E7D]">
              Approximate Annual Education Budget (INR)
            </h3>
          </div>
          <p className="text-xs text-[#5E8085] mt-0.5">
            Expected annual investment for tuition, materials, and coaching for the next educational stage.
          </p>
        </div>

        {/* Budget Status Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['estimated', 'fixed', 'not_sure'] as BudgetStatus[]).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => handleBudgetStatusChange(st)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                currentStatus === st
                  ? 'bg-[#C9E6F8]/50 border-[#367BA8] text-[#376E7D] ring-1 ring-[#367BA8] shadow-2xs'
                  : 'bg-white border-[#DCEBEA] text-[#5E8085] hover:bg-[#F5FAF9]'
              }`}
            >
              <div className="font-semibold text-xs text-[#376E7D]">
                {BUDGET_STATUS_LABELS[st]}
              </div>
            </button>
          ))}
        </div>

        {/* Amount Input and Quick Preset Chips */}
        {currentStatus !== 'not_sure' && (
          <div className="p-4 rounded-xl bg-white border border-[#DCEBEA] space-y-3">
            <label className="block text-xs font-semibold text-[#376E7D]">
              Annual Amount (in INR ₹)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#5E8085] text-sm">
                ₹
              </span>
              <input
                type="number"
                min={0}
                value={currentAmount !== null ? currentAmount : ''}
                onChange={(e) => handleBudgetAmountChange(e.target.value)}
                placeholder="e.g. 100000"
                className="w-full pl-8 pr-4 py-2 bg-[#F5FAF9] border border-[#DCEBEA] rounded-lg text-sm font-mono text-[#376E7D] focus:outline-hidden focus:ring-2 focus:ring-[#367BA8]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] text-[#5E8085]">Quick presets:</span>
              {presetBudgetAmounts.map((preset) => (
                <button
                  key={preset.amount}
                  type="button"
                  onClick={() => handleBudgetAmountChange(String(preset.amount))}
                  className="px-2.5 py-1 text-[11px] font-medium bg-[#C9E6F8]/60 text-[#367BA8] hover:bg-[#C9E6F8] border border-[#A7D9E6] rounded-md transition-colors cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 2. Funding Preferences */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-[#DCEBEA]">
        {/* Scholarships */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-[#376E7D]">
            Scholarship / Financial Assistance Interest
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                onChange({
                  funding_preferences: {
                    ...profile.funding_preferences,
                    interested_in_scholarships: true,
                  },
                })
              }
              className={`p-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer text-center ${
                profile.funding_preferences.interested_in_scholarships
                  ? 'bg-[#CDEDE2]/40 border-[#278F89] text-[#278F89] font-semibold'
                  : 'bg-white border-[#DCEBEA] text-[#5E8085] hover:bg-[#F5FAF9]'
              }`}
            >
              Interested in Scholarships
            </button>
            <button
              type="button"
              onClick={() =>
                onChange({
                  funding_preferences: {
                    ...profile.funding_preferences,
                    interested_in_scholarships: false,
                  },
                })
              }
              className={`p-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer text-center ${
                !profile.funding_preferences.interested_in_scholarships
                  ? 'bg-[#C9E6F8]/50 border-[#367BA8] text-[#367BA8] font-semibold'
                  : 'bg-white border-[#DCEBEA] text-[#5E8085] hover:bg-[#F5FAF9]'
              }`}
            >
              Not Needed
            </button>
          </div>
        </div>

        {/* Loans */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-[#376E7D]">
            Openness to Education Loans (Optional)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                onChange({
                  funding_preferences: {
                    ...profile.funding_preferences,
                    willing_to_consider_loans: true,
                  },
                })
              }
              className={`p-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer text-center ${
                profile.funding_preferences.willing_to_consider_loans
                  ? 'bg-[#C9E6F8]/50 border-[#367BA8] text-[#367BA8] font-semibold'
                  : 'bg-white border-[#DCEBEA] text-[#5E8085] hover:bg-[#F5FAF9]'
              }`}
            >
              Open to Considering
            </button>
            <button
              type="button"
              onClick={() =>
                onChange({
                  funding_preferences: {
                    ...profile.funding_preferences,
                    willing_to_consider_loans: false,
                  },
                })
              }
              className={`p-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer text-center ${
                !profile.funding_preferences.willing_to_consider_loans
                  ? 'bg-[#C9E6F8]/50 border-[#367BA8] text-[#367BA8] font-semibold'
                  : 'bg-white border-[#DCEBEA] text-[#5E8085] hover:bg-[#F5FAF9]'
              }`}
            >
              Prefer Not To
            </button>
          </div>
        </div>
      </section>

      {/* 3. Preferred Study Destination */}
      <section className="space-y-3 pt-4 border-t border-[#DCEBEA]">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#367BA8]" />
          <h3 className="text-base font-bold text-[#376E7D]">
            Preferred Study Destination
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {DESTINATION_OPTIONS.map((d) => {
            const isSelected = profile.preferred_destination === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => onChange({ preferred_destination: d.id })}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#C9E6F8]/50 border-[#367BA8] ring-1 ring-[#367BA8] shadow-2xs'
                    : 'bg-white border-[#DCEBEA] text-[#5E8085] hover:border-[#367BA8]'
                }`}
              >
                <div className="font-semibold text-xs text-[#376E7D] mb-1">
                  {d.label}
                </div>
                <p className="text-[11px] text-[#5E8085] leading-normal">
                  {d.desc}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Priorities */}
      <section className="space-y-3 pt-4 border-t border-[#DCEBEA]">
        <div>
          <h3 className="text-base font-bold text-[#376E7D]">
            What Matters Most To You? (Your Priorities)
          </h3>
          <p className="text-xs text-[#5E8085] mt-0.5">
            Select the factors that will guide your educational decisions.
          </p>
        </div>

        {errors?.priorities && (
          <p className="text-xs text-rose-600 font-medium">{errors.priorities}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {PRIORITY_OPTIONS.map((item) => {
            const isChecked = profile.priorities.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => togglePriority(item.id)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 shadow-2xs ${
                  isChecked
                    ? 'bg-[#C9E6F8]/50 border-[#367BA8] text-[#376E7D] font-semibold'
                    : 'bg-white border-[#DCEBEA] text-[#5E8085] hover:border-[#367BA8]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-md border shrink-0 mt-0.5 flex items-center justify-center ${
                    isChecked
                      ? 'bg-[#367BA8] border-[#367BA8] text-white'
                      : 'border-slate-300'
                  }`}
                >
                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div>
                  <div className="text-xs font-bold leading-tight">{item.label}</div>
                  <div className="text-[10px] text-[#5E8085] font-normal mt-0.5">{item.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 5. Career Certainty */}
      <section className="space-y-3 pt-4 border-t border-[#DCEBEA]">
        <div>
          <h3 className="text-base font-bold text-[#376E7D]">
            Career Certainty
          </h3>
          <p className="text-xs text-[#5E8085] mt-0.5">
            How clear do you currently feel about your long-term occupational destination?
          </p>
        </div>

        <div className="space-y-2.5">
          {CERTAINTY_OPTIONS.map((c) => {
            const isSelected = profile.career_certainty === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onChange({ career_certainty: c.id })}
                className={`w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-[#C9E6F8]/50 border-[#367BA8] ring-1 ring-[#367BA8] shadow-2xs'
                    : 'bg-white border-[#DCEBEA] text-[#5E8085] hover:bg-[#F5FAF9]'
                }`}
              >
                <div className="pr-4">
                  <div className="text-sm font-semibold text-[#376E7D]">{c.label}</div>
                  <div className="text-xs text-[#5E8085] mt-0.5">{c.desc}</div>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border shrink-0 flex items-center justify-center ${
                    isSelected ? 'border-[#367BA8] bg-[#367BA8]' : 'border-slate-300'
                  }`}
                >
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
