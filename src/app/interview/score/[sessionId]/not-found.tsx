import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-neutral-950 dark:to-neutral-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-8 text-center">
        <div className="text-6xl mb-4">❌</div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
          Interview Not Found
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">
          This interview session could not be found or has not been completed
          yet.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
