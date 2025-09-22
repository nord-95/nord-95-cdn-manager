import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from './firebase/admin';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  role: 'SUPER_ADMIN' | 'USER';
  cdnIds: string[];
  createdAt: any;
  updatedAt: any;
}

export async function getUserFromHeader(request: NextRequest): Promise<User | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      return null;
    }

    return userDoc.data() as User;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

export async function verifyIdToken(idToken: string) {
  try {
    return await adminAuth.verifyIdToken(idToken);
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

export async function requireSuperAdmin(request: NextRequest): Promise<User> {
  const user = await getUserFromHeader(request);
  if (!user || user.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized: Super admin access required');
  }
  return user;
}

export async function requireCdnAccess(request: NextRequest, cdnId: string): Promise<User> {
  const user = await getUserFromHeader(request);
  if (!user) {
    throw new Error('Unauthorized: Authentication required');
  }

  if (user.role === 'SUPER_ADMIN') {
    return user;
  }

  if (!user.cdnIds.includes(cdnId)) {
    // Check if user has access via CDN's allowedUsers
    const cdnDoc = await adminDb.collection('cdns').doc(cdnId).get();
    if (!cdnDoc.exists) {
      throw new Error('CDN not found');
    }
    
    const cdnData = cdnDoc.data();
    if (!cdnData?.allowedUsers?.includes(user.uid)) {
      throw new Error('Unauthorized: Access to this CDN denied');
    }
  }

  return user;
}

export function isSuperAdminEmail(email: string): boolean {
  const allowedDomains = process.env.SUPERADMIN_ALLOWED_DOMAINS?.split(',') || [];
  const domain = email.split('@')[1];
  return allowedDomains.includes(domain);
}
