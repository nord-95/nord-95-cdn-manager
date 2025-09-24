# Vercel Deployment Guide for CDN Manager

This guide will walk you through deploying your CDN Manager application to Vercel.

## Prerequisites

- ✅ GitHub repository: `nord-95/nord-95-cdn-manager`
- ✅ Firebase project set up
- ✅ Cloudflare R2 credentials
- ✅ Local development working

## Step 1: Create Vercel Account

1. **Go to Vercel**: https://vercel.com
2. **Sign up with GitHub**: Click "Continue with GitHub"
3. **Authorize Vercel**: Allow Vercel to access your GitHub repositories

## Step 2: Import Your Project

1. **Click "New Project"** on your Vercel dashboard
2. **Import from GitHub**: Select `nord-95/nord-95-cdn-manager`
3. **Configure Project**:
   - **Project Name**: `nord-95-cdn-manager` (or your preferred name)
   - **Framework Preset**: Next.js (should auto-detect)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

## Step 3: Configure Environment Variables

**⚠️ CRITICAL**: Add all your environment variables before deploying!

### Firebase Client Variables:
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### Firebase Server Variables:
```
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key\n-----END PRIVATE KEY-----\n"
```

### Cloudflare R2 Variables:
```
R2_ACCOUNT_ID=4b9bc3aca054aef584783629b8a9a12b
R2_ACCOUNT_HOS=4b9bc3aca054aef584783629b8a9a12b.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=d3cb03b40a313b182123153c019cc234
R2_SECRET_ACCESS_KEY=2b4ccd6ac57496c39468124678e82777e16bd2c2d4fb3e5ed688f64429398605
R2_PUBLIC_BASE_FALLBACK=https://pub-a7677751318d428a9d7c43faab7f3d7d.r2.dev
```

### App Configuration:
```
SUPERADMIN_ALLOWED_DOMAINS=nord95.com,raresonline.com,ryanmiller.one,iamryanmiller.com,razyahnn.com
```

## Step 4: Deploy

1. **Click "Deploy"** after adding all environment variables
2. **Wait for deployment** (usually 2-3 minutes)
3. **Get your live URL**: `https://your-project-name.vercel.app`

## Step 5: Configure Firebase for Production:

### Deploy Firestore Rules:
```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init firestore

# Deploy rules
firebase deploy --only firestore:rules
```

### Update Firebase Authorized Domains:
1. **Go to Firebase Console** → Authentication → Settings
2. **Add your Vercel domain** to "Authorized domains":
   - `your-project-name.vercel.app`
   - `your-project-name-git-main-nord-95.vercel.app` (preview URLs)

## Step 6: Test Your Deployment

### Test URLs:
- **Main App**: `https://your-project-name.vercel.app`
- **Login**: `https://your-project-name.vercel.app/login`
- **Test Page**: `https://your-project-name.vercel.app/test`

### Test Checklist:
- [ ] App loads without errors
- [ ] Login page displays correctly
- [ ] Can create user accounts
- [ ] Dashboard loads for authenticated users
- [ ] Test page shows all green checkmarks
- [ ] File upload/download works
- [ ] CDN management functions

## Step 7: Custom Domain (Optional)

1. **Go to Vercel Dashboard** → Your Project → Settings → Domains
2. **Add your domain**: `cdn-manager.yourdomain.com`
3. **Configure DNS**: Add CNAME record pointing to Vercel
4. **Update Firebase**: Add new domain to authorized domains

## Step 8: Environment Management

### Production Environment:
- Use production Firebase project
- Use production R2 bucket
- Set `NODE_ENV=production`

### Preview Environments:
- Automatically created for each Git branch
- Use same environment variables
- Perfect for testing before merging

## Step 9: Monitoring & Analytics

### Vercel Analytics:
1. **Enable Vercel Analytics** in project settings
2. **Monitor performance** and user behavior
3. **Track errors** and fix issues

### Firebase Analytics:
- Already configured with your measurement ID
- Track user engagement and app usage

## Troubleshooting

### Common Issues:

1. **Build Failures**:
   - Check environment variables are set correctly
   - Ensure all dependencies are in package.json
   - Check build logs in Vercel dashboard

2. **Authentication Errors**:
   - Verify Firebase configuration
   - Check authorized domains
   - Ensure service account has correct permissions

3. **R2 Connection Issues**:
   - Verify R2 credentials
   - Check bucket permissions
   - Ensure CORS is configured

4. **Environment Variable Issues**:
   - Private key must be properly formatted with `\n`
   - All variables must be set in Vercel dashboard
   - No spaces around `=` in variable names

### Debug Steps:
1. **Check Vercel logs**: Dashboard → Functions → View logs
2. **Test API endpoints**: Use browser dev tools
3. **Verify environment**: Check `/test` page
4. **Check Firebase console**: For authentication issues

## Security Best Practices

1. **Never commit** `.env.local` to Git
2. **Use different** Firebase projects for dev/prod
3. **Rotate** R2 credentials regularly
4. **Monitor** access logs and usage
5. **Set up** alerts for errors

## Performance Optimization

1. **Enable Vercel Edge Functions** for better performance
2. **Use CDN** for static assets
3. **Optimize images** with Next.js Image component
4. **Monitor** Core Web Vitals

## Backup & Recovery

1. **Database backups**: Firebase automatic backups
2. **Code backups**: GitHub repository
3. **Environment variables**: Export from Vercel dashboard
4. **R2 data**: Use Cloudflare's backup tools

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Firebase Docs**: https://firebase.google.com/docs
- **Next.js Docs**: https://nextjs.org/docs

## Quick Commands

```bash
# Deploy to Vercel (automatic with Git push)
git push origin main

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Check deployment status
vercel ls

# View logs
vercel logs your-project-name
```

## Success Checklist

- [ ] ✅ Vercel account created
- [ ] ✅ Project imported from GitHub
- [ ] ✅ All environment variables configured
- [ ] ✅ Deployment successful
- [ ] ✅ Firebase rules deployed
- [ ] ✅ App loads without errors
- [ ] ✅ Authentication working
- [ ] ✅ File upload/download working
- [ ] ✅ Custom domain configured (optional)
- [ ] ✅ Monitoring enabled

**Your CDN Manager is now live and ready for production use!** 🚀

## Next Steps After Deployment

1. **Test all functionality** thoroughly
2. **Create your first CDN** in the app
3. **Upload test files** to verify R2 integration
4. **Invite team members** to test the application
5. **Set up monitoring** and alerts
6. **Document** any custom configurations

**Congratulations! Your production-ready CDN Manager is now deployed!** 🎉
