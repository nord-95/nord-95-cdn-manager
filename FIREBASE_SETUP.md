# Firebase Setup Guide for CDN Manager

This guide will walk you through setting up Firebase Authentication and Firestore for your CDN Manager application.

## Prerequisites

- A Google account
- Node.js installed on your machine
- Firebase CLI installed (`npm install -g firebase-tools`)

## Step 1: Create a Firebase Project

1. **Go to the Firebase Console**
   - Visit [https://console.firebase.google.com/](https://console.firebase.google.com/)
   - Sign in with your Google account

2. **Create a New Project**
   - Click "Create a project" or "Add project"
   - Enter project name: `nord-96-cnds-managers` (or your preferred name)
   - Click "Continue"

3. **Configure Google Analytics (Optional)**
   - You can enable or disable Google Analytics
   - For this project, it's optional
   - Click "Create project"

4. **Wait for Project Creation**
   - Firebase will set up your project
   - Click "Continue" when ready

## Step 2: Enable Authentication

1. **Navigate to Authentication**
   - In the Firebase Console, click "Authentication" in the left sidebar
   - Click "Get started"

2. **Set up Sign-in Methods**
   - Click on the "Sign-in method" tab
   - Click on "Email/Password"
   - Toggle "Enable" to ON
   - Click "Save"

3. **Optional: Enable Additional Providers**
   - You can also enable Google, GitHub, etc. if needed
   - For this guide, we'll stick with Email/Password

## Step 3: Set up Firestore Database

1. **Navigate to Firestore Database**
   - Click "Firestore Database" in the left sidebar
   - Click "Create database"

2. **Choose Security Rules**
   - Select "Start in test mode" for now
   - We'll update the rules later
   - Click "Next"

3. **Choose Location**
   - Select a location close to your users
   - For most cases, choose `us-central1` or `us-east1`
   - Click "Done"

## Step 4: Get Firebase Configuration

1. **Go to Project Settings**
   - Click the gear icon (⚙️) next to "Project Overview"
   - Select "Project settings"

2. **Get Web App Configuration**
   - Scroll down to "Your apps" section
   - Click the web icon (`</>`) to add a web app
   - Enter app nickname: `CDN Manager Web`
   - Check "Also set up Firebase Hosting" (optional)
   - Click "Register app"

3. **Copy Configuration**
   - Copy the Firebase configuration object
   - It will look like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "your-app-id"
   };
   ```

## Step 5: Create Service Account

1. **Go to Service Accounts**
   - In Project Settings, click "Service accounts" tab
   - Click "Generate new private key"
   - Click "Generate key" in the confirmation dialog
   - Download the JSON file (keep it secure!)

2. **Extract Service Account Info**
   - Open the downloaded JSON file
   - You'll need:
     - `project_id`
     - `client_email`
     - `private_key`

## Step 6: Update Environment Variables

1. **Create .env.local file**
   ```bash
   cp env.template .env.local
   ```

2. **Fill in Firebase Client Configuration**
   ```env
   # Firebase (client)
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   ```

3. **Fill in Firebase Server Configuration**
   ```env
   # Firebase (server)
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=your-service-account-email
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key-here\n-----END PRIVATE KEY-----\n"
   ```

   **Important**: The private key must be wrapped in quotes and have `\n` for line breaks.

## Step 7: Deploy Firestore Security Rules

1. **Initialize Firebase in Your Project**
   ```bash
   firebase login
   firebase init
   ```

2. **Select Features**
   - Select "Firestore" and "Hosting" (optional)
   - Choose your project when prompted
   - Use default file names

3. **Deploy Rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

## Step 8: Test Your Setup

1. **Start the Development Server**
   ```bash
   pnpm dev
   ```

2. **Visit the Test Page**
   - Go to `http://localhost:3000/test`
   - Check that all components show "success" status

3. **Test Authentication**
   - Go to `http://localhost:3000/login`
   - Try to create an account (it will be created automatically)

## Step 9: Create Your First User

1. **Go to Authentication in Firebase Console**
   - Click "Users" tab
   - Click "Add user"
   - Enter email and password
   - Click "Add user"

2. **Or Use the App**
   - The app will automatically create users when they sign in
   - Super admin status is determined by email domain

## Step 10: Set up Firestore Collections

The app will automatically create the required collections when you use it:

- `users` - User profiles and roles
- `cdns` - CDN configurations
- `auditLogs` - Activity logs

## Step 11: Seed the Database (Optional)

1. **Run the Seed Script**
   ```bash
   pnpm seed
   ```

2. **Verify in Firestore Console**
   - Check that the "oasis" CDN was created
   - Verify the data structure

## Troubleshooting

### Common Issues

1. **"Firebase App not initialized"**
   - Check that all environment variables are set correctly
   - Ensure the Firebase project ID matches in both client and server configs

2. **"Permission denied" errors**
   - Make sure Firestore rules are deployed
   - Check that the service account has proper permissions

3. **Authentication not working**
   - Verify that Email/Password is enabled in Firebase Console
   - Check that the auth domain is correct

4. **Private key format issues**
   - Ensure the private key is properly escaped with `\n`
   - Make sure it's wrapped in quotes

### Verification Checklist

- [ ] Firebase project created
- [ ] Authentication enabled with Email/Password
- [ ] Firestore database created
- [ ] Service account created and downloaded
- [ ] Environment variables configured
- [ ] Firestore rules deployed
- [ ] Test page shows all green checkmarks
- [ ] Can create and sign in users
- [ ] Can access the dashboard

## Security Best Practices

1. **Never commit .env.local to version control**
2. **Keep service account JSON file secure**
3. **Use environment-specific Firebase projects for dev/staging/prod**
4. **Regularly rotate service account keys**
5. **Monitor authentication logs in Firebase Console**

## Next Steps

Once Firebase is set up:

1. **Configure Cloudflare R2** (see R2_SETUP.md)
2. **Deploy to Vercel** (see DEPLOYMENT.md)
3. **Set up monitoring and alerts**
4. **Configure backup strategies**

## Support

If you encounter issues:

1. Check the Firebase Console for error logs
2. Verify all environment variables are correct
3. Ensure Firestore rules are properly deployed
4. Check the browser console for client-side errors
5. Review the server logs in Vercel (after deployment)

The Firebase setup is now complete! Your CDN Manager application should be able to authenticate users and store data securely.
