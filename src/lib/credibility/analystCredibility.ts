interface AnalystCredibility {
  analyst_id: string;
  analyst_name: string;
  firm: string;
  credibility_score: number;
  track_record: {
    total_predictions: number;
    accurate_predictions: number;
    accuracy_rate: number;
    last_updated: Date;
  };
  specializations: string[]; // e.g., ['tech', 'healthcare']
  historical_performance: {
    rating_accuracy: number; // How often their buy/sell recommendations were correct
    price_target_accuracy: number; // How close their price targets were to actual prices
    timing_accuracy: number; // How well they timed their recommendations
    eps_accuracy: number; // How accurate their EPS estimates were
  };
  recent_performance: {
    last_30_days: number;
    last_90_days: number;
    last_year: number;
  };
  weight_multiplier: number; // 0.5-2.0, how much their opinion should be weighted
}

interface CredibilityCalculation {
  base_accuracy: number;
  recency_factor: number;
  specialization_bonus: number;
  volume_factor: number;
  final_score: number;
}

export class AnalystCredibilityTracker {
  
  static calculateCredibilityScore(analyst: Partial<AnalystCredibility>): CredibilityCalculation {
    const baseAccuracy = analyst.track_record?.accuracy_rate || 0.5;
    
    // Recency factor: recent performance is weighted more heavily
    const recentPerf = analyst.recent_performance;
    const recencyFactor = recentPerf 
      ? (recentPerf.last_30_days * 0.5 + recentPerf.last_90_days * 0.3 + recentPerf.last_year * 0.2)
      : baseAccuracy;
    
    // Specialization bonus: analysts get bonus for covering their specialty sectors
    const specializationBonus = analyst.specializations?.length ? 0.05 : 0;
    
    // Volume factor: more predictions = more reliable (up to a point)
    const totalPredictions = analyst.track_record?.total_predictions || 0;
    const volumeFactor = Math.min(totalPredictions / 100, 1.0) * 0.1;
    
    const finalScore = Math.min(
      Math.max(
        baseAccuracy * 0.4 + 
        recencyFactor * 0.4 + 
        specializationBonus + 
        volumeFactor, 
        0.1
      ), 
      1.0
    );
    
    return {
      base_accuracy: baseAccuracy,
      recency_factor: recencyFactor,
      specialization_bonus: specializationBonus,
      volume_factor: volumeFactor,
      final_score: finalScore
    };
  }
  
  static calculateWeightedRating(
    ratings: Array<{ rating: string; credibility: number; analyst_id: string }>,
    sector?: string
  ): { weighted_rating: string; confidence: number } {
    if (ratings.length === 0) {
      return { weighted_rating: 'No Rating', confidence: 0 };
    }
    
    const ratingValues = {
      'Strong Buy': 5,
      'Buy': 4,
      'Hold': 3,
      'Sell': 2,
      'Strong Sell': 1
    };
    
    const ratingLabels = ['Strong Sell', 'Sell', 'Hold', 'Buy', 'Strong Buy'];
    
    let totalWeight = 0;
    let weightedSum = 0;
    
    ratings.forEach(({ rating, credibility }) => {
      const value = ratingValues[rating as keyof typeof ratingValues] || 3;
      const weight = credibility;
      
      weightedSum += value * weight;
      totalWeight += weight;
    });
    
    if (totalWeight === 0) {
      return { weighted_rating: 'Hold', confidence: 0 };
    }
    
    const weightedAverage = weightedSum / totalWeight;
    const roundedRating = Math.round(weightedAverage);
    const finalRating = ratingLabels[roundedRating - 1] || 'Hold';
    
    // Confidence based on agreement and credibility
    const avgCredibility = totalWeight / ratings.length;
    const ratingVariance = this.calculateRatingVariance(ratings, weightedAverage, ratingValues);
    const confidence = avgCredibility * (1 - ratingVariance);
    
    return {
      weighted_rating: finalRating,
      confidence: Math.max(Math.min(confidence, 1.0), 0.1)
    };
  }
  
  private static calculateRatingVariance(
    ratings: Array<{ rating: string; credibility: number }>,
    weightedAverage: number,
    ratingValues: Record<string, number>
  ): number {
    if (ratings.length <= 1) return 0;
    
    let varianceSum = 0;
    let totalWeight = 0;
    
    ratings.forEach(({ rating, credibility }) => {
      const value = ratingValues[rating as keyof typeof ratingValues] || 3;
      const diff = Math.abs(value - weightedAverage);
      varianceSum += diff * credibility;
      totalWeight += credibility;
    });
    
    return totalWeight > 0 ? (varianceSum / totalWeight) / 4 : 0; // Normalize by max possible difference (4)
  }
  
  static updateAnalystPerformance(
    analystId: string, 
    prediction: {
      type: 'rating' | 'price_target' | 'eps';
      predicted_value: any;
      actual_value: any;
      date: Date;
      ticker: string;
    }
  ): Partial<AnalystCredibility> {
    // This would integrate with database to update analyst performance
    // For now, return structure for database update
    
    const accuracy = this.calculatePredictionAccuracy(prediction);
    
    return {
      analyst_id: analystId,
      track_record: {
        total_predictions: 1, // This would be incremented in database
        accurate_predictions: accuracy > 0.7 ? 1 : 0,
        accuracy_rate: accuracy,
        last_updated: new Date()
      }
    };
  }
  
  private static calculatePredictionAccuracy(prediction: {
    type: 'rating' | 'price_target' | 'eps';
    predicted_value: any;
    actual_value: any;
  }): number {
    switch (prediction.type) {
      case 'price_target':
        const priceDiff = Math.abs(
          (Number(prediction.actual_value) - Number(prediction.predicted_value)) / 
          Number(prediction.predicted_value)
        );
        return Math.max(0, 1 - priceDiff);
        
      case 'eps':
        const epsDiff = Math.abs(
          (Number(prediction.actual_value) - Number(prediction.predicted_value)) / 
          Math.abs(Number(prediction.predicted_value) || 0.01)
        );
        return Math.max(0, 1 - epsDiff);
        
      case 'rating':
        // Rating accuracy would be measured over time based on stock performance
        // This is a simplified version
        return 0.7; // Placeholder
        
      default:
        return 0.5;
    }
  }
}

export type { AnalystCredibility, CredibilityCalculation };