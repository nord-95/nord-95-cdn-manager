# CDN Manager

A production-ready web application for managing multiple Cloudflare R2-backed CDNs with Firebase authentication and role-based access control.

## Features

- **Multi-CDN Management**: Create and manage multiple CDNs from a single dashboard
- **Role-Based Access Control**: Super admin and user roles with granular permissions
- **File Management**: Upload, download, and manage files with presigned URLs
- **Cloudflare R2 Integration**: Direct integration with Cloudflare R2 storage
- **Firebase Authentication**: Secure user authentication and authorization
- **Modern UI**: Clean, responsive interface built with Next.js 15 and Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Authentication**: Firebase Auth
- **Database**: Firestore
- **Storage**: Cloudflare R2 (S3-compatible)
- **Deployment**: Vercel
- **Validation**: Zod
- **Forms**: React Hook Form

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Firebase project with Authentication and Firestore enabled
- Cloudflare R2 account with API credentials
- Vercel account for deployment

### Environment Setup

1. Copy the environment template:
   ```bash
   cp env.template .env.local
   ```

2. Fill in your environment variables in `.env.local`:

   **Firebase Configuration:**
   - Get your Firebase config from the Firebase Console
   - Set up a service account and download the private key

   **Cloudflare R2 Configuration:**
   - Get your R2 credentials from the Cloudflare dashboard
   - Set your account ID, access key, and secret key

   **Super Admin Domains:**
   - Configure which email domains should have super admin access

### Installation

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set up Firebase:
   - Deploy Firestore security rules:
     ```bash
     firebase deploy --only firestore:rules
     ```

3. Run the development server:
   ```bash
   pnpm dev
   ```

4. Seed the database (optional):
   ```bash
   pnpm seed
   ```

### Deployment

1. Deploy to Vercel:
   ```bash
   vercel --prod
   ```

2. Set environment variables in Vercel dashboard

3. Deploy Firestore rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

## Usage

### Super Admin

Super admins can:
- Create and manage all CDNs
- Assign users to specific CDNs
- View audit logs
- Access all features

### Regular Users

Users can:
- View and manage files in assigned CDNs
- Upload and download files
- Generate presigned URLs
- Copy public URLs

## API Endpoints

- `GET /api/auth/me` - Get current user profile
- `GET /api/cdns` - List CDNs (filtered by user role)
- `POST /api/cdns` - Create new CDN (super admin only)
- `GET /api/cdns/[id]` - Get CDN details
- `PATCH /api/cdns/[id]` - Update CDN (super admin only)
- `DELETE /api/cdns/[id]` - Delete CDN (super admin only)
- `GET /api/cdns/[id]/files` - List files in CDN
- `POST /api/cdns/[id]/files/sign-put` - Get presigned upload URL
- `POST /api/cdns/[id]/files/sign-get` - Get presigned download URL
- `DELETE /api/cdns/[id]/files/[key]` - Delete file
- `POST /api/cdns/[id]/access` - Add user to CDN
- `DELETE /api/cdns/[id]/access` - Remove user from CDN

## Security

- All API routes are protected with Firebase ID token verification
- Role-based access control enforced server-side
- Firestore security rules prevent unauthorized access
- R2 credentials never exposed to client
- Presigned URLs for secure file operations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
