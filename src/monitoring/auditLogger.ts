import { logger } from './logger';

export interface AuditEvent {
  event: string;
  actorType: 'system' | 'candidate' | 'recruiter';
  actorId?: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

export function logAudit(evt: AuditEvent): void {
  logger.info({ audit: true, timestamp: evt.timestamp || new Date(), ...evt });
}
