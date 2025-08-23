import { NextRequest, NextResponse } from 'next/server';
import { seedRealAnalysts, clearAnalysts } from '@/lib/utils/seedAnalysts';

/**
 * POST /api/analysts/seed - Seed sample analyst data
 * DELETE /api/analysts/seed - Clear all analyst data
 */

export async function POST(request: NextRequest) {
  try {
    console.log('🌱 Seeding real analyst data via API...');
    
    await seedRealAnalysts();
    
    return NextResponse.json({
      success: true,
      message: 'Successfully seeded real analyst data',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error seeding analyst data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to seed analyst data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('🧹 Clearing analyst data via API...');
    
    await clearAnalysts();
    
    return NextResponse.json({
      success: true,
      message: 'Successfully cleared all analyst data',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error clearing analyst data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to clear analyst data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}