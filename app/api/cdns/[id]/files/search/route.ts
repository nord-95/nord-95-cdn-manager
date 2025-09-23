import { NextRequest, NextResponse } from 'next/server';
import { adminAuth as auth } from '@/lib/firebase/admin';
import { adminDb as db } from '@/lib/firebase/admin';
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
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const { id: cdnId } = await params;
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const tagsParam = searchParams.get('tags');
    const tags = tagsParam ? tagsParam.split(',') : [];

    // Verify user has access to this CDN
    const cdnDoc = await db.collection('cdns').doc(cdnId).get();
    if (!cdnDoc.exists) {
      return NextResponse.json({ error: 'CDN not found' }, { status: 404 });
    }

    const cdn = cdnDoc.data()!;
    if (!cdn.allowedUsers.includes(userId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get files from R2 (we'll need to implement this)
    // For now, we'll return a simple response
    // In a real implementation, you'd search through your file metadata
    
    let files: any[] = [];
    
    if (query || tags.length > 0) {
      // Search through file metadata
      let fileQuery = db.collection('files').where('cdnId', '==', cdnId);
      
      if (tags.length > 0) {
        fileQuery = fileQuery.where('tags', 'array-contains-any', tags);
      }
      
      const fileDocs = await fileQuery.get();
      files = fileDocs.docs.map(doc => ({
        key: doc.data().key,
        tags: doc.data().tags || [],
        ...doc.data()
      }));
      
      // Filter by query if provided
      if (query) {
        files = files.filter(file => 
          file.key.toLowerCase().includes(query.toLowerCase())
        );
      }
    }

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error searching files:', error);
    return NextResponse.json({ error: 'Failed to search files' }, { status: 500 });
  }
}
