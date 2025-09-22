import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import { getUserFromHeader, requireCdnAccess, requireSuperAdmin } from '@/lib/auth';

const updateCdnSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  publicBase: z.string().url().optional(),
  bucket: z.string().min(1).max(50).optional(),
  prefix: z.string().optional(),
});

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

    return NextResponse.json({
      id: cdnDoc.id,
      ...cdnDoc.data(),
    });
  } catch (error) {
    console.error('Error in GET /api/cdns/[id]:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserFromHeader(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only super admin can update CDN settings
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const updateData = updateCdnSchema.parse(body);

    const cdnDoc = await adminDb.collection('cdns').doc(id).get();
    if (!cdnDoc.exists) {
      return NextResponse.json({ error: 'CDN not found' }, { status: 404 });
    }

    // If updating name, check for conflicts
    if (updateData.name) {
      const existingQuery = await adminDb.collection('cdns')
        .where('name', '==', updateData.name)
        .where('__name__', '!=', id)
        .limit(1)
        .get();
      
      if (!existingQuery.empty) {
        return NextResponse.json({ error: 'CDN with this name already exists' }, { status: 400 });
      }
    }

    await adminDb.collection('cdns').doc(id).update({
      ...updateData,
      updatedAt: new Date(),
    });

    // Log the action
    await adminDb.collection('auditLogs').add({
      actorUid: user.uid,
      action: 'UPDATE_CDN',
      cdnId: id,
      details: updateData,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PATCH /api/cdns/[id]:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireSuperAdmin(request);
    
    const cdnDoc = await adminDb.collection('cdns').doc(id).get();
    if (!cdnDoc.exists) {
      return NextResponse.json({ error: 'CDN not found' }, { status: 404 });
    }

    await adminDb.collection('cdns').doc(id).delete();

    // Log the action
    await adminDb.collection('auditLogs').add({
      actorUid: user.uid,
      action: 'DELETE_CDN',
      cdnId: id,
      details: { name: cdnDoc.data()?.name },
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/cdns/[id]:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
