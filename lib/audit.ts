import { adminDb } from '@/lib/firebase/admin';
import { NextRequest } from 'next/server';
import { getClientIP } from './ratelimit';

export type InviteAuditAction = 
  | 'INVITE_CREATED'
  | 'INVITE_UPDATED'
  | 'INVITE_REVOKED'
  | 'INVITE_RESTORED'
  | 'INVITE_UPLOAD_REQUESTED'
  | 'INVITE_UPLOAD_SUCCEEDED'
  | 'INVITE_UPLOAD_FAILED';

export interface InviteAuditDetails {
  inviteId?: string;
  cdnId?: string;
  label?: string;
  fileKey?: string;
  fileSize?: number;
  contentType?: string;
  extension?: string;
  etag?: string;
  error?: string;
  [key: string]: any;
}

/**
 * Log an audit event for invite-related actions
 */
export async function logInviteAudit(
  action: InviteAuditAction,
  inviteLabel: string,
  details: InviteAuditDetails,
  request?: NextRequest
): Promise<void> {
  try {
    const ip = request ? getClientIP(request) : null;
    const userAgent = request?.headers.get('user-agent') || null;

    const auditLog = {
      actor: `invite:${inviteLabel}`,
      action,
      details,
      ip,
      userAgent,
      createdAt: new Date(),
    };

    await adminDb.collection('auditLogs').add(auditLog);
  } catch (error) {
    console.error('Failed to log invite audit:', error);
    // Don't throw - audit logging should not break the main flow
  }
}

/**
 * Log invite creation
 */
export async function logInviteCreated(
  inviteId: string,
  inviteLabel: string,
  cdnId: string,
  createdBy: string,
  request?: NextRequest
): Promise<void> {
  await logInviteAudit(
    'INVITE_CREATED',
    inviteLabel,
    {
      inviteId,
      cdnId,
      label: inviteLabel,
      createdBy,
    },
    request
  );
}

/**
 * Log invite update
 */
export async function logInviteUpdated(
  inviteId: string,
  inviteLabel: string,
  cdnId: string,
  updatedBy: string,
  changes: Record<string, any>,
  request?: NextRequest
): Promise<void> {
  await logInviteAudit(
    'INVITE_UPDATED',
    inviteLabel,
    {
      inviteId,
      cdnId,
      label: inviteLabel,
      updatedBy,
      changes,
    },
    request
  );
}

/**
 * Log invite revoke/restore
 */
export async function logInviteStatusChange(
  inviteId: string,
  inviteLabel: string,
  cdnId: string,
  newStatus: 'REVOKED' | 'RESTORED',
  changedBy: string,
  request?: NextRequest
): Promise<void> {
  await logInviteAudit(
    newStatus === 'REVOKED' ? 'INVITE_REVOKED' : 'INVITE_RESTORED',
    inviteLabel,
    {
      inviteId,
      cdnId,
      label: inviteLabel,
      newStatus,
      changedBy,
    },
    request
  );
}

/**
 * Log upload request
 */
export async function logUploadRequested(
  inviteId: string,
  inviteLabel: string,
  cdnId: string,
  fileKey: string,
  contentType: string,
  fileSize: number,
  request?: NextRequest
): Promise<void> {
  await logInviteAudit(
    'INVITE_UPLOAD_REQUESTED',
    inviteLabel,
    {
      inviteId,
      cdnId,
      label: inviteLabel,
      fileKey,
      contentType,
      fileSize,
    },
    request
  );
}

/**
 * Log successful upload
 */
export async function logUploadSucceeded(
  inviteId: string,
  inviteLabel: string,
  cdnId: string,
  fileKey: string,
  contentType: string,
  fileSize: number,
  extension: string,
  etag?: string,
  request?: NextRequest
): Promise<void> {
  await logInviteAudit(
    'INVITE_UPLOAD_SUCCEEDED',
    inviteLabel,
    {
      inviteId,
      cdnId,
      label: inviteLabel,
      fileKey,
      contentType,
      fileSize,
      extension,
      etag,
    },
    request
  );
}

/**
 * Log failed upload
 */
export async function logUploadFailed(
  inviteId: string,
  inviteLabel: string,
  cdnId: string,
  fileKey: string,
  contentType: string,
  fileSize: number,
  error: string,
  request?: NextRequest
): Promise<void> {
  await logInviteAudit(
    'INVITE_UPLOAD_FAILED',
    inviteLabel,
    {
      inviteId,
      cdnId,
      label: inviteLabel,
      fileKey,
      contentType,
      fileSize,
      error,
    },
    request
  );
}
