import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import { verifyInviteToken } from '@/lib/invites/token';
import { rateLimitInviteEndpoint } from '@/lib/ratelimit';
import { createInvitePostPolicy } from '@/lib/r2-post';
import { buildFileKey, resolvePrefixTokens } from '@/lib/invites/prefix';
import { generateFileSuffix } from '@/lib/invites/token';
import { validateMimeType, validateFileSize, getFileExtension } from '@/lib/invites/sanitize';
import { InviteSignPostSchema, InviteStatus } from '@/lib/validators/invites';
import { logUploadRequested } from '@/lib/audit';

// POST /api/invites/[token]/sign-post - Generate R2 POST policy (public)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    
    // Parse and validate request body
    const { contentType, filename } = InviteSignPostSchema.parse(body);
    
    // Hash the token to look up the invite
    const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
    
    // Rate limiting
    const rateLimitResult = rateLimitInviteEndpoint(request, tokenHash, 'sign');
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          }
        }
      );
    }
    
    // Find invite by token hash
    const inviteQuery = await adminDb
      .collection('invites')
      .where('tokenHash', '==', tokenHash)
      .limit(1)
      .get();
    
    if (inviteQuery.empty) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }
    
    const inviteDoc = inviteQuery.docs[0];
    const inviteData = inviteDoc.data();
    
    // Validate invite status and expiration
    const now = new Date();
    const expiresAt = inviteData.expiresAt.toDate();
    
    if (inviteData.status !== InviteStatus.enum.ACTIVE) {
      return NextResponse.json({ error: 'Invite is not active' }, { status: 400 });
    }
    
    if (now > expiresAt) {
      return NextResponse.json({ error: 'Invite has expired' }, { status: 400 });
    }
    
    if (inviteData.remainingUses <= 0 && inviteData.maxUses !== null) {
      return NextResponse.json({ error: 'Invite has no remaining uses' }, { status: 400 });
    }
    
    // Validate content type and file extension
    if (!validateMimeType(contentType, inviteData.allowedMimeTypes)) {
      return NextResponse.json({ 
        error: `Content type ${contentType} is not allowed`,
        allowedTypes: inviteData.allowedMimeTypes 
      }, { status: 400 });
    }
    
    const extension = getFileExtension(filename);
    if (!inviteData.allowedExtensions.includes(extension)) {
      return NextResponse.json({ 
        error: `File extension ${extension} is not allowed`,
        allowedExtensions: inviteData.allowedExtensions 
      }, { status: 400 });
    }
    
    // Get CDN configuration
    const cdnDoc = await adminDb.collection('cdns').doc(inviteData.cdnId).get();
    if (!cdnDoc.exists) {
      return NextResponse.json({ error: 'CDN not found' }, { status: 404 });
    }
    
    const cdnData = cdnDoc.data()!;
    
    // Generate file key
    const suffix = generateFileSuffix();
    const resolvedPrefix = resolvePrefixTokens(inviteData.uploadPrefix, inviteData.label);
    const fileKey = buildFileKey(resolvedPrefix, filename, suffix);
    
    // Create POST policy
    const postPolicy = await createInvitePostPolicy(
      cdnData.bucket,
      fileKey,
      contentType,
      inviteData.maxSizeBytes
    );
    
    // Log upload request
    await logUploadRequested(
      inviteDoc.id,
      inviteData.label,
      inviteData.cdnId,
      fileKey,
      contentType,
      0, // Size unknown at this point
      request
    );
    
    return NextResponse.json({
      url: postPolicy.url,
      fields: postPolicy.fields,
      key: fileKey,
    });
    
  } catch (error) {
    console.error('Error creating POST policy:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
