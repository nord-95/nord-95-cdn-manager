import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { r2 } from '@/lib/r2';

export interface PostPolicyFields {
  key: string;
  'Content-Type': string;
  'content-length-range': string;
  [key: string]: string;
}

export interface PostPolicyResult {
  url: string;
  fields: PostPolicyFields;
}

/**
 * Create a presigned POST policy for R2 uploads with security constraints
 */
export async function createInvitePostPolicy(
  bucket: string,
  key: string,
  contentType: string,
  maxSizeBytes: number,
  expiresIn: number = 3600 // 1 hour
): Promise<PostPolicyResult> {
  const client = r2();

  const result = await createPresignedPost(client, {
    Bucket: bucket,
    Key: key,
    Fields: {
      'Content-Type': contentType,
    },
    Conditions: [
      ['content-length-range', 0, maxSizeBytes],
      ['eq', '$Content-Type', contentType],
      ['starts-with', '$key', key.split('/').slice(0, -1).join('/') + '/'],
    ],
    Expires: expiresIn,
  });

  return {
    url: result.url,
    fields: result.fields as PostPolicyFields,
  };
}

/**
 * Validate POST policy constraints for invite uploads
 */
export function validatePostPolicyConstraints(
  contentType: string,
  allowedMimeTypes: string[],
  fileSize: number,
  maxSizeBytes: number,
  key: string,
  expectedPrefix: string
): { valid: boolean; error?: string } {
  // Validate content type
  if (!allowedMimeTypes.includes(contentType)) {
    return {
      valid: false,
      error: `Content type ${contentType} is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
    };
  }

  // Validate file size
  if (fileSize <= 0 || fileSize > maxSizeBytes) {
    return {
      valid: false,
      error: `File size ${fileSize} bytes is invalid. Maximum allowed: ${maxSizeBytes} bytes`,
    };
  }

  // Validate key prefix
  if (!key.startsWith(expectedPrefix)) {
    return {
      valid: false,
      error: `File key ${key} does not start with expected prefix ${expectedPrefix}`,
    };
  }

  return { valid: true };
}
