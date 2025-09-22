import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireCdnAccess } from '@/lib/auth';
import { listObjects } from '@/lib/r2';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireCdnAccess(request, id);
    
    const cdnDoc = await adminDb.collection('cdns').doc(id).get();
    if (!cdnDoc.exists) {
      return NextResponse.json({ error: 'CDN not found' }, { status: 404 });
    }

    const cdnData = cdnDoc.data();
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token') || undefined;

    const result = await listObjects(cdnData!.bucket, cdnData!.prefix || '', token);
    
    const objects = result.Contents?.map(obj => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified,
      etag: obj.ETag,
    })) || [];

    return NextResponse.json({
      objects,
      isTruncated: result.IsTruncated,
      nextToken: result.NextContinuationToken,
    });
  } catch (error) {
    console.error('Error in GET /api/cdns/[id]/files:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
