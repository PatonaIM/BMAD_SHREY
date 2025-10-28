export interface Application {
  _id: string;
  userId: string;
  jobId: string;
  status:
    | 'draft'
    | 'submitted'
    | 'in_review'
    | 'interview'
    | 'offer'
    | 'rejected';
  createdAt: string;
  updatedAt: string;
}
