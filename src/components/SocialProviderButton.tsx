import React from 'react';

export interface SocialProviderButtonProps {
  providerId: string;
  providerName: string;
  loading: boolean;
  onClick: () => void;
}

const providerConfig: Record<
  string,
  { label: string; bg: string; hoverBg: string; icon: React.ReactNode }
> = {
  google: {
    label: 'Sign in with Google',
    bg: 'bg-neutral-900',
    hoverBg: 'bg-neutral-800',
    icon: (
      <span className="flex" aria-hidden="true">
        <svg
          width="18"
          height="18"
          viewBox="0 0 48 48"
          role="img"
          aria-label="Google logo"
        >
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.72 1.22 9.23 3.62l6.85-6.85C35.89 2.38 30.34 0 24 0 14.64 0 6.44 5.38 2.56 13.22l7.96 6.18C12.33 13.04 17.74 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.44 24.55c0-1.57-.14-3.08-.41-4.55H24v9.02h12.65c-.55 2.97-2.19 5.49-4.67 7.18l7.32 5.68C43.89 37.33 46.44 31.34 46.44 24.55z"
          />
          <path
            fill="#FBBC05"
            d="M10.52 28.26c-.49-1.47-.76-3.04-.76-4.66 0-1.62.27-3.19.76-4.66l-7.96-6.18C.93 15.21 0 19.48 0 23.6c0 4.12.93 8.39 2.56 12.14l7.96-6.18z"
          />
          <path
            fill="#34A853"
            d="M24 47.2c6.34 0 11.69-2.09 15.58-5.68l-7.32-5.68c-2.04 1.38-4.66 2.2-8.26 2.2-6.26 0-11.67-3.54-13.48-9.9l-7.96 6.18C6.44 42.62 14.64 48 24 48z"
          />
          <path fill="none" d="M0 0h48v48H0z" />
        </svg>
      </span>
    ),
  },
  github: {
    label: 'Sign in with GitHub',
    bg: 'bg-neutral-900',
    hoverBg: 'bg-neutral-800',
    icon: (
      <span className="flex" aria-hidden="true">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          role="img"
          aria-label="GitHub logo"
        >
          <path
            fill="currentColor"
            d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.38 7.86 10.9.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.06-.72.08-.7.08-.7 1.17.08 1.79 1.2 1.79 1.2 1.04 1.78 2.72 1.27 3.38.97.1-.75.41-1.27.74-1.56-2.55-.29-5.23-1.28-5.23-5.72 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.45-2.69 5.42-5.25 5.7.42.36.79 1.07.79 2.17 0 1.57-.02 2.83-.02 3.22 0 .31.21.67.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"
          />
        </svg>
      </span>
    ),
  },
};

export function SocialProviderButton({
  providerId,
  loading,
  onClick,
}: SocialProviderButtonProps): React.ReactElement {
  const cfg = providerConfig[providerId];
  if (!cfg) return <></>; // unsupported provider
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={[
        'relative inline-flex items-center justify-center gap-2 rounded-md border border-neutral-700 px-4 py-2 text-sm font-medium transition-colors min-w-[180px]',
        cfg.bg,
        'text-neutral-100',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        !loading ? 'hover:' + cfg.hoverBg : '',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500',
      ].join(' ')}
      aria-label={cfg.label}
      aria-busy={loading ? 'true' : undefined}
      title={cfg.label}
    >
      {loading && (
        <span
          className="absolute inset-0 flex items-center justify-center"
          aria-hidden="true"
        >
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
        </span>
      )}
      <span className={loading ? 'opacity-0' : 'flex items-center gap-2'}>
        {cfg.icon}
        <span>{`Continue with ${cfg.label.replace('Sign in with ', '')}`}</span>
      </span>
    </button>
  );
}
