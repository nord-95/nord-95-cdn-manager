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
    console.log('PUT /api/cdns/[id]/files/[key]/tags - Starting request');
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('PUT /api/cdns/[id]/files/[key]/tags - No auth header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;
    console.log('PUT /api/cdns/[id]/files/[key]/tags - User authenticated:', userId);

    const { id: cdnId, key } = await params;
    console.log('PUT /api/cdns/[id]/files/[key]/tags - Params:', { cdnId, key });
    
    const body = await request.json();
    console.log('PUT /api/cdns/[id]/files/[key]/tags - Request body:', body);
    
    const { tags } = updateTagsSchema.parse(body);
    console.log('PUT /api/cdns/[id]/files/[key]/tags - Parsed tags:', tags);

    // Verify user has access to this CDN
    const cdnDoc = await db.collection('cdns').doc(cdnId).get();
    if (!cdnDoc.exists) {
      console.log('PUT /api/cdns/[id]/files/[key]/tags - CDN not found:', cdnId);
      return NextResponse.json({ error: 'CDN not found' }, { status: 404 });
    }

    const cdn = cdnDoc.data()!;
    if (!cdn.allowedUsers.includes(userId)) {
      console.log('PUT /api/cdns/[id]/files/[key]/tags - Access denied for user:', userId);
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    console.log('PUT /api/cdns/[id]/files/[key]/tags - User has access, proceeding with tag update');

    // Update file metadata with tags
    // Use a safer document ID by encoding the key
    const docId = `${cdnId}/${encodeURIComponent(key)}`;
    console.log('PUT /api/cdns/[id]/files/[key]/tags - Document ID:', docId);
    
    const fileRef = db.collection('files').doc(docId);
    const fileData = {
      cdnId,
      key,
      tags: tags || [],
      updatedAt: new Date(),
      updatedBy: userId,
    };
    console.log('PUT /api/cdns/[id]/files/[key]/tags - File data to save:', fileData);
    
    await fileRef.set(fileData, { merge: true });
    console.log('PUT /api/cdns/[id]/files/[key]/tags - File data saved successfully');

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

    console.log('PUT /api/cdns/[id]/files/[key]/tags - Request completed successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/cdns/[id]/files/[key]/tags - Error updating file tags:', error);
    return NextResponse.json({ 
      error: 'Failed to update tags', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
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
