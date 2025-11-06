import React, { useEffect } from 'react';

interface EndInterviewModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export const EndInterviewModal: React.FC<EndInterviewModalProps> = ({
  onConfirm,
  onCancel,
}) => {
  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  // Focus trap - focus first button on mount
  useEffect(() => {
    const cancelButton = document.getElementById('end-interview-cancel');
    cancelButton?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="end-interview-title"
      aria-describedby="end-interview-description"
    >
      <div
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-6 max-w-md mx-4"
        onClick={e => e.stopPropagation()}
      >
        <h2
          id="end-interview-title"
          className="text-xl font-semibold text-neutral-900 dark:text-white mb-3"
        >
          End Interview?
        </h2>
        <p
          id="end-interview-description"
          className="text-sm text-neutral-600 dark:text-neutral-300 mb-6"
        >
          Are you sure? Your responses will be scored immediately and you won't
          be able to continue.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            id="end-interview-cancel"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition"
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition"
            type="button"
            aria-describedby="end-interview-description"
          >
            Yes, End Interview
          </button>
        </div>
      </div>
    </div>
  );
};
