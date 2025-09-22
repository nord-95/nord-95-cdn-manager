import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get the current build ID from environment variables
    const currentBuildId = process.env.VERCEL_GIT_COMMIT_SHA || 'unknown';
    const currentBuildTime = process.env.VERCEL_BUILD_TIME || new Date().toISOString();
    
    // For Vercel deployments, we can check the latest deployment
    // This is a simplified approach - in production you might want to use Vercel's API
    const vercelTeamId = process.env.VERCEL_TEAM_ID;
    const vercelProjectId = process.env.VERCEL_PROJECT_ID;
    
    // If we're in development, always return no update
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        hasUpdate: false,
        currentVersion: currentBuildId,
        currentBuildTime,
        message: 'Development mode - no updates to check'
      });
    }
    
    // For production, we'll use a simple approach:
    // Store the last checked version in a way that persists across deployments
    // This is a basic implementation - you might want to use a database or external service
    
    // For now, we'll check if there's a new deployment by comparing timestamps
    // In a real implementation, you'd want to:
    // 1. Use Vercel's API to get the latest deployment
    // 2. Compare with the current deployment
    // 3. Return update information
    
    // Simple implementation: check if the build time is recent (within last hour)
    const buildTime = new Date(currentBuildTime);
    const now = new Date();
    const timeDiff = now.getTime() - buildTime.getTime();
    const hoursSinceBuild = timeDiff / (1000 * 60 * 60);
    
    // If the build is very recent (less than 1 hour), consider it a potential update
    const hasRecentUpdate = hoursSinceBuild < 1;
    
    return NextResponse.json({
      hasUpdate: hasRecentUpdate,
      currentVersion: currentBuildId,
      currentBuildTime,
      latestVersion: currentBuildId, // In a real implementation, this would be different
      updateAvailable: hasRecentUpdate,
      message: hasRecentUpdate 
        ? 'A recent update is available' 
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
