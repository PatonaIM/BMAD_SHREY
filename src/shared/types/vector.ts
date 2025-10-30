export interface ResumeVector {
  userId: string;
  profileId: string; // From extracted profiles
  content: string; // Full text used for vectorization
  embeddings: number[]; // OpenAI embeddings array
  dimensions: number;
  model: string; // e.g., 'text-embedding-3-small'
  createdAt: Date;
  updatedAt: Date;
  version: number; // Increment when re-vectorized
}

export interface VectorSearchQuery {
  vector: number[];
  limit?: number;
  filter?: Record<string, unknown>;
  similarity?: 'cosine' | 'euclidean' | 'dotProduct';
}

export interface VectorSearchResult {
  document: Record<string, unknown>;
  score: number;
  userId: string;
}

export interface VectorizationJob {
  id: string;
  userId: string;
  profileId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: 'low' | 'normal' | 'high';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  costCents?: number; // Cost in USD cents
}

export interface ProfileChangeEvent {
  userId: string;
  profileId: string;
  changeType: 'created' | 'updated' | 'deleted';
  significance: 'minor' | 'major'; // Determines if re-vectorization needed
  changedFields: string[];
  timestamp: Date;
}
