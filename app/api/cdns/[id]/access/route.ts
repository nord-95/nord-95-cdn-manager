import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import { getUserFromHeader, requireCdnAccess } from '@/lib/auth';

const addUserSchema = z.object({
  email: z.string().email(),
});

const removeUserSchema = z.object({
  uid: z.string().min(1),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireCdnAccess(request, id);

    // Get all users who have access to this CDN
    const cdnDoc = await adminDb.collection('cdns').doc(id).get();
    if (!cdnDoc.exists) {
      return NextResponse.json({ error: 'CDN not found' }, { status: 404 });
    }

    const cdnData = cdnDoc.data();
    const allowedUserIds = cdnData?.allowedUsers || [];

    if (allowedUserIds.length === 0) {
      return NextResponse.json({ users: [] });
    }

    // Fetch user details
    const userPromises = allowedUserIds.map(async (uid: string) => {
      const userDoc = await adminDb.collection('users').doc(uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        return {
          uid,
          email: userData?.email,
          role: userData?.role,
          addedAt: userData?.createdAt || new Date(),
        };
      }
      return null;
    });

    const users = (await Promise.all(userPromises)).filter(Boolean);

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error in GET /api/cdns/[id]/access:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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

    // Only super admin or CDN owners can add users
    const cdnDoc = await adminDb.collection('cdns').doc(id).get();
    if (!cdnDoc.exists) {
      return NextResponse.json({ error: 'CDN not found' }, { status: 404 });
    }

    const cdnData = cdnDoc.data();
    if (user.role !== 'SUPER_ADMIN' && !cdnData?.owners.includes(user.uid)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email } = addUserSchema.parse(body);

    // Look up or create user
    const userQuery = await adminDb.collection('users').where('email', '==', email).limit(1).get();
    let targetUser;

    if (userQuery.empty) {
      // Create new user
      const userRef = adminDb.collection('users').doc();
      await userRef.set({
        email,
        role: 'USER',
        cdnIds: [id],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      targetUser = { uid: userRef.id, email };
    } else {
      const userDoc = userQuery.docs[0];
      targetUser = { uid: userDoc.id, email: userDoc.data().email };

      // Add CDN to user's cdnIds if not already present
      const userData = userDoc.data();
      if (!userData.cdnIds.includes(id)) {
        await userDoc.ref.update({
          cdnIds: [...userData.cdnIds, id],
          updatedAt: new Date(),
        });
      }
    }

    // Add user to CDN's allowedUsers if not already present
    if (!cdnData!.allowedUsers.includes(targetUser.uid)) {
      await adminDb.collection('cdns').doc(id).update({
        allowedUsers: [...cdnData!.allowedUsers, targetUser.uid],
        updatedAt: new Date(),
      });
    }

    // Log the action
    await adminDb.collection('auditLogs').add({
      actorUid: user.uid,
      actorEmail: user.email,
      action: 'ADD_USER_TO_CDN',
      cdnId: id,
      details: { targetEmail: email, targetUid: targetUser.uid },
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, user: targetUser });
  } catch (error) {
    console.error('Error adding user to CDN:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
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
    const user = await getUserFromHeader(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only super admin or CDN owners can remove users
    const cdnDoc = await adminDb.collection('cdns').doc(id).get();
    if (!cdnDoc.exists) {
      return NextResponse.json({ error: 'CDN not found' }, { status: 404 });
    }

    const cdnData = cdnDoc.data();
    if (user.role !== 'SUPER_ADMIN' && !cdnData?.owners.includes(user.uid)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { uid } = removeUserSchema.parse(body);

    // Remove user from CDN's allowedUsers
    const updatedAllowedUsers = cdnData!.allowedUsers.filter((userId: string) => userId !== uid);
    await adminDb.collection('cdns').doc(id).update({
      allowedUsers: updatedAllowedUsers,
      updatedAt: new Date(),
    });

    // Remove CDN from user's cdnIds
    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      const updatedCdnIds = userData!.cdnIds.filter((cdnId: string) => cdnId !== id);
      await userDoc.ref.update({
        cdnIds: updatedCdnIds,
        updatedAt: new Date(),
      });
    }

    // Log the action
    await adminDb.collection('auditLogs').add({
      actorUid: user.uid,
      actorEmail: user.email,
      action: 'REMOVE_USER_FROM_CDN',
      cdnId: id,
      details: { targetUid: uid },
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing user from CDN:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}