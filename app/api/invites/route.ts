import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import { requireSuperAdmin } from '@/lib/auth';
import { 
  InviteCreateSchema, 
  InviteListQuerySchema,
  DEFAULT_ALLOWED_MIME_TYPES,
  DEFAULT_ALLOWED_EXTENSIONS,
  InviteStatus,
  InviteDocument
} from '@/lib/validators/invites';
import { generateInviteToken, hashInviteToken } from '@/lib/invites/token';
import { resolvePrefixTokens } from '@/lib/invites/prefix';
import { 
  logInviteCreated 
} from '@/lib/audit';

// POST /api/invites - Create new invite
export async function POST(request: NextRequest) {
  try {
    const user = await requireSuperAdmin(request);
    const body = await request.json();
    
    // Parse and validate request body
    const inviteData = InviteCreateSchema.parse(body);
    
    // Verify CDN exists
    const cdnDoc = await adminDb.collection('cdns').doc(inviteData.cdnId).get();
    if (!cdnDoc.exists) {
      return NextResponse.json({ error: 'CDN not found' }, { status: 404 });
    }
    
    // Generate token and hash
    const token = generateInviteToken();
    const tokenHash = hashInviteToken(token);
    
    // Resolve upload prefix tokens
    const resolvedPrefix = resolvePrefixTokens(
      inviteData.uploadPrefix,
      inviteData.label
    );
    
    // Create invite document
    const inviteRef = adminDb.collection('invites').doc();
    const inviteDoc = {
      id: inviteRef.id,
      tokenHash,
      label: inviteData.label,
      cdnId: inviteData.cdnId,
      allowedMimeTypes: inviteData.allowedMimeTypes,
      allowedExtensions: inviteData.allowedExtensions,
      maxSizeBytes: inviteData.maxSizeBytes,
      maxUses: inviteData.maxUses,
      remainingUses: inviteData.maxUses || 0,
      expiresAt: inviteData.expiresAt,
      status: InviteStatus.enum.ACTIVE,
      uploadPrefix: resolvedPrefix,
      notifyEmails: inviteData.notifyEmails || [],
      notes: inviteData.notes || '',
      createdBy: user.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await inviteRef.set(inviteDoc);
    
    // Log audit event
    await logInviteCreated(
      inviteRef.id,
      inviteData.label,
      inviteData.cdnId,
      user.uid,
      request
    );
    
    // Return invite with token (only shown once)
    return NextResponse.json({
      inviteId: inviteRef.id,
      inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`,
      token, // Only returned on creation
      ...inviteDoc,
    });
    
  } catch (error) {
    console.error('Error creating invite:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
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

// GET /api/invites - List invites with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    const user = await requireSuperAdmin(request);
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const query = InviteListQuerySchema.parse({
      status: searchParams.get('status'),
      cdnId: searchParams.get('cdnId'),
      q: searchParams.get('q'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    });
    
    // Build Firestore query
    let firestoreQuery = adminDb.collection('invites').orderBy('createdAt', 'desc');
    
    // Apply filters
    if (query.status) {
      firestoreQuery = firestoreQuery.where('status', '==', query.status);
    }
    
    if (query.cdnId) {
      firestoreQuery = firestoreQuery.where('cdnId', '==', query.cdnId);
    }
    
    // Apply pagination
    const offset = (query.page - 1) * query.limit;
    firestoreQuery = firestoreQuery.offset(offset).limit(query.limit);
    
    // Execute query
    const snapshot = await firestoreQuery.get();
    const invites = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as InviteDocument[];
    
    // Apply text search filter if provided
    let filteredInvites = invites;
    if (query.q) {
      const searchTerm = query.q.toLowerCase();
      filteredInvites = invites.filter(invite => 
        invite.label.toLowerCase().includes(searchTerm) ||
        invite.notes?.toLowerCase().includes(searchTerm)
      );
    }
    
    // Get total count for pagination
    const totalSnapshot = await adminDb.collection('invites').get();
    const totalCount = totalSnapshot.size;
    
    return NextResponse.json({
      invites: filteredInvites,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / query.limit),
      },
    });
    
  } catch (error) {
    console.error('Error listing invites:', error);
    
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
