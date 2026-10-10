import React from 'react';
import { StudentProfileCreate, EducationBoard, AcademicStatus } from '../../types/studentProfile';
import { INDIAN_STATES, ACADEMIC_STATUS_LABELS } from '../../data/wizardOptions';
import { User, MapPin, Globe2 } from 'lucide-react';

interface Step1Props {
  profile: StudentProfileCreate;
  onChange: (updates: Partial<StudentProfileCreate>) => void;
  errors?: Record<string, string>;
}

export const Step1AboutYou: React.FC<Step1Props> = ({ profile, onChange, errors }) => {
  const boards: { value: EducationBoard; label: string; desc: string }[] = [
    { value: 'CBSE', label: 'CBSE', desc: 'Central Board of Secondary Education' },
    { value: 'ICSE', label: 'ICSE / CISCE', desc: 'Council for the Indian School Certificate Examinations' },
    { value: 'State Board', label: 'State Board', desc: 'State Government Secondary Education Board' },
    { value: 'Other', label: 'Other', desc: 'IB, Cambridge IGCSE, NIOS, or International curriculum' },
  ];

  const statuses: { value: AcademicStatus; label: string; desc: string }[] = [
    {
      value: 'currently_studying',
      label: ACADEMIC_STATUS_LABELS.currently_studying.label,
      desc: ACADEMIC_STATUS_LABELS.currently_studying.desc,
    },
    {
      value: 'awaiting_results',
      label: ACADEMIC_STATUS_LABELS.awaiting_results.label,
      desc: ACADEMIC_STATUS_LABELS.awaiting_results.desc,
    },
    {
      value: 'completed',
      label: ACADEMIC_STATUS_LABELS.completed.label,
      desc: ACADEMIC_STATUS_LABELS.completed.desc,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-[#DCEBEA] pb-5">
        <h2 className="font-serif-heading text-2xl sm:text-3xl font-bold text-[#376E7D] tracking-tight">
          Step 1: About You
        </h2>
        <p className="text-sm text-[#5E8085] mt-1">
          Tell us about your educational background. We do not ask for identity numbers or sensitive personal details.
        </p>
      </div>

      <div className="space-y-6">
        {/* Preferred Display Name */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[#376E7D] uppercase tracking-wider">
            Preferred Name <span className="text-xs font-normal text-[#5E8085] normal-case">(Optional)</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5E8085]">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={profile.preferred_name || ''}
              onChange={(e) => onChange({ preferred_name: e.target.value.slice(0, 80) })}
              placeholder="e.g. Aaryan or Ananya"
              maxLength={80}
              className="w-full pl-10 pr-4 py-2.5 bg-[#F5FAF9] border border-[#DCEBEA] rounded-xl text-[#376E7D] placeholder:text-slate-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#367BA8] focus:bg-white transition-all shadow-2xs"
            />
          </div>
          <p className="text-xs text-[#5E8085]">
            This name will be displayed on your personal Future Profile summary.
          </p>
        </div>

        {/* Location: Country & Region */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#376E7D] uppercase tracking-wider">
              Country <span className="text-[#367BA8]">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5E8085]">
                <Globe2 className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={profile.country}
                onChange={(e) => onChange({ country: e.target.value.slice(0, 100) })}
                placeholder="India"
                maxLength={100}
                className="w-full pl-10 pr-4 py-2.5 bg-[#F5FAF9] border border-[#DCEBEA] rounded-xl text-[#376E7D] text-sm focus:outline-hidden focus:ring-2 focus:ring-[#367BA8] focus:bg-white transition-all shadow-2xs"
              />
            </div>
            {errors?.country && (
              <p className="text-xs text-rose-600 font-medium">{errors.country}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#376E7D] uppercase tracking-wider">
              State / Region
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5E8085]">
                <MapPin className="w-4 h-4" />
              </div>
              <select
                value={profile.region || 'Maharashtra'}
                onChange={(e) => onChange({ region: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-[#F5FAF9] border border-[#DCEBEA] rounded-xl text-[#376E7D] text-sm focus:outline-hidden focus:ring-2 focus:ring-[#367BA8] focus:bg-white transition-all shadow-2xs cursor-pointer"
              >
                {INDIAN_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Education Board Selection */}
        <div className="space-y-3 pt-2">
          <label className="block text-xs font-bold text-[#376E7D] uppercase tracking-wider">
            Curriculum / Education Board <span className="text-[#367BA8]">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {boards.map((b) => {
              const isSelected = profile.curriculum === b.value;
              return (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => onChange({ curriculum: b.value })}
                  className={`p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#C9E6F8]/50 border-[#367BA8] text-[#376E7D] ring-1 ring-[#367BA8] shadow-2xs'
                      : 'bg-white border-[#DCEBEA] text-[#5E8085] hover:border-[#367BA8] hover:bg-[#F5FAF9]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-[#376E7D]">{b.label}</span>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      isSelected ? 'border-[#367BA8] bg-[#367BA8]' : 'border-slate-300'
                    }`}>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <span className="text-xs text-[#5E8085] mt-1">{b.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Academic Status */}
        <div className="space-y-3 pt-2">
          <label className="block text-xs font-bold text-[#376E7D] uppercase tracking-wider">
            Academic Status <span className="text-[#367BA8]">*</span>
          </label>
          <div className="space-y-2.5">
            {statuses.map((s) => {
              const isSelected = profile.academic_status === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => onChange({ academic_status: s.value })}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#CDEDE2]/40 border-[#278F89] ring-1 ring-[#278F89] text-[#376E7D] shadow-2xs'
                      : 'bg-white border-[#DCEBEA] text-[#5E8085] hover:border-[#367BA8] hover:bg-[#F5FAF9]'
                  }`}
                >
                  <div className="pr-4">
                    <div className="font-semibold text-sm text-[#376E7D]">{s.label}</div>
                    <div className="text-xs text-[#5E8085] mt-0.5">{s.desc}</div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border shrink-0 flex items-center justify-center ${
                    isSelected ? 'border-[#278F89] bg-[#278F89]' : 'border-slate-300'
                  }`}>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Preferred Language */}
        <div className="space-y-1.5 pt-2">
          <label className="block text-xs font-bold text-[#376E7D] uppercase tracking-wider">
            Preferred Language <span className="text-xs font-normal text-[#5E8085] normal-case">(Optional)</span>
          </label>
          <input
            type="text"
            value={profile.preferred_language || ''}
            onChange={(e) => onChange({ preferred_language: e.target.value.slice(0, 50) })}
            placeholder="e.g. English, Hindi, Bilingual"
            maxLength={50}
            className="w-full px-4 py-2.5 bg-[#F5FAF9] border border-[#DCEBEA] rounded-xl text-sm text-[#376E7D] focus:outline-hidden focus:ring-2 focus:ring-[#367BA8] focus:bg-white"
          />
        </div>
      </div>
    </div>
  );
};
