import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { isSuperAdminEmail } from '@/lib/auth';

const lookupSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = lookupSchema.parse(body);

    // Check if user exists in Firestore
    const userQuery = await adminDb.collection('users').where('email', '==', email).limit(1).get();
    
    if (!userQuery.empty) {
      const userDoc = userQuery.docs[0];
      return NextResponse.json({
        uid: userDoc.id,
        email: userDoc.data().email,
        role: userDoc.data().role,
        exists: true
      });
    }

    // User doesn't exist, create them
    const role = isSuperAdminEmail(email) ? 'SUPER_ADMIN' : 'USER';
    
    // Create user in Firestore
    const userRef = adminDb.collection('users').doc();
    await userRef.set({
      email,
      role,
      cdnIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      uid: userRef.id,
      email,
      role,
      exists: false
    });
  } catch (error) {
    console.error('Error in /api/users/lookup:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
