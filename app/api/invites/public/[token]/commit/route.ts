import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import { verifyInviteToken } from '@/lib/invites/token';
import { rateLimitInviteEndpoint } from '@/lib/ratelimit';
import { validateMimeType, validateFileSize, getFileExtension } from '@/lib/invites/sanitize';
import { InviteCommitSchema, InviteStatus, UploadStatus } from '@/lib/validators/invites';
import { logUploadSucceeded, logUploadFailed } from '@/lib/audit';
import { getClientIP } from '@/lib/ratelimit';

// POST /api/invites/[token]/commit - Commit upload and decrement uses (public)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    
    // Parse and validate request body
    const commitData = InviteCommitSchema.parse(body);
    
    // Hash the token to look up the invite
    const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
    
    // Rate limiting
    const rateLimitResult = rateLimitInviteEndpoint(request, tokenHash, 'commit');
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
    const expiresAt = inviteData.expiresAt ? inviteData.expiresAt.toDate() : null;
    
    if (inviteData.status !== InviteStatus.enum.ACTIVE) {
      return NextResponse.json({ error: 'Invite is not active' }, { status: 400 });
    }
    
    if (expiresAt && now > expiresAt) {
      return NextResponse.json({ error: 'Invite has expired' }, { status: 400 });
    }
    
    if (inviteData.remainingUses <= 0 && inviteData.maxUses !== null) {
      return NextResponse.json({ error: 'Invite has no remaining uses' }, { status: 400 });
    }
    
    // Validate file data
    if (!validateMimeType(commitData.contentType, inviteData.allowedMimeTypes)) {
      return NextResponse.json({ 
        error: `Content type ${commitData.contentType} is not allowed`,
        allowedTypes: inviteData.allowedMimeTypes 
      }, { status: 400 });
    }
    
    if (!inviteData.allowedExtensions.includes(commitData.extension)) {
      return NextResponse.json({ 
        error: `File extension ${commitData.extension} is not allowed`,
        allowedExtensions: inviteData.allowedExtensions 
      }, { status: 400 });
    }
    
    if (!validateFileSize(commitData.size, inviteData.maxSizeBytes)) {
      return NextResponse.json({ 
        error: `File size ${commitData.size} bytes exceeds maximum ${inviteData.maxSizeBytes} bytes` 
      }, { status: 400 });
    }
    
    // Get CDN configuration
    const cdnDoc = await adminDb.collection('cdns').doc(inviteData.cdnId).get();
    if (!cdnDoc.exists) {
      return NextResponse.json({ error: 'CDN not found' }, { status: 404 });
    }
    
    const cdnData = cdnDoc.data()!;
    
    // Use Firestore transaction to atomically decrement uses and record upload
    const result = await adminDb.runTransaction(async (transaction) => {
      // Re-read invite to get latest remainingUses
      const inviteRef = adminDb.collection('invites').doc(inviteDoc.id);
      const currentInviteDoc = await transaction.get(inviteRef);
      
      if (!currentInviteDoc.exists) {
        throw new Error('Invite not found');
      }
      
      const currentInviteData = currentInviteDoc.data()!;
      
      // Check remaining uses again (double-check)
      if (currentInviteData.remainingUses <= 0 && currentInviteData.maxUses !== null) {
        throw new Error('Invite has no remaining uses');
      }
      
      // Decrement remaining uses
      const newRemainingUses = currentInviteData.maxUses === null 
        ? currentInviteData.remainingUses 
        : Math.max(0, currentInviteData.remainingUses - 1);
      
      transaction.update(inviteRef, {
        remainingUses: newRemainingUses,
        updatedAt: new Date(),
      });
      
      // Record upload
      const uploadRef = adminDb
        .collection('invites')
        .doc(inviteDoc.id)
        .collection('uploads')
        .doc();
      
      const uploadData = {
        key: commitData.key,
        size: commitData.size,
        contentType: commitData.contentType,
        extension: commitData.extension,
        etag: commitData.etag || null,
        ip: getClientIP(request),
        userAgent: request.headers.get('user-agent') || null,
        uploadedAt: new Date(),
        status: UploadStatus.enum.SUCCESS,
        error: null,
      };
      
      transaction.set(uploadRef, uploadData);
      
      return {
        uploadId: uploadRef.id,
        remainingUses: newRemainingUses,
        uploadData,
      };
    });
    
    // Log successful upload
    await logUploadSucceeded(
      inviteDoc.id,
      inviteData.label,
      inviteData.cdnId,
      commitData.key,
      commitData.contentType,
      commitData.size,
      commitData.extension,
      commitData.etag,
      request
    );
    
    // Generate URLs for the uploaded file
    const publicUrl = cdnData.publicBase 
      ? `${cdnData.publicBase}/${commitData.key}`
      : null;
    
    const signedUrl = cdnData.publicBase 
      ? null 
      : `${process.env.NEXT_PUBLIC_APP_URL}/api/cdns/${inviteData.cdnId}/files/${encodeURIComponent(commitData.key)}/sign-get`;
    
    return NextResponse.json({
      uploadId: result.uploadId,
      remainingUses: result.remainingUses,
      publicUrl,
      signedUrl,
      key: commitData.key,
    });
    
  } catch (error) {
    console.error('Error committing upload:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      if (error.message.includes('Invite has no remaining uses')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      
      if (error.message.includes('Invite not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
