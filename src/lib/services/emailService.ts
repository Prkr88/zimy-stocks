import sgMail from '@sendgrid/mail';
import { format } from 'date-fns';
import type { EarningsEvent, SentimentSignal, User, AlertHistory } from '@/types';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface EmailSummaryData {
  user: User;
  upcomingEarnings: EarningsEvent[];
  sentimentSignals: SentimentSignal[];
  recentAlerts: AlertHistory[];
  period: 'daily' | 'weekly';
}

export class EmailService {
  private fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@zimystocks.com';

  async sendDailySummary(data: EmailSummaryData): Promise<boolean> {
    try {
      const html = this.generateDailySummaryHTML(data);
      const subject = this.generateDailySummarySubject(data);

      await this.sendEmail(data.user.email, subject, html);
      return true;
    } catch (error) {
      console.error('Error sending daily summary:', error);
      return false;
    }
  }

  async sendWeeklySummary(data: EmailSummaryData): Promise<boolean> {
    try {
      const html = this.generateWeeklySummaryHTML(data);
      const subject = this.generateWeeklySummarySubject(data);

      await this.sendEmail(data.user.email, subject, html);
      return true;
    } catch (error) {
      console.error('Error sending weekly summary:', error);
      return false;
    }
  }

  async sendEarningsAlert(
    userEmail: string,
    earningsEvent: EarningsEvent,
    sentiment?: SentimentSignal
  ): Promise<boolean> {
    try {
      const html = this.generateEarningsAlertHTML(earningsEvent, sentiment);
      const subject = `📊 Earnings Alert: ${earningsEvent.ticker} - ${earningsEvent.companyName}`;

      await this.sendEmail(userEmail, subject, html);
      return true;
    } catch (error) {
      console.error('Error sending earnings alert:', error);
      return false;
    }
  }

  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const msg = {
      to,
      from: {
        email: this.fromEmail,
        name: 'Zimy Stocks'
      },
      subject,
      html,
      text: this.htmlToText(html),
    };

    await sgMail.send(msg);
  }

  private generateDailySummarySubject(data: EmailSummaryData): string {
    const date = format(new Date(), 'MMM dd, yyyy');
    const earningsCount = data.upcomingEarnings.length;
    
    if (earningsCount === 0) {
      return `📊 Daily Summary - ${date} - No earnings today`;
    }
    
    return `📊 Daily Summary - ${date} - ${earningsCount} earnings event${earningsCount === 1 ? '' : 's'}`;
  }

  private generateWeeklySummarySubject(data: EmailSummaryData): string {
    const date = format(new Date(), 'MMM dd, yyyy');
    const earningsCount = data.upcomingEarnings.length;
    
    return `📈 Weekly Summary - ${date} - ${earningsCount} upcoming earnings`;
  }

  private generateDailySummaryHTML(data: EmailSummaryData): string {
    const { user, upcomingEarnings, sentimentSignals, recentAlerts } = data;
    const today = format(new Date(), 'EEEE, MMMM dd, yyyy');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Zimy Stocks Daily Summary</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #374151; border-bottom: 2px solid #E5E7EB; padding-bottom: 10px; }
        .earnings-item { background: #F9FAFB; border-left: 4px solid #4F46E5; padding: 15px; margin-bottom: 15px; border-radius: 0 4px 4px 0; }
        .sentiment-positive { border-left-color: #10B981; }
        .sentiment-negative { border-left-color: #EF4444; }
        .sentiment-neutral { border-left-color: #F59E0B; }
        .meta { font-size: 14px; color: #6B7280; margin-top: 8px; }
        .footer { background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 14px; }
        .badge { display: inline-block; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; }
        .badge-positive { background: #D1FAE5; color: #065F46; }
        .badge-negative { background: #FEE2E2; color: #991B1B; }
        .badge-neutral { background: #FEF3C7; color: #92400E; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Zimy Stocks Daily Summary</h1>
            <p>${today}</p>
        </div>
        
        <div class="content">
            <p>Hello ${user.displayName || user.email},</p>
            
            ${upcomingEarnings.length > 0 ? `
            <div class="section">
                <h2>📈 Today's Earnings (${upcomingEarnings.length})</h2>
                ${upcomingEarnings.map(earnings => {
                  const sentiment = sentimentSignals.find(s => s.ticker === earnings.ticker);
                  const sentimentClass = sentiment ? `sentiment-${sentiment.sentiment}` : '';
                  
                  return `
                  <div class="earnings-item ${sentimentClass}">
                      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                          <div>
                              <strong>${earnings.ticker}</strong> - ${earnings.companyName}
                              ${sentiment ? `<span class="badge badge-${sentiment.sentiment}">${sentiment.sentiment.toUpperCase()}</span>` : ''}
                          </div>
                          <div style="text-align: right; font-size: 14px; color: #6B7280;">
                              ${format(new Date(earnings.expectedDate), 'MMM dd')}
                              <br>${earnings.expectedTime.replace('_', ' ')}
                          </div>
                      </div>
                      ${sentiment ? `<div class="meta">🤖 ${sentiment.reasoning}</div>` : ''}
                      <div class="meta">
                          ${earnings.sector} • ${earnings.market}
                          ${earnings.analystEstimate ? ` • Est: $${earnings.analystEstimate}` : ''}
                      </div>
                  </div>
                  `;
                }).join('')}
            </div>
            ` : `
            <div class="section">
                <h2>📈 Today's Earnings</h2>
                <p>No earnings events scheduled for today from your watchlisted companies.</p>
            </div>
            `}

            ${recentAlerts.length > 0 ? `
            <div class="section">
                <h2>🔔 Recent Alerts (${recentAlerts.length})</h2>
                ${recentAlerts.slice(0, 3).map(alert => `
                <div class="earnings-item">
                    <strong>${alert.ticker}</strong> - ${alert.type}
                    <div class="meta">${format(new Date(alert.sentAt), 'MMM dd, HH:mm')} • ${alert.status}</div>
                    <div style="margin-top: 8px;">${alert.message}</div>
                </div>
                `).join('')}
            </div>
            ` : ''}
        </div>
        
        <div class="footer">
            <p>This is an automated email from Zimy Stocks. To unsubscribe or modify preferences, visit your <a href="${process.env.NEXT_PUBLIC_APP_URL}/alerts">alert settings</a>.</p>
            <p>&copy; 2024 Zimy Stocks. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  private generateWeeklySummaryHTML(data: EmailSummaryData): string {
    const { user, upcomingEarnings, sentimentSignals } = data;
    const weekStart = format(new Date(), 'MMM dd');
    const weekEnd = format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'MMM dd, yyyy');

    // Group earnings by date
    const earningsByDate: { [key: string]: EarningsEvent[] } = {};
    upcomingEarnings.forEach(earnings => {
      const dateKey = format(new Date(earnings.expectedDate), 'yyyy-MM-dd');
      if (!earningsByDate[dateKey]) {
        earningsByDate[dateKey] = [];
      }
      earningsByDate[dateKey].push(earnings);
    });

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Zimy Stocks Weekly Summary</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #7C3AED; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #374151; border-bottom: 2px solid #E5E7EB; padding-bottom: 10px; }
        .day-section { margin-bottom: 25px; }
        .day-header { background: #F3F4F6; padding: 10px 15px; font-weight: 600; color: #374151; border-radius: 4px; }
        .earnings-item { background: #F9FAFB; border-left: 4px solid #4F46E5; padding: 15px; margin: 10px 0; border-radius: 0 4px 4px 0; }
        .sentiment-positive { border-left-color: #10B981; }
        .sentiment-negative { border-left-color: #EF4444; }
        .sentiment-neutral { border-left-color: #F59E0B; }
        .meta { font-size: 14px; color: #6B7280; margin-top: 8px; }
        .footer { background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 14px; }
        .badge { display: inline-block; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; }
        .badge-positive { background: #D1FAE5; color: #065F46; }
        .badge-negative { background: #FEE2E2; color: #991B1B; }
        .badge-neutral { background: #FEF3C7; color: #92400E; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📈 Zimy Stocks Weekly Summary</h1>
            <p>Week of ${weekStart} - ${weekEnd}</p>
        </div>
        
        <div class="content">
            <p>Hello ${user.displayName || user.email},</p>
            
            <div class="section">
                <h2>📊 Upcoming Earnings This Week (${upcomingEarnings.length})</h2>
                
                ${Object.keys(earningsByDate).length > 0 ? 
                  Object.keys(earningsByDate).sort().map(dateKey => {
                    const dayEarnings = earningsByDate[dateKey];
                    const dayName = format(new Date(dateKey), 'EEEE, MMM dd');
                    
                    return `
                    <div class="day-section">
                        <div class="day-header">${dayName}</div>
                        ${dayEarnings.map(earnings => {
                          const sentiment = sentimentSignals.find(s => s.ticker === earnings.ticker);
                          const sentimentClass = sentiment ? `sentiment-${sentiment.sentiment}` : '';
                          
                          return `
                          <div class="earnings-item ${sentimentClass}">
                              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                  <div>
                                      <strong>${earnings.ticker}</strong> - ${earnings.companyName}
                                      ${sentiment ? `<span class="badge badge-${sentiment.sentiment}">${sentiment.sentiment.toUpperCase()}</span>` : ''}
                                  </div>
                                  <div style="text-align: right; font-size: 14px; color: #6B7280;">
                                      ${earnings.expectedTime.replace('_', ' ')}
                                  </div>
                              </div>
                              ${sentiment ? `<div class="meta">🤖 ${sentiment.reasoning}</div>` : ''}
                              <div class="meta">
                                  ${earnings.sector} • ${earnings.market}
                                  ${earnings.analystEstimate ? ` • Est: $${earnings.analystEstimate}` : ''}
                              </div>
                          </div>
                          `;
                        }).join('')}
                    </div>
                    `;
                  }).join('')
                : '<p>No earnings events scheduled this week from your watchlisted companies.</p>'}
            </div>
        </div>
        
        <div class="footer">
            <p>This is an automated weekly summary from Zimy Stocks. To unsubscribe or modify preferences, visit your <a href="${process.env.NEXT_PUBLIC_APP_URL}/alerts">alert settings</a>.</p>
            <p>&copy; 2024 Zimy Stocks. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  private generateEarningsAlertHTML(earnings: EarningsEvent, sentiment?: SentimentSignal): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Earnings Alert</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #DC2626; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .alert-box { background: #FEE2E2; border: 1px solid #FECACA; border-radius: 6px; padding: 15px; margin: 15px 0; }
        .sentiment-box { padding: 15px; margin: 15px 0; border-radius: 6px; }
        .sentiment-positive { background: #D1FAE5; border: 1px solid #A7F3D0; }
        .sentiment-negative { background: #FEE2E2; border: 1px solid #FECACA; }
        .sentiment-neutral { background: #FEF3C7; border: 1px solid #FDE68A; }
        .footer { background: #F9FAFB; padding: 15px; text-align: center; color: #6B7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Earnings Alert</h1>
        </div>
        
        <div class="content">
            <div class="alert-box">
                <h2 style="margin-top: 0;">${earnings.ticker} - ${earnings.companyName}</h2>
                <p><strong>Earnings Date:</strong> ${format(new Date(earnings.expectedDate), 'EEEE, MMMM dd, yyyy')}</p>
                <p><strong>Time:</strong> ${earnings.expectedTime.replace('_', ' ')}</p>
                <p><strong>Sector:</strong> ${earnings.sector}</p>
                <p><strong>Market:</strong> ${earnings.market}</p>
                ${earnings.analystEstimate ? `<p><strong>Analyst Estimate:</strong> $${earnings.analystEstimate}</p>` : ''}
                ${earnings.previousEarnings ? `<p><strong>Previous Earnings:</strong> $${earnings.previousEarnings}</p>` : ''}
            </div>
            
            ${sentiment ? `
            <div class="sentiment-box sentiment-${sentiment.sentiment}">
                <h3>🤖 AI Sentiment Analysis</h3>
                <p><strong>Sentiment:</strong> ${sentiment.sentiment.toUpperCase()}</p>
                <p><strong>Confidence:</strong> ${Math.round(sentiment.confidence * 100)}%</p>
                <p><strong>Reasoning:</strong> ${sentiment.reasoning}</p>
            </div>
            ` : ''}
            
            <p style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background: #4F46E5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">View Dashboard</a>
            </p>
        </div>
        
        <div class="footer">
            <p>This is an automated alert from Zimy Stocks.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  private htmlToText(html: string): string {
    // Simple HTML to text conversion
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export const emailService = new EmailService();