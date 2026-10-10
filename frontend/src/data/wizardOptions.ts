import { 
  InterestType, 
  StrengthName, 
  PriorityType, 
  StudyDestination, 
  CareerCertainty,
  AcademicStatus,
  ResultStatus,
  BudgetStatus 
} from '../types/studentProfile';

export interface InterestOption {
  id: InterestType;
  title: string;
  description: string;
  iconName: string;
}

export const INTEREST_OPTIONS: InterestOption[] = [
  {
    id: 'technology_coding',
    title: 'Technology & Coding',
    description: 'Computers, programming, digital software, and building with technology.',
    iconName: 'Cpu',
  },
  {
    id: 'mathematics_logic',
    title: 'Mathematics & Logic',
    description: 'Solving mathematical puzzles, patterns, calculations, and analytical problems.',
    iconName: 'Binary',
  },
  {
    id: 'science_discovery',
    title: 'Science & Discovery',
    description: 'Understanding how the world functions through experiments and physical science.',
    iconName: 'Atom',
  },
  {
    id: 'biology_healthcare',
    title: 'Biology & Healthcare',
    description: 'Living organisms, human health, medicine, physiology, and helping people heal.',
    iconName: 'HeartPulse',
  },
  {
    id: 'business_finance',
    title: 'Business & Finance',
    description: 'Money, economics, entrepreneurship, markets, management, and commerce.',
    iconName: 'TrendingUp',
  },
  {
    id: 'creativity_design',
    title: 'Creativity & Design',
    description: 'Drawing, visual design, storytelling, architecture, media, and creative arts.',
    iconName: 'Palette',
  },
  {
    id: 'social_sciences_communication',
    title: 'Social Sciences & Communication',
    description: 'History, society, human behaviour, literature, languages, debate, and law.',
    iconName: 'MessageSquareText',
  },
  {
    id: 'environment_sustainability',
    title: 'Environment & Sustainability',
    description: 'Nature, climate systems, environmental protection, and green solutions.',
    iconName: 'Leaf',
  },
  {
    id: 'practical_technical_work',
    title: 'Practical & Technical Work',
    description: 'Hands-on tinkering, repairing machinery, electronics, tools, and construction.',
    iconName: 'Wrench',
  },
  {
    id: 'helping_people',
    title: 'Helping People & Community',
    description: 'Teaching, supporting others, solving social inequalities, and community impact.',
    iconName: 'Users',
  },
  {
    id: 'sports_physical_activities',
    title: 'Sports & Physical Activities',
    description: 'Athletic movement, physical fitness, sports sciences, and performance discipline.',
    iconName: 'Trophy',
  },
  {
    id: 'exploring_new_ideas',
    title: 'Exploring New Ideas',
    description: 'Deep inquiry, asking questions, discovering unfamiliar subjects, and research.',
    iconName: 'Compass',
  },
  {
    id: 'still_exploring',
    title: 'Still Exploring',
    description: 'Open-minded and discovering what sparks curiosity without immediate focus.',
    iconName: 'Sparkles',
  },
];

export interface StrengthOption {
  key: StrengthName;
  label: string;
  description: string;
}

export const STRENGTH_OPTIONS: StrengthOption[] = [
  {
    key: 'logical_problem_solving',
    label: 'Logical problem-solving',
    description: 'Breaking down complex challenges step-by-step to reach reasoned solutions.',
  },
  {
    key: 'numerical_reasoning',
    label: 'Numerical reasoning',
    description: 'Working comfortably with numbers, estimations, formulas, and quantitative data.',
  },
  {
    key: 'creativity',
    label: 'Creativity & imagination',
    description: 'Generating fresh concepts, visualizing ideas, or thinking outside standard rules.',
  },
  {
    key: 'communication',
    label: 'Communication & explaining',
    description: 'Expressing ideas clearly in speech or writing and helping others understand.',
  },
  {
    key: 'teamwork',
    label: 'Teamwork & collaboration',
    description: 'Working smoothly with classmates, listening actively, and achieving group goals.',
  },
  {
    key: 'attention_to_detail',
    label: 'Attention to detail',
    description: 'Noticing subtle patterns, checking for accuracy, and taking care with precision.',
  },
  {
    key: 'practical_problem_solving',
    label: 'Practical problem-solving',
    description: 'Tinkering, assembling, fixing, or experimenting with tangible physical tools.',
  },
  {
    key: 'curiosity_independent_learning',
    label: 'Curiosity & independent learning',
    description: 'Diving deep into unfamiliar subjects out of genuine personal interest.',
  },
];

export const PRIORITY_OPTIONS: { id: PriorityType; label: string; description: string }[] = [
  {
    id: 'affordability',
    label: 'Affordability',
    description: 'Keeping educational expenses reasonable and within family comfort.',
  },
  {
    id: 'interest_in_subject',
    label: 'Subject Interest',
    description: 'Studying topics that genuinely engage and excite your curiosity.',
  },
  {
    id: 'career_opportunities',
    label: 'Career Opportunities',
    description: 'Strong market demand, varied employment routes, and modern job prospects.',
  },
  {
    id: 'stability',
    label: 'Stability & Predictability',
    description: 'Established qualification paths and dependable long-term employment.',
  },
  {
    id: 'creativity',
    label: 'Creativity & Self-Expression',
    description: 'Room for originality, innovation, artistic design, and personal style.',
  },
  {
    id: 'flexibility',
    label: 'Flexibility & Broad Options',
    description: 'Retaining versatility so future pivots and interdisciplinary study remain open.',
  },
  {
    id: 'social_impact',
    label: 'Social & Community Impact',
    description: 'Directly contributing to society, health, environmental protection, or welfare.',
  },
];

export const DESTINATION_OPTIONS: { id: StudyDestination; label: string; desc: string }[] = [
  { id: 'india', label: 'Within India', desc: 'State and national institutions, CBSE/State colleges, and polytechnics.' },
  { id: 'abroad', label: 'Abroad / Overseas', desc: 'International secondary education, IB curricula, or overseas studies.' },
  { id: 'both', label: 'Open to Both', desc: 'Interested in evaluating domestic and global educational avenues.' },
  { id: 'undecided', label: 'Undecided / Not Sure', desc: 'Flexible to see where the best educational fit lies.' },
];

export const CERTAINTY_OPTIONS: { id: CareerCertainty; label: string; desc: string }[] = [
  { id: 'specific_career', label: 'Specific career in mind', desc: 'You have a target field (e.g. software engineer, doctor, CA, architect, designer).' },
  { id: 'few_ideas', label: 'A few competing ideas', desc: 'You are weighing two or three different options and exploring trade-offs.' },
  { id: 'exploring', label: 'Want to explore broadly', desc: 'Open-minded and seeking clarity on all post-Class 10 possibilities.' },
];

export const ACADEMIC_STATUS_LABELS: Record<AcademicStatus, { label: string; desc: string }> = {
  currently_studying: {
    label: 'Currently studying in Class 10',
    desc: 'Attending regular school sessions and preparing for board examinations.',
  },
  awaiting_results: {
    label: 'Awaiting board examination results',
    desc: 'Exams have been written; waiting for official mark sheets.',
  },
  completed: {
    label: 'Completed Class 10',
    desc: 'Passed Class 10 and actively deciding on your next stream or diploma.',
  },
};

export const RESULT_STATUS_LABELS: Record<ResultStatus, string> = {
  completed: 'Official / Completed',
  predicted: 'Predicted / Pre-board',
  awaited: 'Results Awaited',
  unavailable: 'Marks Not Available',
};

export const BUDGET_STATUS_LABELS: Record<BudgetStatus, string> = {
  estimated: 'Estimated annual budget',
  fixed: 'Fixed budget limit',
  not_sure: 'Not sure yet / Flexible',
};

export const WRITING_PROMPTS = [
  'Which subjects or activities make you lose track of time?',
  'What do you enjoy learning about outside school?',
  'What kind of problems would you love to solve?',
  'Is there anything you have always wanted to try?',
];

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Delhi NCR',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu & Kashmir', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab',
  'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Other / Outside India'
];
