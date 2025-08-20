import OpenAI from 'openai';
import { createHash } from 'crypto';
import { 
  getOpenAICallByHash, 
  logOpenAICall, 
  createSentimentSignal,
  getDailyUsageMetrics,
  updateDailyUsageMetrics
} from '@/lib/firestore';
import type { EarningsEvent, SentimentSignal, OpenAICallLog } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface SentimentAnalysisInput {
  ticker: string;
  companyName: string;
  sector: string;
  market: string;
  earningsDate: Date;
  analystEstimate?: number;
  previousEarnings?: number;
  additionalContext?: string;
}

export interface SentimentAnalysisResult {
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;
  reasoning: string;
  confidence: number;
  sourceData: string;
}

// Cost-optimized sentiment analysis service
export class SentimentAnalysisService {
  private readonly maxDailyCalls: number = 50; // Stay under $5/month budget
  private readonly maxTokensPerCall: number = 1500;
  private readonly model: string = 'gpt-3.5-turbo'; // More cost-effective than GPT-4

  async analyzeSentiment(input: SentimentAnalysisInput): Promise<SentimentAnalysisResult> {
    // Check daily usage limits
    await this.checkDailyLimits();

    // Create input hash for deduplication
    const inputHash = this.createInputHash(input);
    
    // Check if we've already analyzed this exact input
    const existingCall = await getOpenAICallByHash(inputHash);
    if (existingCall && existingCall.resultUsed) {
      console.log(`Using cached result for ${input.ticker}`);
      return this.parseExistingResult(existingCall);
    }

    // Generate prompt
    const prompt = this.createPrompt(input);
    
    try {
      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a financial analyst providing earnings sentiment analysis. Respond only with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.maxTokensPerCall,
        temperature: 0.3, // Lower temperature for more consistent results
      });

      const result = this.parseOpenAIResponse(response);
      
      // Log the API call for cost tracking and caching
      await this.logAPICall(input, prompt, response, inputHash, result);
      
      // Update daily usage metrics
      await this.updateUsageMetrics(response.usage?.total_tokens || 0);

      return result;
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`Sentiment analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async analyzeBatchSentiment(inputs: SentimentAnalysisInput[]): Promise<SentimentAnalysisResult[]> {
    // Process in batches to respect rate limits
    const batchSize = 5;
    const results: SentimentAnalysisResult[] = [];
    
    for (let i = 0; i < inputs.length; i += batchSize) {
      const batch = inputs.slice(i, i + batchSize);
      
      // Process batch with delay between calls
      const batchResults = await Promise.all(
        batch.map(async (input, index) => {
          // Add delay between API calls to respect rate limits
          if (index > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          try {
            return await this.analyzeSentiment(input);
          } catch (error) {
            console.error(`Error analyzing sentiment for ${input.ticker}:`, error);
            // Return neutral sentiment as fallback
            return {
              sentiment: 'neutral' as const,
              sentimentScore: 0.5,
              reasoning: 'Analysis failed - default neutral sentiment',
              confidence: 0.1,
              sourceData: JSON.stringify(input),
            };
          }
        })
      );
      
      results.push(...batchResults);
      
      // Delay between batches
      if (i + batchSize < inputs.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return results;
  }

  private async checkDailyLimits(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const metrics = await getDailyUsageMetrics(today);
    
    if (metrics && metrics.openaiCalls >= this.maxDailyCalls) {
      throw new Error('Daily OpenAI API call limit reached. Please try again tomorrow.');
    }
  }

  private createInputHash(input: SentimentAnalysisInput): string {
    // Create a hash of the input to enable deduplication
    const hashInput = {
      ticker: input.ticker,
      sector: input.sector,
      market: input.market,
      earningsDate: input.earningsDate.toISOString().split('T')[0], // Date only
      analystEstimate: input.analystEstimate,
      previousEarnings: input.previousEarnings,
    };
    
    return createHash('sha256')
      .update(JSON.stringify(hashInput))
      .digest('hex');
  }

  private createPrompt(input: SentimentAnalysisInput): string {
    return `Analyze the earnings sentiment for the following company:

Company: ${input.companyName} (${input.ticker})
Sector: ${input.sector}
Market: ${input.market}
Earnings Date: ${input.earningsDate.toISOString().split('T')[0]}
${input.analystEstimate ? `Analyst Estimate: $${input.analystEstimate}` : ''}
${input.previousEarnings ? `Previous Earnings: $${input.previousEarnings}` : ''}
${input.additionalContext ? `Additional Context: ${input.additionalContext}` : ''}

Based on this information, provide a sentiment analysis for the upcoming earnings. Consider:
1. Historical performance vs estimates
2. Sector trends and market conditions
3. Company-specific factors
4. Overall market sentiment

Respond with ONLY a JSON object in this exact format:
{
  "sentiment": "positive|neutral|negative",
  "sentimentScore": 0.0-1.0,
  "reasoning": "Brief explanation of sentiment rationale",
  "confidence": 0.0-1.0
}

Rules:
- sentimentScore: 0.0-0.4 = negative, 0.4-0.6 = neutral, 0.6-1.0 = positive
- confidence: How certain you are of this analysis (0.0-1.0)
- reasoning: Max 150 characters
- Use only the sentiment values: "positive", "neutral", "negative"`;
  }

  private parseOpenAIResponse(response: any): SentimentAnalysisResult {
    try {
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      const parsed = JSON.parse(content.trim());
      
      // Validate required fields
      if (!parsed.sentiment || typeof parsed.sentimentScore !== 'number' || !parsed.reasoning) {
        throw new Error('Invalid response format from OpenAI');
      }

      // Ensure sentiment is valid
      if (!['positive', 'neutral', 'negative'].includes(parsed.sentiment)) {
        throw new Error('Invalid sentiment value');
      }

      // Clamp values to valid ranges
      const sentimentScore = Math.max(0, Math.min(1, parsed.sentimentScore));
      const confidence = Math.max(0, Math.min(1, parsed.confidence || 0.5));

      return {
        sentiment: parsed.sentiment,
        sentimentScore,
        reasoning: parsed.reasoning.substring(0, 150), // Ensure max length
        confidence,
        sourceData: JSON.stringify({ openaiResponse: content }),
      };
    } catch (error) {
      console.error('Error parsing OpenAI response:', error, response);
      throw new Error('Failed to parse sentiment analysis result');
    }
  }

  private parseExistingResult(callLog: OpenAICallLog): SentimentAnalysisResult {
    try {
      const sourceData = JSON.parse(callLog.response);
      return {
        sentiment: sourceData.sentiment,
        sentimentScore: sourceData.sentimentScore,
        reasoning: sourceData.reasoning,
        confidence: sourceData.confidence,
        sourceData: callLog.response,
      };
    } catch (error) {
      throw new Error('Failed to parse cached sentiment result');
    }
  }

  private async logAPICall(
    input: SentimentAnalysisInput,
    prompt: string,
    response: any,
    inputHash: string,
    result: SentimentAnalysisResult
  ): Promise<void> {
    try {
      const callLog: Omit<OpenAICallLog, 'id'> = {
        ticker: input.ticker,
        inputHash,
        prompt,
        response: JSON.stringify(result),
        tokensUsed: response.usage?.total_tokens || 0,
        cost: this.calculateCost(response.usage?.total_tokens || 0),
        createdAt: new Date(),
        resultUsed: true,
      };

      await logOpenAICall(callLog);
    } catch (error) {
      console.error('Error logging OpenAI call:', error);
      // Don't throw here - logging failure shouldn't break the main flow
    }
  }

  private async updateUsageMetrics(tokensUsed: number): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const currentMetrics = await getDailyUsageMetrics(today);
      
      const updatedMetrics = {
        date: today,
        openaiCalls: (currentMetrics?.openaiCalls || 0) + 1,
        tokensUsed: (currentMetrics?.tokensUsed || 0) + tokensUsed,
        totalCost: (currentMetrics?.totalCost || 0) + this.calculateCost(tokensUsed),
        uniqueCompanies: (currentMetrics?.uniqueCompanies || 0) + 1, // This is approximate
        alertsSent: currentMetrics?.alertsSent || 0,
      };

      await updateDailyUsageMetrics(today, updatedMetrics);
    } catch (error) {
      console.error('Error updating usage metrics:', error);
    }
  }

  private calculateCost(tokens: number): number {
    // GPT-3.5-turbo pricing: ~$0.002 per 1K tokens (as of 2024)
    return (tokens / 1000) * 0.002;
  }
}

// Factory function
export function createSentimentService(): SentimentAnalysisService {
  return new SentimentAnalysisService();
}

// Utility function to create sentiment signal from earnings event
export async function createSentimentFromEarnings(
  earningsEvent: EarningsEvent,
  additionalContext?: string
): Promise<SentimentSignal> {
  const service = createSentimentService();
  
  const input: SentimentAnalysisInput = {
    ticker: earningsEvent.ticker,
    companyName: earningsEvent.companyName,
    sector: earningsEvent.sector,
    market: earningsEvent.market,
    earningsDate: new Date(earningsEvent.expectedDate),
    analystEstimate: earningsEvent.analystEstimate,
    previousEarnings: earningsEvent.previousEarnings,
    additionalContext,
  };

  const result = await service.analyzeSentiment(input);
  
  // Create sentiment signal with 7-day expiry
  const signal: Omit<SentimentSignal, 'id'> = {
    ticker: earningsEvent.ticker,
    companyName: earningsEvent.companyName,
    sentiment: result.sentiment,
    sentimentScore: result.sentimentScore,
    reasoning: result.reasoning,
    sourceData: result.sourceData,
    confidence: result.confidence,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  };

  const signalId = await createSentimentSignal(signal);
  
  return {
    ...signal,
    id: signalId,
  };
}