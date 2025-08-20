import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin if it hasn't been initialized already
if (!getApps().length) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT_ID;
  
  try {
    if (process.env.NODE_ENV === 'production') {
      // In production, try service account key from environment variable
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        initializeApp({
          credential: cert(serviceAccount),
          projectId,
        });
      } else {
        // Fallback to default credentials (for Google Cloud environments)
        initializeApp({
          projectId,
        });
      }
    } else {
      // In development, try service account file if it exists
      const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      let serviceAccountInitialized = false;
      
      if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
        try {
          const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
          initializeApp({
            credential: cert(serviceAccount),
            projectId,
          });
          serviceAccountInitialized = true;
          console.log('Firebase Admin initialized with service account from file');
        } catch (fileError) {
          console.warn('Failed to read service account file:', fileError.message);
        }
      }
      
      if (!serviceAccountInitialized) {
        // Use default credentials or application default credentials
        initializeApp({
          projectId,
        });
        console.log('Firebase Admin initialized with default credentials');
      }
    }
  } catch (error) {
    console.warn('Failed to initialize Firebase Admin, trying minimal config:', error.message);
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