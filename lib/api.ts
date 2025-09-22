import { auth } from '@/lib/firebase/client';

export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  const idToken = await user.getIdToken();
  
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
      ...options.headers,
    },
  });
}
