import { StudentProfileCreate, StudentProfileOut, INITIAL_PROFILE } from '../types/studentProfile';

const DRAFT_STORAGE_KEY = 'edupath_student_draft_v2';
const STEP_STORAGE_KEY = 'edupath_wizard_step_v2';
const CONFIRMED_PROFILE_KEY = 'edupath_confirmed_profile_v2';

export const storageService = {
  /**
   * Load draft profile from browser local storage.
   */
  getDraftProfile(): StudentProfileCreate {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return { ...INITIAL_PROFILE };
      const parsed = JSON.parse(raw);
      return {
        ...INITIAL_PROFILE,
        ...parsed,
        education_stage: 'class10', // Strictly enforced
      };
    } catch {
      return { ...INITIAL_PROFILE };
    }
  },

  /**
   * Save draft profile to browser local storage.
   */
  saveDraftProfile(profile: StudentProfileCreate): void {
    try {
      const sanitized: StudentProfileCreate = {
        ...profile,
        education_stage: 'class10',
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(sanitized));
    } catch (err) {
      console.warn('Unable to cache profile in local storage:', err);
    }
  },

  /**
   * Save confirmed backend profile (with ID and timestamps)
   */
  saveConfirmedProfile(profile: StudentProfileOut): void {
    try {
      localStorage.setItem(CONFIRMED_PROFILE_KEY, JSON.stringify(profile));
    } catch (err) {
      console.warn('Unable to store confirmed profile:', err);
    }
  },

  /**
   * Clear the cached confirmed profile. The backend remains the source of truth.
   */
  clearConfirmedProfile(): void {
    try {
      localStorage.removeItem(CONFIRMED_PROFILE_KEY);
    } catch {
      // ignore
    }
  },

  /**
   * Get confirmed backend profile
   */
  getConfirmedProfile(): StudentProfileOut | null {
    try {
      const raw = localStorage.getItem(CONFIRMED_PROFILE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  /**
   * Get the last active wizard step (1 to 5)
   */
  getLastStep(): number {
    try {
      const step = localStorage.getItem(STEP_STORAGE_KEY);
      return step ? Math.min(Math.max(parseInt(step, 10) || 1, 1), 5) : 1;
    } catch {
      return 1;
    }
  },

  /**
   * Save current wizard step
   */
  saveLastStep(step: number): void {
    try {
      localStorage.setItem(STEP_STORAGE_KEY, step.toString());
    } catch {
      // ignore
    }
  },

  /**
   * Reset profile draft to default state
   */
  resetDraft(): StudentProfileCreate {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      localStorage.removeItem(STEP_STORAGE_KEY);
      localStorage.removeItem(CONFIRMED_PROFILE_KEY);
    } catch {
      // ignore
    }
    return { ...INITIAL_PROFILE };
  },
};
