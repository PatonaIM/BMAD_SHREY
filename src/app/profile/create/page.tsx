import { CreateProfileFromResume } from '../../../components/CreateProfileFromResume';

export default function CreateProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Profile Creation
          </h1>
          <p className="text-gray-600">
            Generate your professional profile from your uploaded resume using
            AI extraction.
          </p>
        </div>

        <CreateProfileFromResume />

        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            How it works
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>
              Upload your resume on the dashboard (if you haven&apos;t already)
            </li>
            <li>
              Click &quot;Create Profile&quot; to extract your information using
              AI
            </li>
            <li>
              The system will parse your skills, experience, and education
            </li>
            <li>Review and edit your profile in the Profile Editor</li>
            <li>Use your profile to match with relevant jobs</li>
          </ol>
        </div>

        <div className="mt-6 flex gap-4">
          <a
            href="/dashboard"
            className="text-blue-600 hover:text-blue-800 text-sm underline"
          >
            ← Back to Dashboard
          </a>
          <a
            href="/profile/edit"
            className="text-blue-600 hover:text-blue-800 text-sm underline"
          >
            Go to Profile Editor →
          </a>
        </div>
      </div>
    </div>
  );
}
