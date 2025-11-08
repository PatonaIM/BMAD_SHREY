/**
 * CandidateScheduling Component
 * Main container for candidate self-scheduling workflow
 * Orchestrates: Eligibility → Available Slots → Confirmation → Success
 */

'use client';

import React, { useState } from 'react';
import { trpc } from '@/services/trpc/client';
import SchedulingEligibility from './SchedulingEligibility';
import AvailableSlots from './AvailableSlots';
import BookingConfirmation from './BookingConfirmation';
import BookingSuccess from './BookingSuccess';
import type { TimeSlot } from '@/services/candidateSchedulingService';

interface CandidateSchedulingProps {
  applicationId: string;
}

type Step = 'eligibility' | 'slots' | 'confirm' | 'success';

export default function CandidateScheduling({
  applicationId,
}: CandidateSchedulingProps) {
  const [step, setStep] = useState<Step>('eligibility');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [bookingResult, setBookingResult] = useState<{
    scheduledAt: Date;
    meetLink?: string;
    recruiterName: string;
  } | null>(null);

  // Fetch available slots (tokens fetched from database by backend)
  const {
    data: slotsData,
    isLoading: isFetchingSlots,
    refetch: refetchSlots,
  } = trpc.candidate.getAvailableSlots.useQuery(
    {
      applicationId,
    },
    {
      enabled: step === 'slots',
    }
  );

  // Book time slot mutation
  const bookSlotMutation = trpc.candidate.bookTimeSlot.useMutation({
    onSuccess: result => {
      if (result.success && selectedSlot) {
        setBookingResult({
          scheduledAt: selectedSlot.start,
          meetLink: result.meetLink,
          recruiterName: slotsData?.recruiterName || 'Recruiter',
        });
        setStep('success');
      }
    },
    onError: (error: { message: string }) => {
      alert(`Failed to book: ${error.message}`);
    },
  });

  const handleEligible = () => {
    setStep('slots');
    refetchSlots();
  };

  const handleSelectSlot = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setStep('confirm');
  };

  const handleConfirmBooking = async (notes?: string) => {
    if (!selectedSlot) return;

    await bookSlotMutation.mutateAsync({
      applicationId,
      slotStart: selectedSlot.start.toISOString(),
      notes,
    });
  };

  const handleBackToSlots = () => {
    setSelectedSlot(null);
    setStep('slots');
  };

  const handleBackToEligibility = () => {
    setSelectedSlot(null);
    setStep('eligibility');
  };

  const handleDone = () => {
    // Reset to eligibility check (which will show "already booked")
    setStep('eligibility');
    setSelectedSlot(null);
    setBookingResult(null);
  };

  return (
    <div className="space-y-4">
      {step === 'eligibility' && (
        <SchedulingEligibility
          applicationId={applicationId}
          onEligible={handleEligible}
        />
      )}

      {step === 'slots' && (
        <div>
          {isFetchingSlots ? (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <div className="flex items-center gap-3 justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                <p className="text-sm text-gray-600">
                  Loading available times...
                </p>
              </div>
            </div>
          ) : slotsData ? (
            <AvailableSlots
              slots={slotsData.slots.map(slot => ({
                ...slot,
                start: new Date(slot.start),
                end: new Date(slot.end),
              }))}
              recruiterName={slotsData.recruiterName}
              onSelectSlot={handleSelectSlot}
              onBack={handleBackToEligibility}
              isLoading={bookSlotMutation.isPending}
            />
          ) : (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
              <div className="flex items-start gap-3">
                <div className="text-yellow-600 mt-0.5">⚠️</div>
                <div>
                  <h3 className="text-sm font-medium text-yellow-900">
                    Unable to Load Available Times
                  </h3>
                  <p className="mt-1 text-sm text-yellow-700">
                    The recruiter may not have connected their Google Calendar
                    yet. Please check back later or contact the recruiter
                    directly.
                  </p>
                  <button
                    onClick={handleBackToEligibility}
                    className="mt-4 text-sm text-yellow-600 hover:text-yellow-500 font-medium"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 'confirm' && selectedSlot && (
        <BookingConfirmation
          slot={selectedSlot}
          recruiterName={slotsData?.recruiterName || 'Recruiter'}
          onConfirm={handleConfirmBooking}
          onBack={handleBackToSlots}
          isSubmitting={bookSlotMutation.isPending}
        />
      )}

      {step === 'success' && bookingResult && (
        <BookingSuccess
          scheduledAt={bookingResult.scheduledAt}
          meetLink={bookingResult.meetLink}
          recruiterName={bookingResult.recruiterName}
          onDone={handleDone}
        />
      )}
    </div>
  );
}
