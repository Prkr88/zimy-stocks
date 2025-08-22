import { NextRequest, NextResponse } from 'next/server';
import { initializeEnhancedAnalysts } from '@/scripts/initializeEnhancedAnalysts';

export async function POST(request: NextRequest) {
  try {
    console.log('Initializing enhanced analyst tracking system...');
    
    const result = await initializeEnhancedAnalysts();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        analysts: result.analysts,
        count: result.analysts.length
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to initialize enhanced analysts'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in init-enhanced-analysts API:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to initialize enhanced analyst system'
    }, { status: 500 });
  }
}