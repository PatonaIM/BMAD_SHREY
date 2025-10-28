import React from 'react';
import type { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/options';
import Providers from '../components/Providers';

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}): Promise<React.ReactElement> {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en">
      <body>
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
