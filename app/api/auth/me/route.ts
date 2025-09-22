import { NextRequest, NextResponse } from 'next/server';
import { getUserFromHeader } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromHeader(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
