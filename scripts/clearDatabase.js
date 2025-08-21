#!/usr/bin/env node

/**
 * Database Cleanup Script
 * Clears all outdated/dirty data from Firestore collections
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath))
  });
}

const db = admin.firestore();

async function clearCollection(collectionName) {
  console.log(`Clearing collection: ${collectionName}`);
  
  const collectionRef = db.collection(collectionName);
  const snapshot = await collectionRef.get();
  
  if (snapshot.empty) {
    console.log(`  No documents found in ${collectionName}`);
    return 0;
  }
  
  let deletedCount = 0;
  const batch = db.batch();
  
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
    deletedCount++;
  });
  
  await batch.commit();
  console.log(`  Deleted ${deletedCount} documents from ${collectionName}`);
  return deletedCount;
}

async function main() {
  try {
    console.log('🧹 Starting database cleanup...');
    console.log('');
    
    const collectionsToClean = [
      'earnings_events',
      'sentiment_signals', 
      'stock_data',
      'analyst_consensus',
      'earnings_summary',
      'sentiment_analysis'
    ];
    
    let totalDeleted = 0;
    
    for (const collection of collectionsToClean) {
      try {
        const deleted = await clearCollection(collection);
        totalDeleted += deleted;
      } catch (error) {
        console.log(`  Error clearing ${collection}: ${error.message}`);
      }
    }
    
    console.log('');
    console.log(`✅ Database cleanup completed!`);
    console.log(`📊 Total documents deleted: ${totalDeleted}`);
    console.log('');
    console.log('The database is now clean and ready for fresh data.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    process.exit(1);
  }
}

main();