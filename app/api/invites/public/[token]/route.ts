import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyInviteToken } from '@/lib/invites/token';
import { rateLimitInviteEndpoint } from '@/lib/ratelimit';
import { InviteStatus } from '@/lib/validators/invites';

// GET /api/invites/[token] - Get invite metadata (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    // Hash the token to look up the invite
    const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
    
    // Rate limiting
    const rateLimitResult = rateLimitInviteEndpoint(request, tokenHash, 'meta');
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
    
    // Check if invite is expired
    const now = new Date();
    const expiresAt = inviteData.expiresAt.toDate();
    const isExpired = now > expiresAt;
    
    // Update status if expired
    if (isExpired && inviteData.status === InviteStatus.enum.ACTIVE) {
      await adminDb.collection('invites').doc(inviteDoc.id).update({
        status: InviteStatus.enum.EXPIRED,
        updatedAt: new Date(),
      });
      inviteData.status = InviteStatus.enum.EXPIRED;
    }
    
    // Get CDN display name
    const cdnDoc = await adminDb.collection('cdns').doc(inviteData.cdnId).get();
    const cdnDisplayName = cdnDoc.exists ? cdnDoc.data()?.name || 'Unknown CDN' : 'Unknown CDN';
    
    // Return public metadata
    return NextResponse.json({
      label: inviteData.label,
      cdnDisplayName,
      allowedMimeTypes: inviteData.allowedMimeTypes,
      allowedExtensions: inviteData.allowedExtensions,
      maxSizeBytes: inviteData.maxSizeBytes,
      expiresAt: expiresAt.toISOString(),
      status: inviteData.status,
      remainingUses: inviteData.remainingUses,
      maxUses: inviteData.maxUses,
    });
    
  } catch (error) {
    console.error('Error getting invite metadata:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
