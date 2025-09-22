import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const db = getFirestore(app);

async function seedData() {
  try {
    console.log('🌱 Starting seed process...');

    // Create the "oasis" CDN
    const oasisCdn = {
      name: 'oasis',
      publicBase: 'https://pub-a7677751318d428a9d7c43faab7f3d7d.r2.dev',
      bucket: 'oasis',
      prefix: '',
      owners: [], // Will be populated when a super admin creates it
      allowedUsers: [],
      createdBy: '', // Will be populated when a super admin creates it
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Check if oasis CDN already exists
    const existingQuery = await db.collection('cdns').where('name', '==', 'oasis').limit(1).get();
    
    if (existingQuery.empty) {
      const docRef = await db.collection('cdns').add(oasisCdn);
      console.log(`✅ Created oasis CDN with ID: ${docRef.id}`);
    } else {
      console.log('ℹ️  Oasis CDN already exists');
    }

    console.log('🎉 Seed process completed successfully!');
  } catch (error) {
    console.error('❌ Error during seed process:', error);
    process.exit(1);
  }
}

// Run the seed function
seedData().then(() => {
  console.log('Seed script finished');
  process.exit(0);
});
