import { NextRequest, NextResponse } from 'next/server';
import { migrateAnalystsFromConsensus } from '@/lib/utils/migrateAnalysts';

/**
 * POST /api/analysts/migrate - Migrate analysts from existing consensus data
 * This creates individual analyst profiles from aggregated consensus data
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting analyst migration from consensus data...');
    
    await migrateAnalystsFromConsensus();
    
    return NextResponse.json({
      success: true,
      message: 'Successfully migrated analysts from consensus data',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error migrating analysts:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to migrate analysts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}