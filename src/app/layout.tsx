import React from 'react';
import type { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/options';
import Providers from '../components/Providers';
import { AppLayout } from '../components/AppLayout';

export const metadata = {
  title: 'Teamified - AI-Powered Job Application Platform',
  description:
    'Discover your next opportunity with AI-enhanced matching, intelligent interviews, and transparent application tracking.',
  keywords: 'jobs, careers, AI interviews, job search, tech jobs, hiring',
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}): Promise<React.ReactElement> {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en">
      <body>
        <Providers session={session}>
          <AppLayout>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  );
}
