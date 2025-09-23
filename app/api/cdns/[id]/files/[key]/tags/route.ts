import { NextRequest, NextResponse } from 'next/server';
import { adminAuth as auth } from '@/lib/firebase/admin';
import { adminDb as db } from '@/lib/firebase/admin';
import { z } from 'zod';

const updateTagsSchema = z.object({
  tags: z.array(z.string()).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; key: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const { id: cdnId, key } = await params;
    const body = await request.json();
    const { tags } = updateTagsSchema.parse(body);

    // Verify user has access to this CDN
    const cdnDoc = await db.collection('cdns').doc(cdnId).get();
    if (!cdnDoc.exists) {
      return NextResponse.json({ error: 'CDN not found' }, { status: 404 });
    }

    const cdn = cdnDoc.data()!;
    if (!cdn.allowedUsers.includes(userId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update file metadata with tags
    // Use a safer document ID by encoding the key
    const docId = `${cdnId}/${encodeURIComponent(key)}`;
    const fileRef = db.collection('files').doc(docId);
    await fileRef.set({
      cdnId,
      key,
      tags: tags || [],
      updatedAt: new Date(),
      updatedBy: userId,
    }, { merge: true });

    // Log the action
    try {
      await db.collection('auditLogs').add({
        cdnId,
        action: 'UPDATE_FILE_TAGS',
        actorId: userId,
        actorEmail: decodedToken.email,
        details: { key, tags: tags || [] },
        createdAt: new Date(),
      });
    } catch (error) {
      console.warn('Failed to log tag update action:', error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating file tags:', error);
    return NextResponse.json({ error: 'Failed to update tags' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; key: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const { id: cdnId, key } = await params;

    // Verify user has access to this CDN
    const cdnDoc = await db.collection('cdns').doc(cdnId).get();
    if (!cdnDoc.exists) {
      return NextResponse.json({ error: 'CDN not found' }, { status: 404 });
    }

    const cdn = cdnDoc.data()!;
    if (!cdn.allowedUsers.includes(userId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get file metadata
    // Use the same document ID encoding as in PUT
    const docId = `${cdnId}/${encodeURIComponent(key)}`;
    const fileRef = db.collection('files').doc(docId);
    const fileDoc = await fileRef.get();
    
    if (!fileDoc.exists) {
      return NextResponse.json({ tags: [] });
    }

    const fileData = fileDoc.data()!;
    return NextResponse.json({ tags: fileData.tags || [] });
  } catch (error) {
    console.error('Error getting file tags:', error);
    return NextResponse.json({ error: 'Failed to get tags' }, { status: 500 });
  }
}
