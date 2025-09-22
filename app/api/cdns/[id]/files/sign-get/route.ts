import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import { requireCdnAccess } from '@/lib/auth';
import { signGetUrl } from '@/lib/r2';

const signGetSchema = z.object({
  key: z.string().min(1),
  expires: z.number().optional().default(3600),
});

export async function POST(
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

    const body = await request.json();
    const { key, expires } = signGetSchema.parse(body);
    
    const cdnData = cdnDoc.data();
    const fullKey = cdnData!.prefix ? `${cdnData!.prefix}/${key}` : key;
    
    const signedUrl = await signGetUrl(cdnData!.bucket, fullKey, expires);
    
    return NextResponse.json({ signedUrl, key: fullKey });
  } catch (error) {
    console.error('Error in POST /api/cdns/[id]/files/sign-get:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data' }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
