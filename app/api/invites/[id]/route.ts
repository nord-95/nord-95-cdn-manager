import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import { requireSuperAdmin } from '@/lib/auth';
import { InviteUpdateSchema, InviteDocument } from '@/lib/validators/invites';
import { resolvePrefixTokens } from '@/lib/invites/prefix';
import { logInviteUpdated } from '@/lib/audit';

// GET /api/invites/[id] - Get invite details
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
    
    const inviteData = inviteDoc.data() as InviteDocument;
    
    return NextResponse.json({
      id: inviteDoc.id,
      ...inviteData,
    });
    
  } catch (error) {
    console.error('Error getting invite:', error);
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/invites/[id] - Update invite
export async function PATCH(
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
    
    const existingData = inviteDoc.data()!;
    const body = await request.json();
    
    // Parse and validate update data
    const updateData = InviteUpdateSchema.parse(body);
    
    // Prepare update object
    const updateFields: any = {
      updatedAt: new Date(),
    };
    
    // Track changes for audit log
    const changes: Record<string, any> = {};
    
    // Update allowed fields
    if (updateData.label !== undefined) {
      updateFields.label = updateData.label;
      changes.label = { from: existingData.label, to: updateData.label };
      
      // Re-resolve upload prefix if label changed
      if (updateData.uploadPrefix !== undefined) {
        updateFields.uploadPrefix = resolvePrefixTokens(
          updateData.uploadPrefix,
          updateData.label
        );
      } else {
        updateFields.uploadPrefix = resolvePrefixTokens(
          existingData.uploadPrefix,
          updateData.label
        );
      }
    }
    
    if (updateData.cdnId !== undefined) {
      // Verify CDN exists
      const cdnDoc = await adminDb.collection('cdns').doc(updateData.cdnId).get();
      if (!cdnDoc.exists) {
        return NextResponse.json({ error: 'CDN not found' }, { status: 404 });
      }
      updateFields.cdnId = updateData.cdnId;
      changes.cdnId = { from: existingData.cdnId, to: updateData.cdnId };
    }
    
    if (updateData.allowedMimeTypes !== undefined) {
      updateFields.allowedMimeTypes = updateData.allowedMimeTypes;
      changes.allowedMimeTypes = { from: existingData.allowedMimeTypes, to: updateData.allowedMimeTypes };
    }
    
    if (updateData.allowedExtensions !== undefined) {
      updateFields.allowedExtensions = updateData.allowedExtensions;
      changes.allowedExtensions = { from: existingData.allowedExtensions, to: updateData.allowedExtensions };
    }
    
    if (updateData.maxSizeBytes !== undefined) {
      updateFields.maxSizeBytes = updateData.maxSizeBytes;
      changes.maxSizeBytes = { from: existingData.maxSizeBytes, to: updateData.maxSizeBytes };
    }
    
    if (updateData.maxUses !== undefined) {
      updateFields.maxUses = updateData.maxUses;
      updateFields.remainingUses = updateData.maxUses || 0;
      changes.maxUses = { from: existingData.maxUses, to: updateData.maxUses };
    }
    
    if (updateData.expiresAt !== undefined) {
      updateFields.expiresAt = updateData.expiresAt;
      changes.expiresAt = { from: existingData.expiresAt, to: updateData.expiresAt };
    }
    
    if (updateData.uploadPrefix !== undefined && updateData.label === undefined) {
      updateFields.uploadPrefix = resolvePrefixTokens(
        updateData.uploadPrefix,
        existingData.label
      );
      changes.uploadPrefix = { from: existingData.uploadPrefix, to: updateFields.uploadPrefix };
    }
    
    if (updateData.notifyEmails !== undefined) {
      updateFields.notifyEmails = updateData.notifyEmails;
      changes.notifyEmails = { from: existingData.notifyEmails, to: updateData.notifyEmails };
    }
    
    if (updateData.notes !== undefined) {
      updateFields.notes = updateData.notes;
      changes.notes = { from: existingData.notes, to: updateData.notes };
    }
    
    // Update invite
    await adminDb.collection('invites').doc(id).update(updateFields);
    
    // Log audit event
    await logInviteUpdated(
      id,
      existingData.label,
      existingData.cdnId,
      user.uid,
      changes,
      request
    );
    
    // Return updated invite
    const updatedDoc = await adminDb.collection('invites').doc(id).get();
    return NextResponse.json({
      id: updatedDoc.id,
      ...updatedDoc.data(),
    });
    
  } catch (error) {
    console.error('Error updating invite:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
