import { NextRequest, NextResponse } from 'next/server';
import { EnhancedAnalystTracker } from '@/lib/analysts/enhancedAnalystTracker';

const tracker = new EnhancedAnalystTracker();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, force = false } = body;
    
    if (action !== 'run_evaluator') {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Use: run_evaluator'
      }, { status: 400 });
    }
    
    console.log('Running analyst evaluator...');
    const startTime = Date.now();
    
    const result = await tracker.runEvaluator(new Date());
    
    const duration = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      message: 'Evaluator completed successfully',
      ...result,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error running evaluator:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to run evaluator',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}