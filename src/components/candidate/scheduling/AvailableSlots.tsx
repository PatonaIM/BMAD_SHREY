/**
 * AvailableSlots Component
 * Displays available booking slots from recruiter's calendar
 */

'use client';

import React, { useState } from 'react';
import { format, isSameDay, startOfDay } from 'date-fns';
import { Calendar, Clock, ChevronLeft } from 'lucide-react';
import type { TimeSlot } from '@/services/candidateSchedulingService';

interface AvailableSlotsProps {
  slots: TimeSlot[];
  recruiterName: string;
  onSelectSlot: (_slot: TimeSlot) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export default function AvailableSlots({
  slots,
  recruiterName,
  onSelectSlot,
  onBack,
  isLoading = false,
}: AvailableSlotsProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Get user's timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Group slots by date
  const slotsByDate = slots.reduce(
    (acc, slot) => {
      const dateKey = startOfDay(slot.start).toISOString();
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(slot);
      return acc;
    },
    {} as Record<string, TimeSlot[]>
  );

  const availableDates = Object.keys(slotsByDate)
    .map(k => new Date(k))
    .sort((a, b) => a.getTime() - b.getTime());

  const selectedDateSlots = selectedDate
    ? slotsByDate[startOfDay(selectedDate).toISOString()] || []
    : [];

  if (availableDates.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="text-center py-8">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-sm font-medium text-gray-900">
            No Available Times
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            The recruiter doesn't have any available slots in the next 2 weeks.
            Please check back later.
          </p>
          <button
            onClick={onBack}
            className="mt-4 text-sm text-indigo-600 hover:text-indigo-500 font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Book a Call with {recruiterName}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Times shown in your timezone ({userTimezone})
          </p>
        </div>
        <div className="w-16" /> {/* Spacer for alignment */}
      </div>

      {/* Date Selection */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          Select a Date
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {availableDates.map(date => {
            const dateKey = startOfDay(date).toISOString();
            const slotsCount = slotsByDate[dateKey]?.length || 0;
            const isSelected = selectedDate
              ? isSameDay(date, selectedDate)
              : false;

            return (
              <button
                key={dateKey}
                onClick={() => setSelectedDate(date)}
                className={`rounded-lg border p-3 text-left transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500'
                    : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50'
                }`}
              >
                <div className="text-sm font-medium text-gray-900">
                  {format(date, 'EEE, MMM d')}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {slotsCount} slot{slotsCount !== 1 ? 's' : ''}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Slot Selection */}
      {selectedDate && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Select a Time
          </h4>
          {selectedDateSlots.length === 0 ? (
            <p className="text-sm text-gray-600 text-center py-4">
              No available times for this date.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
              {selectedDateSlots.map((slot, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectSlot(slot)}
                  disabled={isLoading}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 hover:border-indigo-500 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Clock className="h-4 w-4 text-gray-600" />
                  {format(slot.start, 'h:mm a')}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!selectedDate && (
        <div className="text-center py-8 text-sm text-gray-600">
          <Calendar className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          Select a date above to see available times
        </div>
      )}
    </div>
  );
}
