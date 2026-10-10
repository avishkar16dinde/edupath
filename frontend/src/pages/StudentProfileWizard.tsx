import React, { useState, useEffect } from 'react';
import { StudentProfileCreate, StudentProfileOut } from '../types/studentProfile';
import { storageService } from '../services/storageService';
import { apiService, ApiError } from '../services/apiService';
import { Step1AboutYou } from '../components/wizard/Step1AboutYou';
import { Step2Academic } from '../components/wizard/Step2Academic';
import { Step3Interests } from '../components/wizard/Step3Interests';
import { Step4Preferences } from '../components/wizard/Step4Preferences';
import { Step5Review } from '../components/wizard/Step5Review';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  RotateCcw,
  AlertCircle,
  Info,
} from 'lucide-react';

interface WizardProps {
  initialProfile: StudentProfileCreate;
  onComplete: (profile: StudentProfileOut) => void;
  onExit: () => void;
  existingProfileId?: number | null;
}

interface StepMeta {
  number: number;
  title: string;
  guidance: string;
  tips: string[];
}

const STEPS_CONFIG: StepMeta[] = [
  {
    number: 1,
    title: 'About You',
    guidance: 'Set your geographic & board framework so all guidance matches your actual schooling system.',
    tips: [
      'No personal identity or Aadhaar numbers requested.',
      'Default country is set to India, editable for overseas students.',
      'Curriculum determines subject options and scoring norms.'
    ],
  },
  {
    number: 2,
    title: 'Academic Background',
    guidance: 'Record current or completed subjects. Missing marks or results awaited are never penalized.',
    tips: [
      'You can mark favourite and challenging subjects.',
      'Missing marks are never treated as zero.',
      'Add or remove custom subjects to match your school.'
    ],
  },
  {
    number: 3,
    title: 'Interests & Strengths',
    guidance: 'Explore your curiosities freely. Your written words preserve your voice and nuance.',
    tips: [
      'Pick all activities that bring you genuine excitement.',
      'Rate everyday strengths as personal reflections.',
      'Use the text area at the bottom to share what you love in your own words.'
    ],
  },
  {
    number: 4,
    title: 'Preferences & Budget',
    guidance: 'Help us understand practical parameters like budget comfort, scholarships, and location.',
    tips: [
      'Ranges are approximate; no exact financial disclosures needed.',
      'Select “Not sure yet” if plans are still evolving.',
      'Priorities help balance passion with practical realities.'
    ],
  },
  {
    number: 5,
    title: 'Review Answers',
    guidance: 'Take a final look at your collected answers. You can edit any step with one click before confirming your profile.',
    tips: [
      'Tap Edit on any card to revise specific answers.',
      'Your Future Profile will synthesize this exact snapshot.',
      'Data is synced to the backend database upon confirmation.'
    ],
  },
];

export const StudentProfileWizard: React.FC<WizardProps> = ({
  initialProfile,
  onComplete,
  onExit,
  existingProfileId,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(() => storageService.getLastStep());
  const [profile, setProfile] = useState<StudentProfileCreate>(initialProfile);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Sync draft to local storage
  useEffect(() => {
    storageService.saveDraftProfile(profile);
  }, [profile]);

  // Sync step number
  useEffect(() => {
    storageService.saveLastStep(currentStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  const handleUpdate = (updates: Partial<StudentProfileCreate>) => {
    setProfile((prev) => ({
      ...prev,
      ...updates,
      education_stage: 'class10',
    }));

    // Clear validation errors when fields are touched
    if (updates.country && validationErrors.country) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next.country;
        return next;
      });
    }
    if (updates.subjects && validationErrors.subjects) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next.subjects;
        return next;
      });
    }
  };

  const validateCurrentStep = (): boolean => {
    const errs: Record<string, string> = {};

    if (currentStep === 1) {
      if (!profile.country || !profile.country.trim()) {
        errs.country = 'Country is required.';
      }
    }

    if (currentStep === 2) {
      if (!profile.subjects || profile.subjects.length === 0) {
        errs.subjects = 'Please keep at least one school subject.';
      }
    }

    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) {
      return;
    }
    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else {
      onExit();
    }
  };

  const handleJumpToStep = (stepNum: number) => {
    if (stepNum >= 1 && stepNum <= 5) {
      setCurrentStep(stepNum);
    }
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    // Sanitize payload matching OpenAPI constraints
    const payload: StudentProfileCreate = {
      education_stage: 'class10',
      preferred_name: profile.preferred_name?.trim() ? profile.preferred_name.trim().slice(0, 80) : null,
      country: profile.country.trim().slice(0, 100),
      region: profile.region ? profile.region.trim().slice(0, 100) : null,
      curriculum: profile.curriculum,
      academic_status: profile.academic_status,
      preferred_language: profile.preferred_language?.trim() ? profile.preferred_language.trim().slice(0, 50) : null,
      subjects: profile.subjects.map((s) => ({
        name: s.name.trim().slice(0, 100),
        marks: (s.result_status === 'awaited' || s.result_status === 'unavailable') ? null : s.marks,
        maximum_marks: s.maximum_marks || 100,
        result_status: s.result_status,
        favourite: Boolean(s.favourite),
        challenging: Boolean(s.challenging),
      })),
      overall_percentage: (profile.overall_result_status === 'awaited' || profile.overall_result_status === 'unavailable') 
        ? null 
        : profile.overall_percentage,
      overall_result_status: profile.overall_result_status,
      interests: Array.from(new Set(profile.interests)),
      strengths: profile.strengths.map((st) => ({
        name: st.name,
        rating: st.rating_status === 'not_sure' ? null : st.rating,
        rating_status: st.rating_status,
      })),
      interest_description: profile.interest_description.slice(0, 1000),
      annual_budget: {
        currency: 'INR',
        amount: profile.annual_budget.budget_status === 'not_sure' ? null : profile.annual_budget.amount,
        budget_status: profile.annual_budget.budget_status,
      },
      funding_preferences: {
        interested_in_scholarships: Boolean(profile.funding_preferences.interested_in_scholarships),
        willing_to_consider_loans: Boolean(profile.funding_preferences.willing_to_consider_loans),
      },
      preferred_destination: profile.preferred_destination,
      priorities: Array.from(new Set(profile.priorities)),
      career_certainty: profile.career_certainty,
    };

    try {
      let savedResult: StudentProfileOut;
      if (existingProfileId) {
        try {
          savedResult = await apiService.updateProfile(existingProfileId, payload);
        } catch (updateError) {
          // Only create a new row if the backend confirms the saved row no longer exists.
          if ((updateError as ApiError).statusCode !== 404) throw updateError;
          savedResult = await apiService.createProfile(payload);
        }
      } else {
        savedResult = await apiService.createProfile(payload);
      }

      storageService.saveConfirmedProfile(savedResult);
      onComplete(savedResult);
    } catch (err: any) {
      console.error('Profile could not be saved to the backend:', err);
      const apiErr = err as ApiError;
      const msg = apiErr.message || 'Your profile could not be saved to the database. Please try again.';
      setSubmitError(`${msg} Your profile has not been marked as saved. Please check your connection and try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    const reset = storageService.resetDraft();
    setProfile(reset);
    setCurrentStep(1);
    setShowResetConfirm(false);
  };

  const currentMeta = STEPS_CONFIG[currentStep - 1];

  return (
    <div className="min-h-screen bg-[#F5FAF9] text-[#376E7D] pb-20 bg-edupath-pattern">
      {/* Top Wizard Bar */}
      <div className="sticky top-0 z-40 bg-white border-b border-[#DCEBEA] shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex items-center justify-between gap-4">
            {/* Back button */}
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5E8085] hover:text-[#376E7D] px-2.5 py-1.5 rounded-lg hover:bg-[#F5FAF9] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{currentStep === 1 ? 'Back to Overview' : 'Previous Step'}</span>
            </button>

            {/* Compact step summary */}
            <div className="text-center">
              <span className="text-xs font-medium text-[#5E8085]">
                Step <span className="font-mono text-[#376E7D] font-semibold">{currentStep}</span> of 5
              </span>
              <div className="text-sm font-bold text-[#376E7D] tracking-tight hidden sm:block">
                {currentMeta.title}
              </div>
            </div>

            {/* Reset draft */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowResetConfirm(true)}
                className="text-xs text-slate-400 hover:text-rose-600 px-2 py-1 rounded-md transition-colors cursor-pointer"
                title="Reset answers to defaults"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Progress bar with Blue & Mint palette */}
          <div className="w-full bg-[#CDEDE2]/60 h-1.5 rounded-full overflow-hidden mt-3">
            <div
              className="bg-[#367BA8] h-full transition-all duration-300 rounded-full"
              style={{ width: `${(currentStep / 5) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Wizard Form & Sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Form Area */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-[#DCEBEA] p-6 sm:p-10 shadow-2xs">
            {currentStep === 1 && (
              <Step1AboutYou
                profile={profile}
                onChange={handleUpdate}
                errors={validationErrors}
              />
            )}
            {currentStep === 2 && (
              <Step2Academic
                profile={profile}
                onChange={handleUpdate}
                errors={validationErrors}
              />
            )}
            {currentStep === 3 && (
              <Step3Interests
                profile={profile}
                onChange={handleUpdate}
                errors={validationErrors}
              />
            )}
            {currentStep === 4 && (
              <Step4Preferences
                profile={profile}
                onChange={handleUpdate}
                errors={validationErrors}
              />
            )}
            {currentStep === 5 && (
              <div className="space-y-6">
                <Step5Review
                  profile={profile}
                  onEditStep={handleJumpToStep}
                  onSubmit={handleFinalSubmit}
                  isSubmitting={isSubmitting}
                  submitError={submitError}
                />


              </div>
            )}

            {/* Bottom Nav Controls */}
            {currentStep < 5 && (
              <div className="pt-10 mt-10 border-t border-[#DCEBEA] flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-5 py-2.5 text-xs font-semibold text-[#5E8085] bg-[#F5FAF9] hover:bg-[#C9E6F8]/40 border border-[#DCEBEA] rounded-xl transition-colors cursor-pointer"
                >
                  {currentStep === 1 ? 'Cancel & Return' : 'Back'}
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 px-7 py-3 text-sm font-semibold text-white bg-[#367BA8] hover:bg-[#2e688e] active:scale-98 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Desktop Right Sidebar */}
          <aside className="hidden lg:block lg:col-span-4 space-y-6 sticky top-24">
            {/* Step Directory */}
            <div className="bg-white rounded-2xl border border-[#DCEBEA] p-5 shadow-2xs space-y-3">
              <h4 className="text-xs font-bold text-[#376E7D] uppercase tracking-wider">
                Discovery Steps
              </h4>
              <div className="space-y-1.5">
                {STEPS_CONFIG.map((step) => {
                  const isCurrent = step.number === currentStep;
                  const isPassed = step.number < currentStep;

                  return (
                    <button
                      key={step.number}
                      type="button"
                      onClick={() => handleJumpToStep(step.number)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium text-left transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-[#C9E6F8]/60 text-[#367BA8] font-semibold border border-[#A7D9E6]'
                          : isPassed
                          ? 'text-[#376E7D] hover:bg-[#F5FAF9]'
                          : 'text-[#5E8085] hover:bg-[#F5FAF9]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                            isCurrent
                              ? 'bg-[#367BA8] text-white'
                              : isPassed
                              ? 'bg-[#CDEDE2] text-[#278F89]'
                              : 'bg-slate-100 text-[#5E8085]'
                          }`}
                        >
                          {isPassed ? <Check className="w-3.5 h-3.5" /> : step.number}
                        </div>
                        <span>{step.title}</span>
                      </div>
                      {isCurrent && (
                        <span className="text-[10px] text-[#367BA8] font-bold uppercase tracking-wider">
                          Active
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Guidance Panel in Sky Blue */}
            <div className="bg-[#C9E6F8]/40 rounded-2xl border border-[#A7D9E6]/60 p-5 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 text-[#367BA8] text-xs font-bold">
                <Info className="w-4 h-4 text-[#367BA8]" />
                <span>Guidance for Step {currentStep}</span>
              </div>
              <p className="text-xs text-[#5E8085] leading-relaxed">
                {currentMeta.guidance}
              </p>

              <div className="pt-2 border-t border-[#A7D9E6]/40 space-y-1.5">
                <span className="text-[11px] font-semibold text-[#376E7D] block">
                  Helpful principles:
                </span>
                <ul className="space-y-1 text-[11px] text-[#5E8085]">
                  {currentMeta.tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-[#367BA8] font-bold">&middot;</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Persistence Transparency in Mint */}
            <div className="p-4 rounded-xl bg-white border border-[#DCEBEA] text-[11px] text-[#5E8085] space-y-1 shadow-2xs">
              <div className="font-semibold text-[#376E7D] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#278F89]" />
                <span>State Auto-Saved</span>
              </div>
              <p>
                Your answers are saved locally in your browser so you can return at any time.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-2xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-[#DCEBEA]">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-5 h-5" />
              <h4 className="font-bold text-[#376E7D]">Reset Form?</h4>
            </div>
            <p className="text-xs text-[#5E8085] leading-relaxed">
              This will clear your draft answers and reset the form to standard defaults.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-[#5E8085] hover:bg-[#F5FAF9] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer"
              >
                Yes, Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
