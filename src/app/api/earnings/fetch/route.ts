import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { createEarningsProvider, normalizeEarningsEvent } from '@/lib/services/earningsService';
import type { EarningsEvent } from '@/types';

export async function POST(request: NextRequest) {
  try {
    // Verify this is a server-side request or has proper authentication
    const authHeader = request.headers.get('authorization');
    const apiKey = request.headers.get('x-api-key');
    
    // In production, you'd verify the API key or auth token
    if (process.env.NODE_ENV === 'production' && !apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }

    const { startDate, endDate, forceRefresh } = await request.json();

    const provider = createEarningsProvider();
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Clear existing data if force refresh is requested
    if (forceRefresh) {
      const existingQuery = adminDb.collection('earnings_events')
        .where('expectedDate', '>=', start)
        .where('expectedDate', '<=', end);
      
      const existingDocs = await existingQuery.get();
      await Promise.all(existingDocs.docs.map(doc => doc.ref.delete()));
    }

    // Fetch new earnings data
    const rawEvents = await provider.fetchUpcomingEarnings(start, end);
    
    // Normalize and filter valid events
    const normalizedEvents = rawEvents
      .map(normalizeEarningsEvent)
      .filter(Boolean) as Omit<EarningsEvent, 'id' | 'createdAt' | 'updatedAt'>[];

    // Save to Firestore
    const savedEvents = [];
    for (const event of normalizedEvents) {
      try {
        // Check if event already exists
        const existingQuery = adminDb.collection('earnings_events')
          .where('ticker', '==', event.ticker)
          .where('expectedDate', '==', event.expectedDate);
        
        const existing = await existingQuery.get();
        
        if (existing.empty) {
          const docRef = await adminDb.collection('earnings_events').add({
            ...event,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          
          savedEvents.push({
            ...event,
            id: docRef.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      } catch (error) {
        console.error('Error saving earnings event:', error, event);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fetched and saved ${savedEvents.length} earnings events`,
      events: savedEvents,
      totalFetched: rawEvents.length,
      dateRange: { startDate: start, endDate: end },
    });

  } catch (error) {
    console.error('Error in earnings fetch API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch earnings data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const market = searchParams.get('market');

    let earningsQuery = adminDb.collection('earnings_events');

    if (startDate) {
      earningsQuery = earningsQuery.where('expectedDate', '>=', new Date(startDate));
    }
    
    if (endDate) {
      earningsQuery = earningsQuery.where('expectedDate', '<=', new Date(endDate));
    }
    
    if (market) {
      earningsQuery = earningsQuery.where('market', '==', market);
    }

    const snapshot = await earningsQuery.get();
    const events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      events,
      count: events.length,
    });

  } catch (error) {
    console.error('Error in earnings GET API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch earnings events',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}