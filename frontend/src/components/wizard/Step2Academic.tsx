import React, { useState } from 'react';
import { StudentProfileCreate, SubjectIn, ResultStatus } from '../../types/studentProfile';
import { RESULT_STATUS_LABELS } from '../../data/wizardOptions';
import { Plus, Trash2, Heart, AlertCircle, BookOpen, Calculator } from 'lucide-react';

interface Step2Props {
  profile: StudentProfileCreate;
  onChange: (updates: Partial<StudentProfileCreate>) => void;
  errors?: Record<string, string>;
}

export const Step2Academic: React.FC<Step2Props> = ({ profile, onChange, errors }) => {
  const [newSubjectName, setNewSubjectName] = useState('');

  const handleAddSubject = () => {
    const trimmed = newSubjectName.trim();
    if (!trimmed) return;
    if (profile.subjects.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      return;
    }

    const newSub: SubjectIn = {
      name: trimmed,
      marks: null,
      maximum_marks: 100,
      result_status: 'predicted',
      favourite: false,
      challenging: false,
    };

    onChange({
      subjects: [...profile.subjects, newSub],
    });
    setNewSubjectName('');
  };

  const handleRemoveSubject = (index: number) => {
    const updated = profile.subjects.filter((_, idx) => idx !== index);
    onChange({ subjects: updated });
  };

  const handleUpdateSubject = (index: number, updates: Partial<SubjectIn>) => {
    const updated = profile.subjects.map((s, idx) => (idx === index ? { ...s, ...updates } : s));
    onChange({ subjects: updated });
  };

  const toggleFavourite = (index: number) => {
    const current = profile.subjects[index];
    const isFav = !current.favourite;
    handleUpdateSubject(index, {
      favourite: isFav,
      challenging: isFav ? false : current.challenging,
    });
  };

  const toggleChallenging = (index: number) => {
    const current = profile.subjects[index];
    const isChall = !current.challenging;
    handleUpdateSubject(index, {
      challenging: isChall,
      favourite: isChall ? false : current.favourite,
    });
  };

  const scoredSubjects = profile.subjects.filter(
    (s) => (s.result_status === 'completed' || s.result_status === 'predicted') &&
           typeof s.marks === 'number' && s.marks !== null && (s.maximum_marks || 100) > 0
  );

  const calculatedAverage =
    scoredSubjects.length > 0
      ? (
          (scoredSubjects.reduce((acc, curr) => acc + (curr.marks! / (curr.maximum_marks || 100)) * 100, 0) /
            scoredSubjects.length)
        ).toFixed(1)
      : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-[#DCEBEA] pb-5">
        <h2 className="font-serif-heading text-2xl sm:text-3xl font-bold text-[#376E7D] tracking-tight">
          Step 2: Academic Background
        </h2>
        <p className="text-sm text-[#5E8085] mt-1">
          Record your current or completed school subjects. If your marks are not yet available or you prefer not to enter numbers, you can select &ldquo;Results awaited&rdquo; or &ldquo;Marks unavailable&rdquo;. Missing marks are never treated as zero.
        </p>
      </div>

      {/* Board reminder banner */}
      <div className="p-3.5 rounded-xl bg-[#C9E6F8]/40 border border-[#A7D9E6]/60 text-xs text-[#376E7D] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#367BA8]" />
          <span>
            Curriculum: <strong className="font-semibold">{profile.curriculum}</strong> ({profile.country})
          </span>
        </div>
        <span className="text-[#5E8085] hidden sm:inline">
          Stage: Class 10
        </span>
      </div>

      {/* Subjects Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#376E7D]">
            Class 10 Subjects ({profile.subjects.length})
          </h3>
          <span className="text-xs text-[#5E8085]">
            Add or remove subjects according to your curriculum
          </span>
        </div>

        {errors?.subjects && (
          <p className="text-xs text-rose-600 font-medium">{errors.subjects}</p>
        )}

        <div className="space-y-3">
          {profile.subjects.map((sub, idx) => {
            const hasMarksExceeded = typeof sub.marks === 'number' && typeof sub.maximum_marks === 'number' && sub.marks > sub.maximum_marks;

            return (
              <div
                key={idx}
                className="p-4 rounded-xl bg-white border border-[#DCEBEA] shadow-2xs hover:border-[#367BA8] transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={sub.name}
                      onChange={(e) => handleUpdateSubject(idx, { name: e.target.value.slice(0, 100) })}
                      maxLength={100}
                      className="text-sm font-semibold text-[#376E7D] bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#367BA8] focus:outline-hidden px-1 py-0.5 rounded-xs w-full max-w-sm"
                    />
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Favourite toggle */}
                    <button
                      type="button"
                      onClick={() => toggleFavourite(idx)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                        sub.favourite
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-[#F5FAF9] text-[#5E8085] hover:bg-[#DCEBEA]'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${sub.favourite ? 'fill-rose-500 text-rose-500' : ''}`} />
                      <span>{sub.favourite ? 'Favourite' : 'Mark Fav'}</span>
                    </button>

                    {/* Challenging toggle */}
                    <button
                      type="button"
                      onClick={() => toggleChallenging(idx)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                        sub.challenging
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-[#F5FAF9] text-[#5E8085] hover:bg-[#DCEBEA]'
                      }`}
                    >
                      <AlertCircle className={`w-3.5 h-3.5 ${sub.challenging ? 'text-amber-600' : ''}`} />
                      <span>{sub.challenging ? 'Challenging' : 'Mark Hard'}</span>
                    </button>

                    {/* Delete subject */}
                    {profile.subjects.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSubject(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                        title="Remove subject"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Performance status & numeric entry */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1 items-center">
                  <div className="sm:col-span-6">
                    <label className="block text-[11px] font-medium text-[#5E8085] mb-1">
                      Result Status
                    </label>
                    <select
                      value={sub.result_status}
                      onChange={(e) => {
                        const nextStatus = e.target.value as ResultStatus;
                        handleUpdateSubject(idx, {
                          result_status: nextStatus,
                          marks: (nextStatus === 'awaited' || nextStatus === 'unavailable') ? null : sub.marks,
                        });
                      }}
                      className="w-full px-3 py-1.5 bg-[#F5FAF9] border border-[#DCEBEA] rounded-lg text-xs text-[#376E7D] focus:outline-hidden focus:ring-1 focus:ring-[#367BA8] cursor-pointer"
                    >
                      <option value="completed">{RESULT_STATUS_LABELS.completed}</option>
                      <option value="predicted">{RESULT_STATUS_LABELS.predicted}</option>
                      <option value="awaited">{RESULT_STATUS_LABELS.awaited}</option>
                      <option value="unavailable">{RESULT_STATUS_LABELS.unavailable}</option>
                    </select>
                  </div>

                  {(sub.result_status === 'completed' || sub.result_status === 'predicted') ? (
                    <>
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-medium text-[#5E8085] mb-1">
                          Marks Obtained
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={sub.maximum_marks || 100}
                          value={sub.marks !== null ? sub.marks : ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : Math.max(0, Number(e.target.value));
                            handleUpdateSubject(idx, { marks: val });
                          }}
                          placeholder="e.g. 85"
                          className="w-full px-3 py-1.5 bg-white border border-[#DCEBEA] rounded-lg text-xs font-mono text-[#376E7D] focus:outline-hidden focus:ring-1 focus:ring-[#367BA8]"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-medium text-[#5E8085] mb-1">
                          Maximum Marks
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={sub.maximum_marks || 100}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 100 : Math.max(1, Number(e.target.value));
                            handleUpdateSubject(idx, { maximum_marks: val });
                          }}
                          className="w-full px-3 py-1.5 bg-white border border-[#DCEBEA] rounded-lg text-xs font-mono text-[#376E7D] focus:outline-hidden focus:ring-1 focus:ring-[#367BA8]"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="sm:col-span-6 text-xs text-[#5E8085] italic py-1.5">
                      No numeric score recorded. Not treated as zero.
                    </div>
                  )}
                </div>

                {hasMarksExceeded && (
                  <p className="text-xs text-rose-600 font-medium">
                    Marks ({sub.marks}) cannot exceed maximum marks ({sub.maximum_marks}).
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Add custom subject input */}
        <div className="flex gap-2 pt-2">
          <input
            type="text"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value.slice(0, 100))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddSubject();
              }
            }}
            placeholder="Add subject (e.g. Computer Applications, Sanskrit, Economics)"
            className="flex-1 px-3.5 py-2 text-xs bg-white border border-[#DCEBEA] rounded-xl text-[#376E7D] placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#367BA8]"
          />
          <button
            type="button"
            onClick={handleAddSubject}
            disabled={!newSubjectName.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#367BA8] text-white rounded-xl text-xs font-semibold hover:bg-[#2e688e] disabled:opacity-40 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Subject</span>
          </button>
        </div>
      </div>

      {/* Overall percentage & status */}
      <div className="p-5 rounded-2xl bg-[#F5FAF9] border border-[#DCEBEA] space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#DCEBEA]">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[#367BA8]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#376E7D]">
              Overall Academic Performance
            </h4>
          </div>
          {calculatedAverage && (
            <span className="text-xs font-mono font-medium text-[#367BA8] bg-[#C9E6F8]/60 px-2.5 py-0.5 rounded-md">
              Calculated Avg: {calculatedAverage}%
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#376E7D] mb-1">
              Overall Result Status <span className="text-[#367BA8]">*</span>
            </label>
            <select
              value={profile.overall_result_status}
              onChange={(e) => {
                const status = e.target.value as ResultStatus;
                onChange({
                  overall_result_status: status,
                  overall_percentage: (status === 'awaited' || status === 'unavailable') ? null : profile.overall_percentage,
                });
              }}
              className="w-full px-3 py-2 bg-white border border-[#DCEBEA] rounded-lg text-xs text-[#376E7D] focus:outline-hidden focus:ring-2 focus:ring-[#367BA8] cursor-pointer"
            >
              <option value="completed">{RESULT_STATUS_LABELS.completed}</option>
              <option value="predicted">{RESULT_STATUS_LABELS.predicted}</option>
              <option value="awaited">{RESULT_STATUS_LABELS.awaited}</option>
              <option value="unavailable">{RESULT_STATUS_LABELS.unavailable}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#376E7D] mb-1">
              Overall Percentage (%) <span className="text-xs font-normal text-[#5E8085]">(0 - 100)</span>
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              disabled={profile.overall_result_status === 'awaited' || profile.overall_result_status === 'unavailable'}
              value={profile.overall_percentage !== null ? profile.overall_percentage : ''}
              onChange={(e) => {
                const val = e.target.value === '' ? null : Math.min(100, Math.max(0, parseFloat(e.target.value)));
                onChange({ overall_percentage: val });
              }}
              placeholder={calculatedAverage ? `e.g. ${calculatedAverage}` : 'e.g. 88.5'}
              className="w-full px-3 py-2 bg-white border border-[#DCEBEA] rounded-lg text-xs font-mono text-[#376E7D] focus:outline-hidden focus:ring-2 focus:ring-[#367BA8] disabled:bg-[#F5FAF9] disabled:text-slate-400"
            />
          </div>
        </div>

        <p className="text-[11px] text-[#5E8085]">
          EduPath never uses unreleased marks to penalize students. Unavailable results are clearly distinguished from zero.
        </p>
      </div>
    </div>
  );
};
