import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { emailService } from '@/lib/services/emailService';
import type { User, EarningsEvent, SentimentSignal, AlertHistory } from '@/types';

export async function POST(request: NextRequest) {
  try {
    // Verify API key for production
    const apiKey = request.headers.get('x-api-key');
    if (process.env.NODE_ENV === 'production' && !apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }

    const { type, userId, userIds } = await request.json();

    if (!type || !['daily', 'weekly'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be "daily" or "weekly"' },
        { status: 400 }
      );
    }

    let targetUserIds = [];
    
    if (userId) {
      targetUserIds = [userId];
    } else if (userIds && Array.isArray(userIds)) {
      targetUserIds = userIds;
    } else {
      // Get all users who have enabled the summary type
      const usersSnapshot = await adminDb.collection('users')
        .where(`preferences.${type}Summary`, '==', true)
        .where('preferences.emailNotifications', '==', true)
        .get();
      
      targetUserIds = usersSnapshot.docs.map(doc => doc.id);
    }

    if (targetUserIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users found with enabled email summaries',
        sent: 0,
        errors: 0,
      });
    }

    const results = [];
    let sentCount = 0;
    let errorCount = 0;

    for (const currentUserId of targetUserIds) {
      try {
        const userDoc = await adminDb.collection('users').doc(currentUserId).get();
        const user = userDoc.exists ? { id: userDoc.id, ...userDoc.data() } as User : null;
        
        if (!user || !user.preferences?.emailNotifications) {
          continue;
        }

        // Check if user has enabled this type of summary
        if (type === 'daily' && !user.preferences.dailySummary) {
          continue;
        }
        if (type === 'weekly' && !user.preferences.weeklySummary) {
          continue;
        }

        // Get user's watchlisted companies
        const watchlistsSnapshot = await adminDb.collection('watchlists')
          .where('userId', '==', currentUserId)
          .get();
        const watchlistedTickers = watchlistsSnapshot.docs
          .flatMap(doc => doc.data().companies || [])
          .map((company: any) => company.ticker);

        if (watchlistedTickers.length === 0) {
          continue; // Skip users with no watchlisted companies
        }

        // Get relevant data for the period
        const startDate = new Date();
        const endDate = type === 'daily' 
          ? new Date(Date.now() + 24 * 60 * 60 * 1000) // Next 24 hours
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Next 7 days

        // Get upcoming earnings - simplified to avoid complex index
        const earningsSnapshot = await adminDb.collection('earnings_events')
          .where('expectedDate', '>=', startDate)
          .limit(100)
          .get();
        const allEarnings = earningsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EarningsEvent));
        const upcomingEarnings = allEarnings
          .filter(event => 
            new Date(event.expectedDate) <= endDate &&
            ['SP500', 'TA125'].includes(event.market)
          )
          .sort((a, b) => new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime())
          .slice(0, 50);

        // Get sentiment signals - simplified query to avoid index requirements
        const signalsSnapshot = await adminDb.collection('signals_latest')
          .limit(50)
          .get();
        const allSignals = signalsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SentimentSignal));
        const sentimentSignals = allSignals
          .filter(signal => watchlistedTickers.includes(signal.ticker))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 20);

        // Get recent alerts
        const alertsSnapshot = await adminDb.collection('alert_history')
          .where('userId', '==', currentUserId)
          .orderBy('triggeredAt', 'desc')
          .limit(10)
          .get();
        const recentAlerts = alertsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AlertHistory));

        // Filter earnings to only watchlisted companies
        const relevantEarnings = upcomingEarnings.filter(earnings => 
          watchlistedTickers.includes(earnings.ticker) &&
          new Date(earnings.expectedDate) >= startDate &&
          new Date(earnings.expectedDate) <= endDate
        );

        // Filter recent alerts for the time period
        const alertCutoff = type === 'daily' 
          ? new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
        
        const periodAlerts = recentAlerts.filter(alert => 
          new Date(alert.sentAt) >= alertCutoff
        );

        const emailData = {
          user,
          upcomingEarnings: relevantEarnings,
          sentimentSignals,
          recentAlerts: periodAlerts,
          period: type as 'daily' | 'weekly',
        };

        let success = false;
        if (type === 'daily') {
          success = await emailService.sendDailySummary(emailData);
        } else {
          success = await emailService.sendWeeklySummary(emailData);
        }

        if (success) {
          sentCount++;
          results.push({
            userId: currentUserId,
            email: user.email,
            success: true,
            earningsCount: relevantEarnings.length,
            alertsCount: periodAlerts.length,
          });
        } else {
          errorCount++;
          results.push({
            userId: currentUserId,
            email: user.email,
            success: false,
            error: 'Failed to send email',
          });
        }

        // Add delay between emails to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        errorCount++;
        results.push({
          userId: currentUserId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        console.error(`Error sending ${type} summary to user ${currentUserId}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${type} summary sent to ${sentCount} users, ${errorCount} errors`,
      sent: sentCount,
      errors: errorCount,
      results,
    });

  } catch (error) {
    console.error('Error in email summary API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send email summaries',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Individual email sending for testing
export async function PUT(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    if (process.env.NODE_ENV === 'production' && !apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }

    const { type, userEmail, earnings, sentiment } = await request.json();

    if (type === 'earnings_alert') {
      if (!userEmail || !earnings) {
        return NextResponse.json(
          { error: 'userEmail and earnings are required for earnings alert' },
          { status: 400 }
        );
      }

      const success = await emailService.sendEarningsAlert(userEmail, earnings, sentiment);
      
      return NextResponse.json({
        success,
        message: success ? 'Earnings alert sent successfully' : 'Failed to send earnings alert',
      });
    }

    return NextResponse.json(
      { error: 'Invalid email type' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error sending individual email:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send email',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}