export interface Job {
  _id: string;
  // Workable Integration Fields
  workableId: string; // Unique ID from Workable
  workableShortcode?: string; // Workable job shortcode
  lastSyncedAt: Date; // Last sync timestamp from Workable

  // Core Job Fields
  title: string;
  description: string;
  requirements?: string;

  // Job Details
  location?: string;
  department?: string;
  employmentType?:
    | 'full-time'
    | 'part-time'
    | 'contract'
    | 'temporary'
    | 'internship';
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
  };

  // Company Information
  company: string;
  companyDescription?: string;

  // Status and Metadata
  status: 'active' | 'inactive' | 'archived';
  postedAt: Date;
  closedAt?: Date;

  // Skills and Matching
  skills: string[];
  embeddingVersion?: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface JobListItem {
  _id: string;
  title: string;
  company: string;
  location?: string;
  employmentType?: Job['employmentType'];
  experienceLevel?: Job['experienceLevel'];
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  postedAt: Date;
  status: string;
}

export interface JobSearchParams {
  keyword?: string;
  location?: string;
  experienceLevel?: Job['experienceLevel'];
  employmentType?: Job['employmentType'];
  page?: number;
  limit?: number;
}
