import { Metadata } from 'next';

export const metadata: Metadata = {
  other: {
    // Enable camera and microphone permissions for interviews
    'Permissions-Policy':
      'camera=(self), microphone=(self), display-capture=(self)',
  },
};

export default function InterviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
