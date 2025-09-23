import { NextRequest, NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebase/admin';
import { requireCdnAccess } from '@/lib/auth';
import { listObjects } from '@/lib/r2';
import { z } from 'zod';

const searchSchema = z.object({
  query: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cdnId } = await params;
    
    // Use proper authentication that handles super admin
    const user = await requireCdnAccess(request, cdnId);
    console.log('GET /api/cdns/[id]/files/search - User authenticated:', user.uid, 'Role:', user.role);

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const tagsParam = searchParams.get('tags');
    const tags = tagsParam ? tagsParam.split(',') : [];

    // Get CDN info
    const cdnDoc = await db.collection('cdns').doc(cdnId).get();
    if (!cdnDoc.exists) {
      return NextResponse.json({ error: 'CDN not found' }, { status: 404 });
    }

    const cdnData = cdnDoc.data()!;
    console.log('GET /api/cdns/[id]/files/search - CDN data:', cdnData.name, cdnData.bucket);

    // Get all files from R2
    const result = await listObjects(cdnData.bucket, cdnData.prefix || '');
    const r2Files = result.Contents?.map(obj => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified,
      etag: obj.ETag,
    })) || [];

    console.log('GET /api/cdns/[id]/files/search - Found', r2Files.length, 'files in R2');

    // Get file metadata from Firestore
    const fileMetadataQuery = db.collection('files').where('cdnId', '==', cdnId);
    const fileMetadataDocs = await fileMetadataQuery.get();
    const fileMetadata = new Map();
    
    fileMetadataDocs.docs.forEach(doc => {
      const data = doc.data();
      fileMetadata.set(data.key, data);
    });

    console.log('GET /api/cdns/[id]/files/search - Found', fileMetadata.size, 'files with metadata');

    // Combine R2 files with Firestore metadata
    let files = r2Files.map(file => ({
      ...file,
      tags: fileMetadata.get(file.key)?.tags || [],
      ...fileMetadata.get(file.key)
    }));

    // Apply search filters
    if (query) {
      files = files.filter(file => 
        file.key.toLowerCase().includes(query.toLowerCase())
      );
      console.log('GET /api/cdns/[id]/files/search - After query filter:', files.length, 'files');
    }

    if (tags.length > 0) {
      files = files.filter(file => 
        file.tags && file.tags.some((tag: string) => tags.includes(tag))
      );
      console.log('GET /api/cdns/[id]/files/search - After tags filter:', files.length, 'files');
    }

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error searching files:', error);
    return NextResponse.json({ error: 'Failed to search files' }, { status: 500 });
  }
}
