import { NextRequest, NextResponse } from 'next/server';
import { getUserFromHeader, isSuperAdminEmail } from '@/lib/auth';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromHeader(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error in GET /api/auth/me:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    const body = await request.json();
    const { email, displayName } = body;

    // Check if user already exists
    const userQuery = await adminDb.collection('users').where('uid', '==', decodedToken.uid).limit(1).get();
    
    if (!userQuery.empty) {
      // User exists, return existing data
      const userDoc = userQuery.docs[0];
      return NextResponse.json(userDoc.data());
    }

    // Create new user
    const isSuperAdmin = isSuperAdminEmail(email);
    const userData = {
      uid: decodedToken.uid,
      email,
      displayName: displayName || null,
      role: isSuperAdmin ? 'SUPER_ADMIN' : 'USER',
      cdnIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await adminDb.collection('users').doc(decodedToken.uid).set(userData);

    return NextResponse.json(userData);
  } catch (error) {
    console.error('Error in POST /api/auth/me:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
