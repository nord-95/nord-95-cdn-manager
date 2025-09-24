#!/usr/bin/env node

/**
 * Configure CORS for Cloudflare R2 bucket
 * This script sets up CORS to allow browser uploads from your domains
 */

const https = require('https');

// Configuration from environment variables
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'ryan-miller';

if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   R2_ACCOUNT_ID');
  console.error('   R2_ACCESS_KEY_ID');
  console.error('   R2_SECRET_ACCESS_KEY');
  console.error('   R2_BUCKET_NAME (optional, defaults to ryan-miller)');
  process.exit(1);
}

// CORS configuration
const corsConfig = [
  {
    "AllowedOrigins": [
      "https://cdn-manager.nord95.com",
      "https://localhost:3000",
      "http://localhost:3000",
      "https://*.nord95.com",
      "https://*.vercel.app",
      "*" // Allow all origins for testing
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag",
      "x-amz-request-id",
      "x-amz-id-2"
    ],
    "MaxAgeSeconds": 3600
  }
];

async function configureCORS() {
  try {
    console.log(`🔧 Configuring CORS for R2 bucket: ${BUCKET_NAME}`);
    console.log(`📋 Account ID: ${ACCOUNT_ID}`);
    
    const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET_NAME}/cors`;
    
    const postData = JSON.stringify({
      cors: corsConfig
    });
    
    const options = {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${ACCESS_KEY_ID}:${SECRET_ACCESS_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    console.log('📤 Sending CORS configuration...');
    console.log('📋 CORS Rules:', JSON.stringify(corsConfig, null, 2));
    
    const response = await makeRequest(url, options, postData);
    
    if (response.success) {
      console.log('✅ CORS configuration successful!');
      console.log('🌐 Your R2 bucket now allows uploads from:');
      corsConfig[0].AllowedOrigins.forEach(origin => {
        console.log(`   - ${origin}`);
      });
    } else {
      console.error('❌ CORS configuration failed:', response.errors);
    }
    
  } catch (error) {
    console.error('❌ Error configuring CORS:', error.message);
    process.exit(1);
  }
}

function makeRequest(url, options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

// Alternative: Use AWS SDK approach
async function configureCORSWithAWS() {
  try {
    const { S3Client, PutBucketCorsCommand } = require('@aws-sdk/client-s3');
    
    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
      },
    });
    
    const command = new PutBucketCorsCommand({
      Bucket: BUCKET_NAME,
      CORSConfiguration: {
        CORSRules: corsConfig
      }
    });
    
    console.log('🔧 Configuring CORS using AWS SDK...');
    const result = await client.send(command);
    console.log('✅ CORS configuration successful!');
    
  } catch (error) {
    console.error('❌ Error with AWS SDK approach:', error.message);
    console.log('💡 Try the manual Cloudflare Dashboard approach instead');
  }
}

// Run the configuration
if (require.main === module) {
  console.log('🚀 R2 CORS Configuration Script');
  console.log('================================');
  
  // Try AWS SDK approach first, fallback to manual
  configureCORSWithAWS().catch(() => {
    console.log('\n📋 Manual Configuration Instructions:');
    console.log('=====================================');
    console.log('1. Go to Cloudflare Dashboard → R2 Object Storage');
    console.log(`2. Select bucket: ${BUCKET_NAME}`);
    console.log('3. Go to Settings → CORS policy');
    console.log('4. Add the following CORS configuration:');
    console.log('');
    console.log(JSON.stringify(corsConfig, null, 2));
    console.log('');
    console.log('5. Save the configuration');
    console.log('6. Test uploads from your application');
  });
}

module.exports = { configureCORS, corsConfig };
