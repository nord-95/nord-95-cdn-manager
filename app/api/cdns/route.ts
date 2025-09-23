import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import { getUserFromHeader, requireSuperAdmin } from '@/lib/auth';
import { createSlug } from '@/utils/slug';

const createCdnSchema = z.object({
  name: z.string().min(1).max(50),
  publicBase: z.string().url(),
  bucket: z.string().min(1).max(50),
  prefix: z.string().optional().default(''),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromHeader(request);
    console.log('GET /api/cdns - User:', user?.uid, user?.role);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let query: any = adminDb.collection('cdns');
    
    // If user is not super admin, filter by their access
    if (user.role !== 'SUPER_ADMIN') {
      console.log('GET /api/cdns - Filtering by allowedUsers for user:', user.uid);
      query = query.where('allowedUsers', 'array-contains', user.uid);
    } else {
      console.log('GET /api/cdns - Super admin, getting all CDNs');
    }

    const snapshot = await query.get();
    console.log('GET /api/cdns - Found', snapshot.docs.length, 'CDNs');
    
    const cdns = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      console.log('GET /api/cdns - CDN:', doc.id, data.name, 'allowedUsers:', data.allowedUsers);
      return {
        id: doc.id,
        ...data,
      };
    });

    return NextResponse.json({ cdns });
  } catch (error) {
    console.error('Error in GET /api/cdns:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSuperAdmin(request);
    const body = await request.json();
    const { name, publicBase, bucket, prefix } = createCdnSchema.parse(body);

    const slug = createSlug(name);
    
    // Check if CDN with this name already exists
    const existingQuery = await adminDb.collection('cdns').where('name', '==', slug).limit(1).get();
    if (!existingQuery.empty) {
      return NextResponse.json({ error: 'CDN with this name already exists' }, { status: 400 });
    }

    const cdnRef = adminDb.collection('cdns').doc();
    await cdnRef.set({
      name: slug,
      publicBase,
      bucket,
      prefix: prefix || '',
      owners: [user.uid],
      allowedUsers: [],
      createdBy: user.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Log the action
    await adminDb.collection('auditLogs').add({
      actorUid: user.uid,
      action: 'CREATE_CDN',
      cdnId: cdnRef.id,
      details: { name: slug, publicBase, bucket, prefix },
      createdAt: new Date(),
    });

    return NextResponse.json({ id: cdnRef.id, name: slug });
  } catch (error) {
    console.error('Error in POST /api/cdns:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data' }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
