export interface Job {
  _id: string;
  title: string;
  description: string;
  skills: string[];
  embeddingVersion?: number;
}
