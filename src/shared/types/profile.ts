export interface Certification {
  name: string;
  issuer: string;
  issueDate?: string;
  expiryDate?: string;
  credentialId?: string;
  url?: string;
}

export interface ExtractedProfile {
  summary?: string; // High-level professional summary
  skills?: ExtractedSkill[]; // Normalized skill set
  experience?: ExperienceEntry[]; // Work history
  education?: EducationEntry[]; // Educational background
  certifications?: Certification[]; // Professional certifications
  extractedAt?: string; // ISO timestamp
  extractionStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  extractionError?: string;
  costEstimate?: {
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUSD: number;
  };
}

export interface ExtractedSkill {
  name: string;
  category: SkillCategory;
  proficiency?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsOfExperience?: number;
}

export interface NormalizedSkill {
  original: string;
  normalized: string;
  category: string | null;
  confidence?: number;
}

export type SkillCategory =
  | 'programming_languages'
  | 'frameworks_libraries'
  | 'databases'
  | 'cloud_platforms'
  | 'tools_software'
  | 'methodologies'
  | 'soft_skills'
  | 'domain_knowledge'
  | 'other';

export interface ExperienceEntry {
  company: string;
  position: string;
  startDate: string; // ISO date or "2020-01" format
  endDate?: string; // undefined for current position
  isCurrent: boolean;
  description?: string;
  skills?: string[]; // Skills used in this role
  location?: string;
  achievements?: string[];
}

export interface EducationEntry {
  institution: string;
  degree?: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  grade?: string;
  description?: string;
}

export interface ExtractionJob {
  id: string;
  userId: string;
  resumeVersionId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  priority: 'low' | 'normal' | 'high';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  costCents?: number;
  retryCount: number;
  maxRetries: number;
}
