import { z } from 'zod';

// Invite status enum
export const InviteStatus = z.enum(['ACTIVE', 'REVOKED', 'EXPIRED']);
export type InviteStatus = z.infer<typeof InviteStatus>;

// Upload status enum
export const UploadStatus = z.enum(['SUCCESS', 'FAILED']);
export type UploadStatus = z.infer<typeof UploadStatus>;

// Default allowed MIME types and extensions
export const DEFAULT_ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg', 
  'image/webp',
  'application/pdf',
  'video/mp4',
  'application/zip',
  'image/svg+xml'
] as const;

export const DEFAULT_ALLOWED_EXTENSIONS = [
  'png',
  'jpg',
  'jpeg',
  'webp',
  'pdf',
  'mp4',
  'zip',
  'svg'
] as const;

// Invite creation schema
export const InviteCreateSchema = z.object({
  label: z.string().min(1).max(100),
  cdnId: z.string().min(1),
  allowedMimeTypes: z.array(z.string()).min(1),
  allowedExtensions: z.array(z.string()).min(1),
  maxSizeBytes: z.number().positive().max(100 * 1024 * 1024), // Max 100MB
  maxUses: z.number().positive().nullable(),
  expiresAt: z.date().nullable(), // Allow null for never expire
  uploadPrefix: z.string().min(1).max(200),
  notifyEmails: z.array(z.string().email()).optional(),
  notes: z.string().max(500).optional(),
});

// Invite update schema (excludes token-related fields)
export const InviteUpdateSchema = InviteCreateSchema.partial().omit({
  // Cannot update token-related fields
});

// Public invite metadata schema (what's exposed to invitees)
export const InviteMetadataSchema = z.object({
  label: z.string(),
  cdnDisplayName: z.string(),
  allowedMimeTypes: z.array(z.string()),
  allowedExtensions: z.array(z.string()),
  maxSizeBytes: z.number(),
  expiresAt: z.date().nullable(),
  status: InviteStatus,
  remainingUses: z.number(),
  maxUses: z.number().nullable(),
});

// Invite sign-post request schema
export const InviteSignPostSchema = z.object({
  contentType: z.string(),
  filename: z.string().min(1).max(200),
});

// Invite commit request schema
export const InviteCommitSchema = z.object({
  key: z.string().min(1).max(1024),
  size: z.number().positive(),
  contentType: z.string(),
  extension: z.string(),
  etag: z.string().optional(),
});

// Firestore document schemas
export const InviteDocumentSchema = z.object({
  id: z.string(),
  tokenHash: z.string(),
  label: z.string(),
  cdnId: z.string(),
  allowedMimeTypes: z.array(z.string()),
  allowedExtensions: z.array(z.string()),
  maxSizeBytes: z.number(),
  maxUses: z.number().nullable(),
  remainingUses: z.number(),
  expiresAt: z.any(), // Firestore timestamp
  status: InviteStatus,
  uploadPrefix: z.string(),
  notifyEmails: z.array(z.string()).optional(),
  notes: z.string().optional(),
  createdBy: z.string(),
  createdAt: z.any(), // Firestore timestamp
  updatedAt: z.any(), // Firestore timestamp
});

export const UploadDocumentSchema = z.object({
  key: z.string(),
  size: z.number(),
  contentType: z.string(),
  extension: z.string(),
  etag: z.string().nullable(),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  uploadedAt: z.any(), // Firestore timestamp
  status: UploadStatus,
  error: z.string().nullable(),
});

// Query parameters for listing invites
export const InviteListQuerySchema = z.object({
  status: InviteStatus.optional(),
  cdnId: z.string().optional(),
  q: z.string().optional(), // Search query
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// Query parameters for listing uploads
export const UploadListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// Type exports
export type InviteCreate = z.infer<typeof InviteCreateSchema>;
export type InviteUpdate = z.infer<typeof InviteUpdateSchema>;
export type InviteMetadata = z.infer<typeof InviteMetadataSchema>;
export type InviteSignPost = z.infer<typeof InviteSignPostSchema>;
export type InviteCommit = z.infer<typeof InviteCommitSchema>;
export type InviteDocument = z.infer<typeof InviteDocumentSchema>;
export type UploadDocument = z.infer<typeof UploadDocumentSchema>;
export type InviteListQuery = z.infer<typeof InviteListQuerySchema>;
export type UploadListQuery = z.infer<typeof UploadListQuerySchema>;
