import React from 'react';
import { Button, CircularProgress, Box } from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';

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
    bg: '#24292e',
    hoverBg: '#1b1f23',
    icon: (
      <Box component="span" sx={{ display: 'flex' }}>
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
      </Box>
    ),
  },
  github: {
    label: 'Sign in with GitHub',
    bg: '#24292e',
    hoverBg: '#1b1f23',
    icon: <GitHubIcon fontSize="small" aria-label="GitHub logo" role="img" />,
  },
};

export function SocialProviderButton({
  providerId,
  providerName,
  loading,
  onClick,
}: SocialProviderButtonProps): React.ReactElement {
  const cfg = providerConfig[providerId];
  if (!cfg) return <></>; // unsupported provider
  return (
    <Button
      variant="contained"
      onClick={onClick}
      disabled={loading}
      aria-label={cfg.label}
      aria-busy={loading ? 'true' : undefined}
      title={cfg.label}
      sx={{
        textTransform: 'none',
        backgroundColor: cfg.bg,
        '&:hover': { backgroundColor: cfg.hoverBg },
        py: 1,
      }}
      startIcon={
        loading ? <CircularProgress size={18} aria-hidden="true" /> : cfg.icon
      }
    >
      {
        loading
          ? `Connecting…`
          : cfg.label.replace(
              'Sign in',
              'Continue'
            ) /* e.g., Continue with Google */
      }
    </Button>
  );
}
