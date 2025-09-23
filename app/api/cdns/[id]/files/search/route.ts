import { NextRequest, NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebase/admin';
import { requireCdnAccess } from '@/lib/auth';
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
