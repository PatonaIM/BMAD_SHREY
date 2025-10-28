import React from 'react';
import AuthStatus from '../components/AuthStatus';

export default function HomePage(): React.ReactElement {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>BMAD Platform Scaffold (src/)</h1>
      <p>Unified scaffold placed under src.</p>
      <AuthStatus />
    </main>
  );
}

