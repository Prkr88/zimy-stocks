import { NextRequest, NextResponse } from 'next/server';
import { EnhancedAnalystTracker, Analyst } from '@/lib/analysts/enhancedAnalystTracker';

const tracker = new EnhancedAnalystTracker();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const orderBy = (searchParams.get('orderBy') || 'score') as 'score' | 'lifetime_calls';
    
    const analysts = await tracker.getTopAnalysts(limit, orderBy);
    
    return NextResponse.json({
      success: true,
      analysts,
      count: analysts.length
    });
  } catch (error) {
    console.error('Error fetching analysts:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch analysts'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    switch (action) {
      case 'create_analyst':
        return await createAnalyst(body);
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: create_analyst'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in analysts API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

async function createAnalyst(data: {
  name: string;
  firm: string;
  score?: number;
  specializations?: string[];
}) {
  try {
    const { name, firm, score, specializations } = data;
    
    if (!name || !firm) {
      return NextResponse.json({
        success: false,
        error: 'Name and firm are required'
      }, { status: 400 });
    }
    
    const analystId = await tracker.createAnalyst({
      name,
      firm,
      score: score || 50,
      lifetime_calls: 0,
      specializations: specializations || []
    });
    
    return NextResponse.json({
      success: true,
      analyst_id: analystId,
      message: 'Analyst created successfully'
    });
  } catch (error) {
    console.error('Error creating analyst:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create analyst'
    }, { status: 500 });
  }
}