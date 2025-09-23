import { NextRequest, NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebase/admin';
import { requireCdnAccess } from '@/lib/auth';
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
    
    const { id: cdnId, key } = await params;
    console.log('PUT /api/cdns/[id]/files/[key]/tags - Params:', { cdnId, key });
    
    // Use proper authentication that handles super admin
    const user = await requireCdnAccess(request, cdnId);
    console.log('PUT /api/cdns/[id]/files/[key]/tags - User authenticated:', user.uid, 'Role:', user.role);
    
    const body = await request.json();
    console.log('PUT /api/cdns/[id]/files/[key]/tags - Request body:', body);
    
    const { tags } = updateTagsSchema.parse(body);
    console.log('PUT /api/cdns/[id]/files/[key]/tags - Parsed tags:', tags);

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
      updatedBy: user.uid,
    };
    console.log('PUT /api/cdns/[id]/files/[key]/tags - File data to save:', fileData);
    
    await fileRef.set(fileData, { merge: true });
    console.log('PUT /api/cdns/[id]/files/[key]/tags - File data saved successfully');

    // Log the action
    try {
      await db.collection('auditLogs').add({
        cdnId,
        action: 'UPDATE_FILE_TAGS',
        actorId: user.uid,
        actorEmail: user.email,
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
    const { id: cdnId, key } = await params;

    // Use proper authentication that handles super admin
    const user = await requireCdnAccess(request, cdnId);
    console.log('GET /api/cdns/[id]/files/[key]/tags - User authenticated:', user.uid, 'Role:', user.role);

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
