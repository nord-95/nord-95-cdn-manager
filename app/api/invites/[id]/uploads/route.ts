import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import { requireSuperAdmin } from '@/lib/auth';
import { UploadListQuerySchema } from '@/lib/validators/invites';

// GET /api/invites/[id]/uploads - List uploads for an invite
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSuperAdmin(request);
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const query = UploadListQuerySchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    });
    
    // Verify invite exists
    const inviteDoc = await adminDb.collection('invites').doc(id).get();
    if (!inviteDoc.exists) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }
    
    // Build Firestore query for uploads
    let firestoreQuery = adminDb
      .collection('invites')
      .doc(id)
      .collection('uploads')
      .orderBy('uploadedAt', 'desc');
    
    // Apply pagination
    const offset = (query.page - 1) * query.limit;
    firestoreQuery = firestoreQuery.offset(offset).limit(query.limit);
    
    // Execute query
    const snapshot = await firestoreQuery.get();
    const uploads = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    // Get total count for pagination
    const totalSnapshot = await adminDb
      .collection('invites')
      .doc(id)
      .collection('uploads')
      .get();
    const totalCount = totalSnapshot.size;
    
    return NextResponse.json({
      uploads,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / query.limit),
      },
    });
    
  } catch (error) {
    console.error('Error listing uploads:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
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
