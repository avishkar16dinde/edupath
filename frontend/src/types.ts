export type StudentProfile = {
  name: string;
  country: string;
  grade: number;
  marks: number;
  subjects: string[];
  interests: string[];
  budgetAnnual: number;
  currency: string;
  preferredCountries: string[];
  locationPreference: "home" | "abroad" | "flexible";
  financialAid: boolean;
};

export type Pathway = {
  id: string;
  title: string;
  route: string;
  countries: string[];
  durationYears: number;
  estimatedCost: string;
  admission: string[];
  careers: string[];
  fit: number;
  rationale: string[];
  assumptions: string[];
  uncertainty: string[];
};

export type DecisionMatrix = {
  criteria: string[];
  rows: { pathway: string; values: Record<string, string> }[];
};

// ============================================================
// GRAPH DOMAIN & PROFILE CONTRACT TYPES
// ============================================================

export * from "./types/pathwayGraph";
export type {
  EducationStage,
  EducationBoard,
  AcademicStatus,
  ResultStatus,
  SubjectIn,
  SubjectOut,
  InterestType,
  StrengthName,
  RatingStatus,
  StrengthIn,
  StrengthOut,
  BudgetStatus,
  AnnualBudgetIn,
  FundingPreferencesIn,
  StudyDestination,
  PriorityType,
  CareerCertainty,
  StudentProfileCreate,
  StudentProfileOut,
} from "./types/studentProfile";

export interface SubjectSnapshot {
  name: string;
  marks?: number | null;
  maximum_marks?: number | null;
  result_status: "completed" | "predicted" | "awaited" | "unavailable";
  favourite: boolean;
  challenging: boolean;
}

export interface StrengthSnapshot {
  name: string;
  rating?: number | null;
  rating_status: "rated" | "not_sure";
}

export interface StudentProfileSnapshot {
  id?: number;
  education_stage: string;
  preferred_name?: string | null;
  country: string;
  region?: string | null;
  curriculum: string;
  academic_status: string;
  preferred_language?: string | null;
  subjects: SubjectSnapshot[];
  overall_percentage?: number | null;
  overall_result_status: string;
  interests: string[];
  strengths: StrengthSnapshot[];
  interest_description: string;
  annual_budget: {
    currency: string;
    amount?: number | null;
    budget_status: "estimated" | "fixed" | "not_sure";
  };
  funding_preferences: {
    interested_in_scholarships: boolean;
    willing_to_consider_loans: boolean;
  };
  preferred_destination: string;
  priorities: string[];
  career_certainty: string;
}