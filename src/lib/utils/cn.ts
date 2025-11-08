/**
 * Class Name Utility
 * Merges Tailwind CSS classes with clsx and tailwind-merge
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge class names intelligently
 * Handles Tailwind CSS class conflicts properly
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
