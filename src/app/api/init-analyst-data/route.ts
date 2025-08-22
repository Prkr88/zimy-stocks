import { NextRequest, NextResponse } from 'next/server';
import { initializeAnalystCredibilityData } from '@/scripts/initializeAnalystData';

export async function POST(request: NextRequest) {
  try {
    console.log('Initializing analyst credibility data...');
    
    const result = await initializeAnalystCredibilityData();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        count: result.count
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in init-analyst-data API:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to initialize analyst data'
    }, { status: 500 });
  }
}