import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get the current build ID from environment variables
    const currentBuildId = process.env.VERCEL_GIT_COMMIT_SHA || 'unknown';
    const currentBuildTime = process.env.VERCEL_BUILD_TIME || new Date().toISOString();
    
    // If we're in development, always return no update
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        hasUpdate: false,
        currentVersion: currentBuildId,
        currentBuildTime,
        message: 'Development mode - no updates to check'
      });
    }
    
    // For production, we'll implement a more sophisticated approach
    // We'll use localStorage on the client side to track the last seen version
    // and only show updates when there's actually a new deployment
    
    // Get the client's last seen version from the request headers
    const lastSeenVersion = request.headers.get('x-last-seen-version');
    
    // If no last seen version, this is likely a first visit or cache clear
    // Don't show update notification in this case
    if (!lastSeenVersion) {
      return NextResponse.json({
        hasUpdate: false,
        currentVersion: currentBuildId,
        currentBuildTime,
        message: 'Welcome! You are running the latest version'
      });
    }
    
    // Compare with current version
    const hasUpdate = lastSeenVersion !== currentBuildId;
    
    return NextResponse.json({
      hasUpdate,
      currentVersion: currentBuildId,
      currentBuildTime,
      lastSeenVersion,
      updateAvailable: hasUpdate,
      message: hasUpdate 
        ? 'A new version is available' 
        : 'You are running the latest version'
    });
    
  } catch (error) {
    console.error('Error checking for updates:', error);
    return NextResponse.json({
      hasUpdate: false,
      error: 'Failed to check for updates'
    }, { status: 500 });
  }
}
