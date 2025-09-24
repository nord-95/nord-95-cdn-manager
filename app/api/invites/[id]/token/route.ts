import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireSuperAdmin } from '@/lib/auth';
import { generateInviteToken } from '@/lib/invites/token';

// GET /api/invites/[id]/token - Get invite token (Super Admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSuperAdmin(request);
    const { id } = await params;

    // Get invite document
    const inviteDoc = await adminDb.collection('invites').doc(id).get();
    if (!inviteDoc.exists) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    const inviteData = inviteDoc.data();
    if (!inviteData) {
      return NextResponse.json({ error: 'Invite data not found' }, { status: 404 });
    }

    // Generate a new token for this invite
    // Note: This creates a new token each time, but the old token will still work
    // until the invite is revoked or expires
    const token = generateInviteToken();
    
    // Update the invite with the new token hash
    const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
    await inviteDoc.ref.update({
      tokenHash,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      token,
      inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`,
    });

  } catch (error) {
    console.error('Error getting invite token:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
