import { NextRequest, NextResponse } from 'next/server';
import { removeDuplicateTickers, getDuplicateStats } from '@/lib/utils/dbCleanup';

export async function GET() {
  try {
    console.log('Getting duplicate statistics...');
    
    const stats = await getDuplicateStats();
    
    return NextResponse.json({
      success: true,
      message: 'Duplicate statistics retrieved successfully',
      stats
    });
  } catch (error) {
    console.error('Error getting duplicate stats:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'remove-duplicates') {
      console.log('Starting duplicate removal process...');
      
      const result = await removeDuplicateTickers();
      
      return NextResponse.json({
        success: true,
        message: `Cleanup completed: ${result.duplicatesRemoved} duplicates removed`,
        result
      });
    } else if (action === 'get-stats') {
      const stats = await getDuplicateStats();
      
      return NextResponse.json({
        success: true,
        message: 'Duplicate statistics retrieved successfully',
        stats
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Use "remove-duplicates" or "get-stats"'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in cleanup API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}