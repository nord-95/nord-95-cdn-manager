import { NextRequest, NextResponse } from 'next/server';
import { getUserFromHeader } from '@/lib/auth';
import { adminDb } from '@/lib/firebase/admin';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromHeader(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate a new API key
    const apiKey = `sk-${randomBytes(32).toString('hex')}`;
    
    // Store the API key in the user's document
    await adminDb.collection('users').doc(user.uid).update({
      apiKey,
      apiKeyGeneratedAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ 
      success: true, 
      apiKey,
      message: 'API key generated successfully' 
    });
  } catch (error) {
    console.error('Error generating API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromHeader(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user's API key (without revealing the full key)
    const userDoc = await adminDb.collection('users').doc(user.uid).get();
    const userData = userDoc.data();
    
    const apiKey = userData?.apiKey;
    const maskedKey = apiKey ? `sk-${'•'.repeat(32)}` : null;

    return NextResponse.json({ 
      apiKey: maskedKey,
      generatedAt: userData?.apiKeyGeneratedAt || null
    });
  } catch (error) {
    console.error('Error getting API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
