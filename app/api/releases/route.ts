import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireSuperAdmin } from '@/lib/auth';
import { z } from 'zod';

const createReleaseSchema = z.object({
  commitHash: z.string(),
  commitMessage: z.string(),
  branch: z.string(),
  author: z.string(),
  timestamp: z.string(),
  version: z.string().optional(),
  features: z.array(z.string()).optional(),
  changes: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Require super admin access
    await requireSuperAdmin(request);
    
    const body = await request.json();
    const releaseData = createReleaseSchema.parse(body);

    // Create release document
    const releaseDoc = await adminDb.collection('releases').add({
      ...releaseData,
      createdAt: new Date(),
      deployedAt: new Date(),
      status: 'deployed',
    });

    return NextResponse.json({ 
      success: true, 
      releaseId: releaseDoc.id,
      message: 'Release stored successfully' 
    });
  } catch (error) {
    console.error('Error storing release:', error);
    return NextResponse.json({ 
      error: 'Failed to store release',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Require super admin access
    await requireSuperAdmin(request);
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get releases ordered by creation date (newest first)
    const releasesQuery = adminDb
      .collection('releases')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset);

    const releasesSnapshot = await releasesQuery.get();
    const releases = releasesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get total count
    const totalSnapshot = await adminDb.collection('releases').get();
    const total = totalSnapshot.size;

    return NextResponse.json({
      releases,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error('Error fetching releases:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch releases',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
