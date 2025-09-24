# 🔧 Fix CORS Error for R2 Uploads

## Problem
You're getting this error when trying to upload files via invitation URLs:
```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at https://ryan-miller.4b9bc3aca054aef584783629b8a9a12b.r2.cloudflarestorage.com/. (Reason: CORS header 'Access-Control-Allow-Origin' missing). Status code: 501.
```

## Root Cause
Cloudflare R2 buckets need CORS (Cross-Origin Resource Sharing) configuration to allow browser uploads from your domain.

## Solution Options

### Option 1: Manual Configuration (Recommended)

1. **Go to Cloudflare Dashboard**
   - Visit: https://dash.cloudflare.com/
   - Navigate to **R2 Object Storage**

2. **Select Your Bucket**
   - Click on the `ryan-miller` bucket

3. **Configure CORS**
   - Go to **Settings** → **CORS policy**
   - Click **Add CORS policy**

4. **Add This Configuration:**
   ```json
   [
     {
       "AllowedOrigins": [
         "https://cdn-manager.nord95.com",
         "https://localhost:3000",
         "http://localhost:3000",
         "https://*.nord95.com",
         "https://*.vercel.app"
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
   ]
   ```

5. **Save Configuration**
   - Click **Save** or **Update**

### Option 2: Programmatic Configuration

Run the CORS configuration script:

```bash
# Set environment variables
export R2_ACCOUNT_ID=4b9bc3aca054aef584783629b8a9a12b
export R2_ACCESS_KEY_ID=d3cb03b40a313b182123153c019cc234
export R2_SECRET_ACCESS_KEY=2b4ccd6ac57496c39468124678e82777e16bd2c2d4fb3e5ed688f64429398605
export R2_BUCKET_NAME=ryan-miller

# Run the configuration script
node scripts/configure-r2-cors.js
```

### Option 3: Cloudflare API

Use the Cloudflare API directly:

```bash
curl -X PUT \
  "https://api.cloudflare.com/client/v4/accounts/4b9bc3aca054aef584783629b8a9a12b/r2/buckets/ryan-miller/cors" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cors": [
      {
        "AllowedOrigins": [
          "https://cdn-manager.nord95.com",
          "https://localhost:3000",
          "http://localhost:3000"
        ],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
        "AllowedHeaders": ["*"],
        "ExposeHeaders": ["ETag", "x-amz-request-id"],
        "MaxAgeSeconds": 3600
      }
    ]
  }'
```

## Verification

After configuring CORS:

1. **Test Upload**
   - Try uploading a file via invitation URL
   - Check browser console for CORS errors

2. **Check Network Tab**
   - Look for successful POST requests to R2
   - Verify no CORS errors

3. **Test Different Domains**
   - Test from localhost:3000
   - Test from production domain
   - Test from Vercel preview URLs

## Troubleshooting

### Still Getting CORS Errors?

1. **Check Bucket Name**
   - Ensure you're configuring the correct bucket (`ryan-miller`)
   - Verify bucket exists in Cloudflare R2

2. **Check Domain Configuration**
   - Ensure your domain is in the `AllowedOrigins` list
   - Add wildcard patterns if needed (`https://*.nord95.com`)

3. **Clear Browser Cache**
   - Hard refresh (Ctrl+F5 / Cmd+Shift+R)
   - Clear browser cache and cookies

4. **Check Environment Variables**
   - Verify `R2_ACCOUNT_HOST` is set correctly
   - Ensure all R2 credentials are valid

### Common Issues

- **Wrong Bucket**: Make sure you're configuring CORS on the `ryan-miller` bucket
- **Missing Methods**: Ensure `POST` and `PUT` are in `AllowedMethods`
- **Missing Headers**: Include `*` in `AllowedHeaders` for maximum compatibility
- **Domain Mismatch**: Verify the exact domain in `AllowedOrigins`

## Environment Variables

Make sure these are set correctly:

```bash
R2_ACCOUNT_ID=4b9bc3aca054aef584783629b8a9a12b
R2_ACCOUNT_HOST=4b9bc3aca054aef584783629b8a9a12b.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=d3cb03b40a313b182123153c019cc234
R2_SECRET_ACCESS_KEY=2b4ccd6ac57496c39468124678e82777e16bd2c2d4fb3e5ed688f64429398605
R2_BUCKET_NAME=ryan-miller
```

## Next Steps

After fixing CORS:

1. **Test Upload Functionality**
   - Create a new invitation
   - Test file upload via invitation URL
   - Verify files appear in R2 bucket

2. **Monitor Performance**
   - Check upload speeds
   - Monitor for any remaining errors

3. **Update Documentation**
   - Document CORS requirements
   - Add troubleshooting steps

## Support

If you continue to have issues:

1. Check Cloudflare R2 documentation
2. Verify bucket permissions
3. Test with a simple curl command
4. Contact Cloudflare support if needed

---

**Note**: CORS configuration changes may take a few minutes to propagate. Wait 2-3 minutes after making changes before testing.
