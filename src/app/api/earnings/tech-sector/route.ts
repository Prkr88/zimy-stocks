import { NextRequest, NextResponse } from 'next/server';
import { createEarningsAgent } from '@/lib/agents/earningsAgent';

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
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "fetch-tech-sector" or "update-tech-sector"' },
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
          availableActions: ['fetch-tech-sector', 'update-tech-sector'],
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