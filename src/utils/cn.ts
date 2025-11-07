/**
 * Utility function to merge className strings with Tailwind CSS classes
 * Uses clsx for conditional classes and tailwind-merge to handle conflicts
 */
import clsx, { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
