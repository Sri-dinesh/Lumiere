import { DateTime } from 'luxon';
import { DEFAULT_TIMEZONE } from '../config/constants.js';
import { AppError } from './errors.js';

/**
 * Parses local date and time in the cinema timezone into a UTC JS Date.
 */
export function parseLocalToUtc(
  localDate: string,
  localTime: string,
  zone: string = DEFAULT_TIMEZONE,
): Date {
  // Validate format: YYYY-MM-DD and HH:mm
  const matchDate = /^\d{4}-\d{2}-\d{2}$/.test(localDate);
  const matchTime = /^\d{2}:\d{2}$/.test(localTime);

  if (!matchDate || !matchTime) {
    throw AppError.badRequest('Invalid date or time format. Expected YYYY-MM-DD and HH:mm.');
  }

  const dt = DateTime.fromISO(`${localDate}T${localTime}`, { zone });
  if (!dt.isValid) {
    throw AppError.badRequest(`Invalid date/time value: ${dt.invalidExplanation}`);
  }

  return dt.toUTC().toJSDate();
}

/**
 * Formats a UTC Date into cinema local date string (YYYY-MM-DD) and local time (HH:mm).
 */
export function formatUtcToCinemaLocal(
  utcDate: Date,
  zone: string = DEFAULT_TIMEZONE,
): { localDate: string; localTime: string } {
  const dt = DateTime.fromJSDate(utcDate).setZone(zone);
  return {
    localDate: dt.toFormat('yyyy-MM-dd'),
    localTime: dt.toFormat('HH:mm'),
  };
}
