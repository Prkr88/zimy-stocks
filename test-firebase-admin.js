// Simple test script to verify Firebase Admin initialization
const { adminDb } = require('./src/lib/firebase-admin.ts');

async function testFirebaseAdmin() {
  try {
    console.log('Testing Firebase Admin connection...');
    
    // Try to access a test collection
    const testCollection = adminDb.collection('test');
    console.log('✅ Firebase Admin initialized successfully');
    console.log('✅ Database connection established');
    
    // Test a simple read operation
    const snapshot = await testCollection.limit(1).get();
    console.log('✅ Database read operation successful');
    console.log(`Collection has ${snapshot.size} documents`);
    
    console.log('🎉 All Firebase Admin tests passed!');
  } catch (error) {
    console.error('❌ Firebase Admin test failed:', error.message);
    process.exit(1);
  }
}

testFirebaseAdmin();
