import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/options';
import { ResumeUpload } from '../../../components/ResumeUpload';

export default async function ResumePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return (
      <div className="p-8">
        <p className="text-sm">Please sign in to upload your resume.</p>
      </div>
    );
  }
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-xl font-semibold">Upload Resume</h1>
      <ResumeUpload />
    </div>
  );
}
