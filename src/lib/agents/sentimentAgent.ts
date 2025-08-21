import { createSerperTool } from "../tools/serperTool";
import { adminDb } from "../firebase-admin";

/**
 * Sentiment Agent
 * Analyzes analyst commentary and news sentiment around earnings
 */
export class SentimentAgent {
  private serperTool: any;
  private openaiModel: string;
  
  constructor() {
    this.serperTool = createSerperTool();
    this.openaiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  /**
   * Analyze sentiment for a ticker
   */
  async analyzeSentiment(ticker: string): Promise<{
    ticker: string;
    sentiment: {
      score: 'Bullish' | 'Neutral' | 'Bearish';
      confidence: number;
      top_quotes: string[];
      analyst_rating_sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Unknown';
      news_sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Unknown';
      social_sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Unknown';
    };
    sources: {
      analyst_commentary: string[];
      news_headlines: string[];
      social_mentions: string[];
    };
    lastUpdated: Date;
  }> {
    try {
      console.log(`Analyzing sentiment for ${ticker}...`);
      
      // Gather sentiment data from multiple sources
      const [analystData, newsData, socialData] = await Promise.all([
        this.getAnalystCommentary(ticker),
        this.getNewsHeadlines(ticker),
        this.getSocialMentions(ticker)
      ]);
      
      // Analyze sentiment using LLM
      const sentimentAnalysis = await this.performSentimentAnalysis(ticker, {
        analyst: analystData,
        news: newsData,
        social: socialData
      });
      
      return {
        ticker,
        sentiment: sentimentAnalysis,
        sources: {
          analyst_commentary: analystData.content,
          news_headlines: newsData.content,
          social_mentions: socialData.content
        },
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error(`Error analyzing sentiment for ${ticker}:`, error);
      throw error;
    }
  }

  /**
   * Get analyst commentary
   */
  private async getAnalystCommentary(ticker: string): Promise<{
    content: string[];
    rawData: string;
  }> {
    try {
      const queries = [
        `${ticker} analyst opinion rating upgrade downgrade site:barrons.com OR site:benzinga.com`,
        `${ticker} Wall Street analyst commentary recent site:marketwatch.com OR site:reuters.com`,
        `${ticker} price target raised lowered analyst note site:cnbc.com OR site:seekingalpha.com`
      ];
      
      let allContent: string[] = [];
      let allRawData = '';
      
      for (const query of queries) {
        try {
          console.log(`Searching analyst commentary: ${query}`);
          const searchResult = await this.serperTool.search(query);
          
          // Extract relevant quotes and commentary
          const extractedContent = await this.extractQuotes(searchResult, 'analyst');
          allContent.push(...extractedContent);
          allRawData += `\\n\\n=== ${query} ===\\n${searchResult}`;
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.warn(`Failed to search analyst commentary: ${query}`, error);
        }
      }
      
      return {
        content: allContent.slice(0, 10), // Limit to top 10 quotes
        rawData: allRawData
      };
    } catch (error) {
      console.error('Error getting analyst commentary:', error);
      return { content: [], rawData: '' };
    }
  }

  /**
   * Get news headlines and sentiment
   */
  private async getNewsHeadlines(ticker: string): Promise<{
    content: string[];
    rawData: string;
  }> {
    try {
      const queries = [
        `${ticker} earnings news headlines today yesterday site:yahoo.com OR site:bloomberg.com`,
        `${ticker} stock news sentiment bull bear site:marketwatch.com OR site:reuters.com`,
        `${ticker} company news latest developments site:cnbc.com OR site:fool.com`
      ];
      
      let allContent: string[] = [];
      let allRawData = '';
      
      for (const query of queries) {
        try {
          console.log(`Searching news headlines: ${query}`);
          const searchResult = await this.serperTool.search(query);
          
          // Extract headlines
          const extractedContent = await this.extractQuotes(searchResult, 'news');
          allContent.push(...extractedContent);
          allRawData += `\\n\\n=== ${query} ===\\n${searchResult}`;
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.warn(`Failed to search news headlines: ${query}`, error);
        }
      }
      
      return {
        content: allContent.slice(0, 15), // Limit to top 15 headlines
        rawData: allRawData
      };
    } catch (error) {
      console.error('Error getting news headlines:', error);
      return { content: [], rawData: '' };
    }
  }

  /**
   * Get social media mentions and sentiment
   */
  private async getSocialMentions(ticker: string): Promise<{
    content: string[];
    rawData: string;
  }> {
    try {
      const queries = [
        `${ticker} reddit wallstreetbets sentiment bull bear site:reddit.com`,
        `${ticker} twitter sentiment stock discussion site:twitter.com`,
        `${ticker} stocktwits sentiment bullish bearish site:stocktwits.com`
      ];
      
      let allContent: string[] = [];
      let allRawData = '';
      
      for (const query of queries) {
        try {
          console.log(`Searching social mentions: ${query}`);
          const searchResult = await this.serperTool.search(query);
          
          // Extract social sentiment
          const extractedContent = await this.extractQuotes(searchResult, 'social');
          allContent.push(...extractedContent);
          allRawData += `\\n\\n=== ${query} ===\\n${searchResult}`;
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.warn(`Failed to search social mentions: ${query}`, error);
        }
      }
      
      return {
        content: allContent.slice(0, 10), // Limit to top 10 mentions
        rawData: allRawData
      };
    } catch (error) {
      console.error('Error getting social mentions:', error);
      return { content: [], rawData: '' };
    }
  }

  /**
   * Extract relevant quotes from search results
   */
  private async extractQuotes(searchResults: string, type: 'analyst' | 'news' | 'social'): Promise<string[]> {
    try {
      const prompt = `
Extract relevant ${type} content from these search results. Focus on sentiment-bearing statements.

Search Results:
${searchResults}

For ${type} content, look for:
${type === 'analyst' ? '- Analyst opinions, ratings, price targets, recommendations' : ''}
${type === 'news' ? '- Headlines and key sentences expressing sentiment or outlook' : ''}
${type === 'social' ? '- Social media posts expressing sentiment, opinions, or predictions' : ''}

Return a JSON array of strings containing the most relevant quotes/statements:
["quote 1", "quote 2", "quote 3"]

Rules:
- Extract 3-8 most relevant sentiment-bearing statements
- Keep quotes concise (1-2 sentences each)
- Focus on recent content
- Include both positive and negative sentiment if present
- Return only valid JSON array
`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: this.openaiModel,
          messages: [
            {
              role: 'system',
              content: 'You are a content extraction assistant. Return only valid JSON arrays.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 400
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        return [];
      }

      const quotes = JSON.parse(content);
      return Array.isArray(quotes) ? quotes : [];
    } catch (error) {
      console.error('Error extracting quotes:', error);
      return [];
    }
  }

  /**
   * Perform comprehensive sentiment analysis
   */
  private async performSentimentAnalysis(ticker: string, data: {
    analyst: { content: string[]; rawData: string };
    news: { content: string[]; rawData: string };
    social: { content: string[]; rawData: string };
  }): Promise<{
    score: 'Bullish' | 'Neutral' | 'Bearish';
    confidence: number;
    top_quotes: string[];
    analyst_rating_sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Unknown';
    news_sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Unknown';
    social_sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Unknown';
  }> {
    try {
      const allContent = [
        ...data.analyst.content,
        ...data.news.content,
        ...data.social.content
      ];

      const prompt = `
You are a financial sentiment analyst. Analyze the sentiment for ${ticker} based on this content.

Analyst Commentary:
${data.analyst.content.join('\\n')}

News Headlines:
${data.news.content.join('\\n')}

Social Mentions:
${data.social.content.join('\\n')}

Provide a comprehensive sentiment analysis as JSON:
{
  "score": "Bullish" | "Neutral" | "Bearish",
  "confidence": <0.0-1.0>,
  "top_quotes": [<3-5 most impactful quotes>],
  "analyst_rating_sentiment": "Positive" | "Neutral" | "Negative" | "Unknown",
  "news_sentiment": "Positive" | "Neutral" | "Negative" | "Unknown", 
  "social_sentiment": "Positive" | "Neutral" | "Negative" | "Unknown"
}

Rules:
- Overall score: Bullish (mostly positive), Neutral (mixed/unclear), Bearish (mostly negative)
- Confidence: How certain are you about the sentiment (0.0-1.0)
- Top quotes: Select the most impactful statements that support your analysis
- Individual sentiments: Rate each category separately
- Weight analyst sentiment higher than social sentiment
- Consider both recent performance and future outlook
- Return only valid JSON
`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: this.openaiModel,
          messages: [
            {
              role: 'system',
              content: 'You are a financial sentiment analysis expert. Return only valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 600
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const responseData = await response.json();
      const content = responseData.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const analysis = JSON.parse(content);
      
      // Validate and sanitize
      return {
        score: this.validateSentimentScore(analysis.score),
        confidence: Math.max(0, Math.min(1, analysis.confidence || 0.5)),
        top_quotes: Array.isArray(analysis.top_quotes) ? analysis.top_quotes.slice(0, 5) : [],
        analyst_rating_sentiment: this.validateIndividualSentiment(analysis.analyst_rating_sentiment),
        news_sentiment: this.validateIndividualSentiment(analysis.news_sentiment),
        social_sentiment: this.validateIndividualSentiment(analysis.social_sentiment)
      };
    } catch (error) {
      console.error('Error performing sentiment analysis:', error);
      // Return default neutral sentiment on error
      return {
        score: 'Neutral',
        confidence: 0.3,
        top_quotes: [],
        analyst_rating_sentiment: 'Unknown',
        news_sentiment: 'Unknown',
        social_sentiment: 'Unknown'
      };
    }
  }

  /**
   * Validate sentiment score
   */
  private validateSentimentScore(score: string): 'Bullish' | 'Neutral' | 'Bearish' {
    const validScores = ['Bullish', 'Neutral', 'Bearish'];
    return validScores.includes(score) ? score as any : 'Neutral';
  }

  /**
   * Validate individual sentiment
   */
  private validateIndividualSentiment(sentiment: string): 'Positive' | 'Neutral' | 'Negative' | 'Unknown' {
    const validSentiments = ['Positive', 'Neutral', 'Negative', 'Unknown'];
    return validSentiments.includes(sentiment) ? sentiment as any : 'Unknown';
  }

  /**
   * Update database with sentiment analysis
   */
  async updateDatabaseWithSentiment(ticker: string): Promise<{
    success: boolean;
    action: 'created' | 'updated' | 'error';
    message: string;
    data?: any;
  }> {
    try {
      console.log(`Updating database with sentiment analysis for ${ticker}...`);
      
      const sentimentData = await this.analyzeSentiment(ticker);
      
      // Check if sentiment analysis already exists for this ticker
      const existingQuery = adminDb.collection('sentiment_analysis')
        .where('ticker', '==', ticker);
      
      const existingSnapshot = await existingQuery.get();
      
      const recordData = {
        ticker: sentimentData.ticker,
        sentiment_score: sentimentData.sentiment.score,
        confidence: sentimentData.sentiment.confidence,
        top_quotes: sentimentData.sentiment.top_quotes,
        analyst_rating_sentiment: sentimentData.sentiment.analyst_rating_sentiment,
        news_sentiment: sentimentData.sentiment.news_sentiment,
        social_sentiment: sentimentData.sentiment.social_sentiment,
        analyst_commentary: sentimentData.sources.analyst_commentary,
        news_headlines: sentimentData.sources.news_headlines,
        social_mentions: sentimentData.sources.social_mentions,
        dataSource: 'serper_llm',
        updatedAt: new Date()
      };
      
      if (!existingSnapshot.empty) {
        // Update existing record
        const doc = existingSnapshot.docs[0];
        await doc.ref.update(recordData);
        
        return {
          success: true,
          action: 'updated',
          message: `Updated sentiment analysis for ${ticker}`,
          data: sentimentData
        };
      } else {
        // Create new record
        await adminDb.collection('sentiment_analysis').add({
          ...recordData,
          createdAt: new Date()
        });
        
        return {
          success: true,
          action: 'created',
          message: `Created sentiment analysis for ${ticker}`,
          data: sentimentData
        };
      }
    } catch (error) {
      console.error(`Error updating database with sentiment for ${ticker}:`, error);
      return {
        success: false,
        action: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * Create a new SentimentAgent instance
 */
export function createSentimentAgent(): SentimentAgent {
  return new SentimentAgent();
}