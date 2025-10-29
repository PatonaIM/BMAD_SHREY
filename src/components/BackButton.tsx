'use client';
import React from 'react';

export const BackButton: React.FC = () => {
  const handleBack = () => {
    window.history.back();
  };

  return (
    <button onClick={handleBack} className="btn-primary px-4 py-2">
      Go Back
    </button>
  );
};
