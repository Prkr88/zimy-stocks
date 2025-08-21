import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

/**
 * Clear Database API Endpoint
 * POST /api/admin/clear-database
 */
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action !== 'clear_all') {
      return NextResponse.json(
        { error: 'Invalid action. Use "clear_all" to confirm.' },
        { status: 400 }
      );
    }

    console.log('🧹 Starting database cleanup...');
    
    const collectionsToClean = [
      'earnings_events',
      'sentiment_signals', 
      'stock_data',
      'analyst_consensus',
      'earnings_summary',
      'sentiment_analysis'
    ];
    
    let totalDeleted = 0;
    const results: Array<{ collection: string; deleted: number; error?: string }> = [];
    
    for (const collectionName of collectionsToClean) {
      try {
        console.log(`Clearing collection: ${collectionName}`);
        
        const collectionRef = adminDb.collection(collectionName);
        const snapshot = await collectionRef.get();
        
        if (snapshot.empty) {
          console.log(`  No documents found in ${collectionName}`);
          results.push({ collection: collectionName, deleted: 0 });
          continue;
        }
        
        let deletedCount = 0;
        const batch = adminDb.batch();
        
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
          deletedCount++;
        });
        
        await batch.commit();
        console.log(`  Deleted ${deletedCount} documents from ${collectionName}`);
        
        totalDeleted += deletedCount;
        results.push({ collection: collectionName, deleted: deletedCount });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`  Error clearing ${collectionName}: ${errorMessage}`);
        results.push({ 
          collection: collectionName, 
          deleted: 0, 
          error: errorMessage 
        });
      }
    }
    
    console.log(`✅ Database cleanup completed! Total deleted: ${totalDeleted}`);
    
    return NextResponse.json({
      success: true,
      message: 'Database cleanup completed',
      totalDeleted,
      results
    });
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    return NextResponse.json(
      { 
        error: 'Database cleanup failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Database clearing endpoint. Use POST with action: "clear_all" to clear all collections.',
    collections: [
      'earnings_events',
      'sentiment_signals', 
      'stock_data',
      'analyst_consensus',
      'earnings_summary',
      'sentiment_analysis'
    ]
  });
}