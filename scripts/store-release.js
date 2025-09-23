#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get git information
function getGitInfo() {
  try {
    const commitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    const commitMessage = execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    const author = execSync('git log -1 --pretty=%an', { encoding: 'utf8' }).trim();
    const timestamp = execSync('git log -1 --pretty=%ci', { encoding: 'utf8' }).trim();
    
    return {
      commitHash,
      commitMessage,
      branch,
      author,
      timestamp,
    };
  } catch (error) {
    console.error('Error getting git info:', error.message);
    return null;
  }
}

// Parse commit message to extract features and changes
function parseCommitMessage(message) {
  const lines = message.split('\n');
  const features = [];
  const changes = [];
  
  let currentSection = null;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('- ')) {
      // This is a feature/change item
      const item = trimmedLine.substring(2);
      if (currentSection === 'features') {
        features.push(item);
      } else if (currentSection === 'changes') {
        changes.push(item);
      }
    } else if (trimmedLine.includes(':')) {
      // This is a section header
      const section = trimmedLine.toLowerCase();
      if (section.includes('feature') || section.includes('add') || section.includes('implement')) {
        currentSection = 'features';
      } else if (section.includes('change') || section.includes('update') || section.includes('fix')) {
        currentSection = 'changes';
      }
    }
  }
  
  return { features, changes };
}

// Store release in Firebase
async function storeRelease(releaseData) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/releases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(releaseData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP ${response.status}: ${errorData.error || 'Unknown error'}`);
    }

    const result = await response.json();
    console.log('✅ Release stored successfully:', result.releaseId);
    return result;
  } catch (error) {
    console.error('❌ Error storing release:', error.message);
    throw error;
  }
}

// Main function
async function main() {
  console.log('🚀 Storing release information...');
  
  const gitInfo = getGitInfo();
  if (!gitInfo) {
    console.error('❌ Failed to get git information');
    process.exit(1);
  }

  console.log('📝 Git Information:');
  console.log(`   Commit: ${gitInfo.commitHash.substring(0, 8)}`);
  console.log(`   Branch: ${gitInfo.branch}`);
  console.log(`   Author: ${gitInfo.author}`);
  console.log(`   Message: ${gitInfo.commitMessage.split('\n')[0]}`);

  const { features, changes } = parseCommitMessage(gitInfo.commitMessage);
  
  const releaseData = {
    ...gitInfo,
    version: process.env.VERCEL_GIT_COMMIT_SHA || gitInfo.commitHash.substring(0, 8),
    features: features.length > 0 ? features : undefined,
    changes: changes.length > 0 ? changes : undefined,
  };

  try {
    await storeRelease(releaseData);
    console.log('🎉 Release tracking completed successfully!');
  } catch (error) {
    console.error('💥 Release tracking failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { getGitInfo, parseCommitMessage, storeRelease };
