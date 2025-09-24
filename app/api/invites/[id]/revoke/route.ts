import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireSuperAdmin } from '@/lib/auth';
import { InviteStatus } from '@/lib/validators/invites';
import { logInviteStatusChange } from '@/lib/audit';

// POST /api/invites/[id]/revoke - Revoke or restore invite
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSuperAdmin(request);
    const { id } = await params;
    
    // Get existing invite
    const inviteDoc = await adminDb.collection('invites').doc(id).get();
    if (!inviteDoc.exists) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }
    
    const inviteData = inviteDoc.data()!;
    const currentStatus = inviteData.status;
    
    // Toggle status: REVOKED <-> ACTIVE
    const newStatus = currentStatus === InviteStatus.enum.REVOKED 
      ? InviteStatus.enum.ACTIVE 
      : InviteStatus.enum.REVOKED;
    
    // Update invite status
    await adminDb.collection('invites').doc(id).update({
      status: newStatus,
      updatedAt: new Date(),
    });
    
    // Log audit event
    await logInviteStatusChange(
      id,
      inviteData.label,
      inviteData.cdnId,
      newStatus === InviteStatus.enum.REVOKED ? 'REVOKED' : 'RESTORED',
      user.uid,
      request
    );
    
    return NextResponse.json({
      id,
      status: newStatus,
      message: newStatus === InviteStatus.enum.REVOKED 
        ? 'Invite revoked successfully' 
        : 'Invite restored successfully',
    });
    
  } catch (error) {
    console.error('Error revoking/restoring invite:', error);
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
