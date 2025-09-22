import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireCdnAccess } from '@/lib/auth';
import { deleteObject } from '@/lib/r2';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; key: string }> }
) {
  try {
    const { id, key } = await params;
    const user = await requireCdnAccess(request, id);
    
    const cdnDoc = await adminDb.collection('cdns').doc(id).get();
    if (!cdnDoc.exists) {
      return NextResponse.json({ error: 'CDN not found' }, { status: 404 });
    }

    const cdnData = cdnDoc.data();
    const fullKey = cdnData!.prefix ? `${cdnData!.prefix}/${key}` : key;
    
    await deleteObject(cdnData!.bucket, fullKey);

    // Log the action
    await adminDb.collection('auditLogs').add({
      actorUid: user.uid,
      action: 'DELETE_FILE',
      cdnId: id,
      details: { key: fullKey },
      createdAt: new Date(),
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/cdns/[id]/files/[key]:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
