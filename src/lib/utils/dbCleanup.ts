/**
 * Database Cleanup Utilities
 * Removes duplicate records and maintains data integrity
 */

import { adminDb } from "../firebase-admin";

export interface CleanupResult {
  totalRecords: number;
  duplicatesFound: number;
  duplicatesRemoved: number;
  errors: number;
  tickersProcessed: string[];
  details: Array<{
    ticker: string;
    action: 'kept' | 'removed' | 'error';
    recordId?: string;
    message: string;
  }>;
}

/**
 * Remove duplicate tickers from the earnings_events collection
 * Keeps the most recent record for each ticker
 */
export async function removeDuplicateTickers(): Promise<CleanupResult> {
  try {
    console.log('Starting duplicate ticker cleanup...');
    
    // Get all earnings events
    const snapshot = await adminDb.collection('earnings_events').get();
    
    if (snapshot.empty) {
      return {
        totalRecords: 0,
        duplicatesFound: 0,
        duplicatesRemoved: 0,
        errors: 0,
        tickersProcessed: [],
        details: []
      };
    }

    const allRecords = snapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data(),
      ticker: doc.data().ticker,
      updatedAt: doc.data().updatedAt?.toDate() || doc.data().createdAt?.toDate() || new Date(0)
    }));

    console.log(`Found ${allRecords.length} total records`);

    // Group records by ticker
    const tickerGroups = new Map<string, typeof allRecords>();
    
    allRecords.forEach(record => {
      if (!record.ticker) {
        console.warn(`Record ${record.id} has no ticker, skipping`);
        return;
      }
      
      if (!tickerGroups.has(record.ticker)) {
        tickerGroups.set(record.ticker, []);
      }
      tickerGroups.get(record.ticker)!.push(record);
    });

    console.log(`Found ${tickerGroups.size} unique tickers`);

    // Find duplicates and process them
    const result: CleanupResult = {
      totalRecords: allRecords.length,
      duplicatesFound: 0,
      duplicatesRemoved: 0,
      errors: 0,
      tickersProcessed: Array.from(tickerGroups.keys()),
      details: []
    };

    for (const [ticker, records] of tickerGroups) {
      try {
        if (records.length === 1) {
          // No duplicates for this ticker
          result.details.push({
            ticker,
            action: 'kept',
            recordId: records[0].id,
            message: 'Single record, no duplicates found'
          });
          continue;
        }

        // Found duplicates
        result.duplicatesFound += records.length - 1;
        
        // Sort by updatedAt desc to keep the most recent
        records.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        
        const recordToKeep = records[0];
        const recordsToRemove = records.slice(1);

        // Keep the most recent record
        result.details.push({
          ticker,
          action: 'kept',
          recordId: recordToKeep.id,
          message: `Kept most recent record (updated: ${recordToKeep.updatedAt.toISOString()})`
        });

        // Remove older duplicate records
        for (const recordToRemove of recordsToRemove) {
          try {
            await adminDb.collection('earnings_events').doc(recordToRemove.id).delete();
            result.duplicatesRemoved++;
            
            result.details.push({
              ticker,
              action: 'removed',
              recordId: recordToRemove.id,
              message: `Removed duplicate record (updated: ${recordToRemove.updatedAt.toISOString()})`
            });
            
            console.log(`Removed duplicate record for ${ticker}: ${recordToRemove.id}`);
          } catch (deleteError) {
            result.errors++;
            result.details.push({
              ticker,
              action: 'error',
              recordId: recordToRemove.id,
              message: `Failed to delete: ${deleteError instanceof Error ? deleteError.message : 'Unknown error'}`
            });
            console.error(`Error deleting record ${recordToRemove.id} for ${ticker}:`, deleteError);
          }
        }

        console.log(`Processed ${ticker}: kept 1, removed ${recordsToRemove.length} duplicates`);
        
      } catch (error) {
        result.errors++;
        result.details.push({
          ticker,
          action: 'error',
          message: `Error processing ticker: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
        console.error(`Error processing ticker ${ticker}:`, error);
      }
    }

    console.log(`Cleanup completed: ${result.duplicatesRemoved} duplicates removed, ${result.errors} errors`);
    
    return result;
    
  } catch (error) {
    console.error('Error in removeDuplicateTickers:', error);
    throw error;
  }
}

/**
 * Check if a ticker already exists in the database
 */
export async function tickerExists(ticker: string): Promise<{
  exists: boolean;
  recordId?: string;
  recordData?: any;
}> {
  try {
    const snapshot = await adminDb.collection('earnings_events')
      .where('ticker', '==', ticker)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return { exists: false };
    }
    
    const doc = snapshot.docs[0];
    return {
      exists: true,
      recordId: doc.id,
      recordData: doc.data()
    };
  } catch (error) {
    console.error(`Error checking if ticker ${ticker} exists:`, error);
    throw error;
  }
}

/**
 * Get duplicate ticker statistics without removing them
 */
export async function getDuplicateStats(): Promise<{
  totalRecords: number;
  uniqueTickers: number;
  duplicateTickers: string[];
  duplicateCount: number;
}> {
  try {
    const snapshot = await adminDb.collection('earnings_events').get();
    
    if (snapshot.empty) {
      return {
        totalRecords: 0,
        uniqueTickers: 0,
        duplicateTickers: [],
        duplicateCount: 0
      };
    }

    const tickerCounts = new Map<string, number>();
    
    snapshot.docs.forEach(doc => {
      const ticker = doc.data().ticker;
      if (ticker) {
        tickerCounts.set(ticker, (tickerCounts.get(ticker) || 0) + 1);
      }
    });

    const duplicateTickers = Array.from(tickerCounts.entries())
      .filter(([ticker, count]) => count > 1)
      .map(([ticker]) => ticker);

    const duplicateCount = Array.from(tickerCounts.entries())
      .filter(([ticker, count]) => count > 1)
      .reduce((total, [ticker, count]) => total + (count - 1), 0);

    return {
      totalRecords: snapshot.docs.length,
      uniqueTickers: tickerCounts.size,
      duplicateTickers,
      duplicateCount
    };
  } catch (error) {
    console.error('Error getting duplicate stats:', error);
    throw error;
  }
}