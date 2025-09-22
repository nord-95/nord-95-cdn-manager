import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import { getUserFromHeader, requireCdnAccess } from '@/lib/auth';

const logActionSchema = z.object({
  action: z.string().min(1),
  details: z.record(z.any()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireCdnAccess(request, id);

    // Get audit logs for this CDN
    // First try with orderBy, if it fails, try without
    let auditQuery;
    try {
      auditQuery = await adminDb
        .collection('auditLogs')
        .where('cdnId', '==', id)
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get();
    } catch (indexError) {
      console.warn('Index not found, fetching without orderBy:', indexError);
      // If the composite index doesn't exist, fetch without orderBy
      auditQuery = await adminDb
        .collection('auditLogs')
        .where('cdnId', '==', id)
        .limit(100)
        .get();
    }

    const logs = auditQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sort manually if we couldn't use orderBy
    logs.sort((a, b) => {
      const aTime = (a as any).createdAt?.seconds || 0;
      const bTime = (b as any).createdAt?.seconds || 0;
      return bTime - aTime; // Descending order
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error in GET /api/cdns/[id]/audit:', error);
    // Return empty logs instead of error to not break the UI
    return NextResponse.json({ logs: [] });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserFromHeader(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this CDN
    await requireCdnAccess(request, id);

    const body = await request.json();
    const { action, details } = logActionSchema.parse(body);

    // Create audit log entry
    await adminDb.collection('auditLogs').add({
      actorUid: user.uid,
      actorEmail: user.email,
      action,
      cdnId: id,
      details: details || {},
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/cdns/[id]/audit:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
