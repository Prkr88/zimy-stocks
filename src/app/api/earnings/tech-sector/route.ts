import { NextRequest, NextResponse } from 'next/server';
import { createEarningsAgent } from '@/lib/agents/earningsAgent';
import { adminDb } from '@/lib/firebase-admin';

// Database cleanup function
async function cleanupDuplicateTickers() {
  try {
    console.log('Starting duplicate ticker cleanup...');
    
    const snapshot = await adminDb.collection('earnings_events').get();
    
    if (snapshot.empty) {
      return {
        totalRecords: 0,
        duplicatesFound: 0,
        duplicatesRemoved: 0,
        errors: 0,
        details: []
      };
    }

    const allRecords = snapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data(),
      ticker: doc.data().ticker,
      updatedAt: doc.data().updatedAt?.toDate() || doc.data().createdAt?.toDate() || new Date(0)
    }));

    // Group records by ticker
    const tickerGroups = new Map();
    allRecords.forEach(record => {
      if (!record.ticker) return;
      if (!tickerGroups.has(record.ticker)) {
        tickerGroups.set(record.ticker, []);
      }
      tickerGroups.get(record.ticker).push(record);
    });

    const result = {
      totalRecords: allRecords.length,
      duplicatesFound: 0,
      duplicatesRemoved: 0,
      errors: 0,
      details: []
    };

    for (const [ticker, records] of tickerGroups) {
      if (records.length === 1) continue;

      result.duplicatesFound += records.length - 1;
      
      // Sort by updatedAt desc to keep the most recent
      records.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      
      const recordsToRemove = records.slice(1);

      // Remove older duplicate records
      for (const recordToRemove of recordsToRemove) {
        try {
          await adminDb.collection('earnings_events').doc(recordToRemove.id).delete();
          result.duplicatesRemoved++;
          console.log(`Removed duplicate record for ${ticker}: ${recordToRemove.id}`);
        } catch (deleteError) {
          result.errors++;
          console.error(`Error deleting record ${recordToRemove.id} for ${ticker}:`, deleteError);
        }
      }
    }

    console.log(`Cleanup completed: ${result.duplicatesRemoved} duplicates removed, ${result.errors} errors`);
    return result;
    
  } catch (error) {
    console.error('Error in cleanupDuplicateTickers:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      action = 'fetch-tech-sector',
      updateDatabase = true 
    } = body;

    const earningsAgent = createEarningsAgent();

    if (action === 'fetch-tech-sector') {
      // Fetch all S&P 500 tech companies with intelligent filtering
      const result = await earningsAgent.fetchTechSectorWithIntelligentFiltering();
      
      return NextResponse.json({
        success: true,
        action: 'fetch-tech-sector',
        result,
        timestamp: new Date().toISOString()
      });
    } else if (action === 'update-tech-sector') {
      // Update database with tech sector companies
      const updateResult = await earningsAgent.updateDatabaseWithTechSector();
      
      return NextResponse.json({
        success: true,
        action: 'update-tech-sector',
        result: updateResult,
        timestamp: new Date().toISOString()
      });
    } else if (action === 'cleanup-duplicates') {
      // Clean up duplicate tickers in the database
      const cleanupResult = await cleanupDuplicateTickers();
      
      return NextResponse.json({
        success: true,
        action: 'cleanup-duplicates',
        result: cleanupResult,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "fetch-tech-sector", "update-tech-sector", or "cleanup-duplicates"' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error in tech sector API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process tech sector request',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';

    if (action === 'status') {
      return NextResponse.json({
        success: true,
        status: {
          message: 'Tech sector earnings API is operational',
          availableActions: ['fetch-tech-sector', 'update-tech-sector', 'cleanup-duplicates'],
          description: 'Intelligently fetches S&P 500 tech companies and identifies which need analysis based on upcoming earnings',
          lastUpdated: new Date().toISOString()
        }
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "status"' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error in tech sector GET API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get tech sector information',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}