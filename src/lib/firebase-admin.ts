import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if it hasn't been initialized already
if (!getApps().length) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT_ID;
  
  try {
    // First, try to use GCP_SA_KEY_JSON environment variable (works in both dev and production)
    if (process.env.GCP_SA_KEY_JSON) {
      try {
        const serviceAccount = JSON.parse(process.env.GCP_SA_KEY_JSON);
        initializeApp({
          credential: cert(serviceAccount),
          projectId,
        });
        console.log('Firebase Admin initialized with service account from GCP_SA_KEY_JSON environment variable');
      } catch (parseError) {
        console.error('Failed to parse GCP_SA_KEY_JSON:', parseError instanceof Error ? parseError.message : parseError);
        throw parseError;
      }
    } else {
      // Fallback to default credentials (for Google Cloud environments)
      initializeApp({
        projectId,
      });
      console.log('Firebase Admin initialized with default credentials (no GCP_SA_KEY_JSON found)');
    }
  } catch (error) {
    console.warn('Failed to initialize Firebase Admin, trying minimal config:', error instanceof Error ? error.message : error);
    // Last resort: minimal configuration
    try {
      initializeApp({
        projectId: projectId || 'zimy-stocks',
      });
      console.log('Firebase Admin initialized with minimal config');
    } catch (finalError) {
      console.error('Failed to initialize Firebase Admin completely:', finalError);
      throw finalError;
    }
  }
}

export const adminDb = getFirestore();