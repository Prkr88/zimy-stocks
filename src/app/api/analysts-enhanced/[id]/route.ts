import { NextRequest, NextResponse } from 'next/server';
import { EnhancedAnalystTracker } from '@/lib/analysts/enhancedAnalystTracker';

const tracker = new EnhancedAnalystTracker();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: analystId } = await params;
    
    const profile = await tracker.getAnalystProfile(analystId);
    
    return NextResponse.json({
      success: true,
      ...profile
    });
  } catch (error) {
    console.error('Error fetching analyst profile:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({
        success: false,
        error: 'Analyst not found'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch analyst profile'
    }, { status: 500 });
  }
}