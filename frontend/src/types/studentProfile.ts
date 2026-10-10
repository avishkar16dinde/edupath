/**
 * EduPath Student Profile Data Contract
 * Strictly adheres to FastAPI OpenAPI schema and Pydantic models.
 */

export type EducationStage = 'class10';

export type EducationBoard = 'CBSE' | 'ICSE' | 'State Board' | 'Other';

export type AcademicStatus = 'currently_studying' | 'completed' | 'awaiting_results';

export type ResultStatus = 'completed' | 'predicted' | 'awaited' | 'unavailable';

export interface SubjectIn {
  name: string;
  marks: number | null;
  maximum_marks: number | null;
  result_status: ResultStatus;
  favourite: boolean;
  challenging: boolean;
}

export interface SubjectOut extends SubjectIn {
  id: number;
}

export type InterestType =
  | 'technology_coding'
  | 'mathematics_logic'
  | 'science_discovery'
  | 'biology_healthcare'
  | 'business_finance'
  | 'creativity_design'
  | 'social_sciences_communication'
  | 'environment_sustainability'
  | 'practical_technical_work'
  | 'helping_people'
  | 'sports_physical_activities'
  | 'exploring_new_ideas'
  | 'still_exploring';

export type StrengthName =
  | 'logical_problem_solving'
  | 'numerical_reasoning'
  | 'creativity'
  | 'communication'
  | 'teamwork'
  | 'attention_to_detail'
  | 'practical_problem_solving'
  | 'curiosity_independent_learning';

export type RatingStatus = 'rated' | 'not_sure';

export interface StrengthIn {
  name: StrengthName;
  rating: number | null;
  rating_status: RatingStatus;
}

export interface StrengthOut extends StrengthIn {
  id: number;
}

export type BudgetStatus = 'estimated' | 'fixed' | 'not_sure';

export interface AnnualBudgetIn {
  currency: string;
  amount: number | null;
  budget_status: BudgetStatus;
}

export interface FundingPreferencesIn {
  interested_in_scholarships: boolean;
  willing_to_consider_loans: boolean;
}

export type StudyDestination = 'india' | 'abroad' | 'both' | 'undecided';

export type PriorityType =
  | 'affordability'
  | 'interest_in_subject'
  | 'career_opportunities'
  | 'stability'
  | 'creativity'
  | 'flexibility'
  | 'social_impact';

export type CareerCertainty = 'specific_career' | 'few_ideas' | 'exploring';

/**
 * Payload sent to POST /api/profiles or PUT /api/profiles/{id}
 */
export interface StudentProfileCreate {
  education_stage: EducationStage;
  preferred_name: string | null;
  country: string;
  region: string | null;
  curriculum: EducationBoard;
  academic_status: AcademicStatus;
  preferred_language: string | null;
  subjects: SubjectIn[];
  overall_percentage: number | null;
  overall_result_status: ResultStatus;
  interests: InterestType[];
  strengths: StrengthIn[];
  interest_description: string;
  annual_budget: AnnualBudgetIn;
  funding_preferences: FundingPreferencesIn;
  preferred_destination: StudyDestination;
  priorities: PriorityType[];
  career_certainty: CareerCertainty;
}

/**
 * Record returned by backend with database ID and timestamps
 */
export interface StudentProfileOut extends StudentProfileCreate {
  id: number;
  subjects: SubjectOut[];
  strengths: StrengthOut[];
  created_at: string;
  updated_at: string;
}

/**
 * Default initial profile for student onboarding
 */
export const INITIAL_PROFILE: StudentProfileCreate = {
  education_stage: 'class10',
  preferred_name: '',
  country: 'India',
  region: 'Maharashtra',
  curriculum: 'CBSE',
  academic_status: 'currently_studying',
  preferred_language: 'English',
  subjects: [
    {
      name: 'Mathematics',
      marks: null,
      maximum_marks: 100,
      result_status: 'predicted',
      favourite: true,
      challenging: false,
    },
    {
      name: 'Science',
      marks: null,
      maximum_marks: 100,
      result_status: 'predicted',
      favourite: false,
      challenging: false,
    },
    {
      name: 'English',
      marks: null,
      maximum_marks: 100,
      result_status: 'predicted',
      favourite: false,
      challenging: false,
    },
    {
      name: 'Social Science',
      marks: null,
      maximum_marks: 100,
      result_status: 'predicted',
      favourite: false,
      challenging: false,
    },
    {
      name: 'Second Language (Hindi / Regional)',
      marks: null,
      maximum_marks: 100,
      result_status: 'predicted',
      favourite: false,
      challenging: false,
    },
  ],
  overall_percentage: null,
  overall_result_status: 'predicted',
  interests: ['technology_coding', 'mathematics_logic'],
  strengths: [
    { name: 'logical_problem_solving', rating: null, rating_status: 'not_sure' },
    { name: 'numerical_reasoning', rating: null, rating_status: 'not_sure' },
    { name: 'creativity', rating: null, rating_status: 'not_sure' },
    { name: 'communication', rating: null, rating_status: 'not_sure' },
    { name: 'teamwork', rating: null, rating_status: 'not_sure' },
    { name: 'attention_to_detail', rating: null, rating_status: 'not_sure' },
    { name: 'practical_problem_solving', rating: null, rating_status: 'not_sure' },
    { name: 'curiosity_independent_learning', rating: null, rating_status: 'not_sure' },
  ],
  interest_description: '',
  annual_budget: {
    currency: 'INR',
    amount: 100000,
    budget_status: 'estimated',
  },
  funding_preferences: {
    interested_in_scholarships: true,
    willing_to_consider_loans: false,
  },
  preferred_destination: 'india',
  priorities: ['interest_in_subject', 'career_opportunities'],
  career_certainty: 'exploring',
};
