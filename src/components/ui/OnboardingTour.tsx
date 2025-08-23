'use client';

import { useState, useEffect } from 'react';

interface TourStep {
  id: string;
  title: string;
  description: string;
  target?: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface OnboardingTourProps {
  isVisible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Zimy Stocks! 🎉',
    description: 'Your smart companion for earnings analysis and stock insights. Let\'s take a quick tour!',
    position: 'bottom'
  },
  {
    id: 'watchlist',
    title: 'Interactive Watchlist ⭐',
    description: 'Click on any ticker to highlight its earnings card. Add companies by clicking the star icon.',
    target: '[data-tour="watchlist"]',
    position: 'right'
  },
  {
    id: 'earnings-cards',
    title: 'Earnings Cards 📊',
    description: 'Each card shows company info, analyst ratings, stock charts, and earnings data. Cards are sorted by rating strength.',
    target: '[data-tour="earnings-grid"]',
    position: 'left'
  },
  {
    id: 'view-modes',
    title: 'View Modes & Sorting 🔄',
    description: 'Switch between grid and list views, and sort by date, company name, or market cap using the controls.',
    target: '[data-tour="grid-controls"]',
    position: 'bottom'
  },
  {
    id: 'analyze-button',
    title: 'Stock Analysis 🚀',
    description: 'Click "Analyze" on any card to refresh analyst data and get the latest insights.',
    target: '[data-tour="analyze-button"]',
    position: 'top'
  },
  {
    id: 'insights',
    title: 'Analyst Insights 💡',
    description: 'Expand any card to see detailed analyst consensus, ratings, and price targets from top Wall Street firms.',
    target: '[data-tour="insights"]',
    position: 'top'
  }
];

export default function OnboardingTour({ isVisible, onComplete, onSkip }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [tourPosition, setTourPosition] = useState({ top: '50%', left: '50%' });

  useEffect(() => {
    if (!isVisible) return;

    const updatePosition = () => {
      const step = tourSteps[currentStep];
      console.log('Tour step:', currentStep, step.title, step.target);
      
      if (step.target) {
        const element = document.querySelector(step.target);
        console.log('Found element:', !!element, step.target);
        
        if (element) {
          const rect = element.getBoundingClientRect();
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
          
          let top: number, left: number;
          const modalWidth = 320; // width of tour modal
          const modalHeight = 400; // approximate height
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          // Use fixed positioning relative to viewport
          switch (step.position) {
            case 'top':
              top = rect.top - modalHeight - 20;
              left = rect.left + rect.width / 2 - modalWidth / 2;
              break;
            case 'bottom':
              top = rect.bottom + 20;
              left = rect.left + rect.width / 2 - modalWidth / 2;
              break;
            case 'left':
              top = rect.top + rect.height / 2 - modalHeight / 2;
              left = rect.left - modalWidth - 20;
              break;
            case 'right':
              top = rect.top + rect.height / 2 - modalHeight / 2;
              left = rect.right + 20;
              break;
            default:
              top = viewportHeight / 2 - modalHeight / 2;
              left = viewportWidth / 2 - modalWidth / 2;
          }
          
          // Keep modal within viewport bounds (fixed positioning)
          const padding = 20;
          left = Math.max(padding, Math.min(left, viewportWidth - modalWidth - padding));
          top = Math.max(padding, Math.min(top, viewportHeight - modalHeight - padding));
          
          console.log('Setting position:', { top: `${top}px`, left: `${left}px` });
          setTourPosition({ top: `${top}px`, left: `${left}px` });
          
          // Scroll element into view
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          
          // Add highlight effect
          element.classList.add('tour-highlight');
          setTimeout(() => {
            element.classList.remove('tour-highlight');
          }, 2000);
        } else {
          console.warn('Element not found:', step.target);
          // If element is not found, center the modal in viewport
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          const modalWidth = 320;
          const modalHeight = 400;
          
          const centerTop = viewportHeight / 2 - modalHeight / 2;
          const centerLeft = viewportWidth / 2 - modalWidth / 2;
          
          setTourPosition({ top: `${centerTop}px`, left: `${centerLeft}px` });
        }
      } else {
        // Center the tour modal for steps without targets
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const modalWidth = 320;
        const modalHeight = 400;
        
        const centerTop = viewportHeight / 2 - modalHeight / 2;
        const centerLeft = viewportWidth / 2 - modalWidth / 2;
        
        setTourPosition({ top: `${centerTop}px`, left: `${centerLeft}px` });
      }
    };

    // Give more time for elements to render, especially for the watchlist
    const timeoutId = setTimeout(updatePosition, 500);
    return () => clearTimeout(timeoutId);
  }, [currentStep, isVisible]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      console.log('Moving to next step:', currentStep + 1);
      setCurrentStep(currentStep + 1);
    } else {
      console.log('Completing tour');
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  if (!isVisible) return null;

  const step = tourSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />
      
      {/* Tour Modal */}
      <div
        className="fixed z-50"
        style={{ top: tourPosition.top, left: tourPosition.left }}
      >
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-sm w-80 border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Step {currentStep + 1} of {tourSteps.length}
              </span>
            </div>
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm"
            >
              Skip Tour
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-6">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
            />
          </div>

          {/* Content */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {step.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              {step.description}
            </p>
            {step.target && !document.querySelector(step.target) && (
              <p className="text-yellow-600 dark:text-yellow-400 text-xs mt-2 italic">
                💡 This feature will be available once data loads
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrevious}
                disabled={isFirstStep}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isFirstStep
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Previous
              </button>
              
              {/* Debug: Show if element exists */}
              {step.target && (
                <span className={`text-xs px-2 py-1 rounded ${
                  document.querySelector(step.target) 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {document.querySelector(step.target) ? '✓' : '✗'}
                </span>
              )}
            </div>
            
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center"
            >
              {isLastStep ? (
                <>
                  Get Started
                  <span className="ml-1">🚀</span>
                </>
              ) : (
                <>
                  Next
                  <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Custom CSS for highlight effect */}
      <style jsx global>{`
        .tour-highlight {
          animation: tourPulse 2s ease-in-out;
          position: relative;
        }
        
        .tour-highlight::after {
          content: '';
          position: absolute;
          top: -4px;
          left: -4px;
          right: -4px;
          bottom: -4px;
          border: 2px solid #3B82F6;
          border-radius: 8px;
          animation: tourGlow 2s ease-in-out;
          pointer-events: none;
        }
        
        @keyframes tourPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        
        @keyframes tourGlow {
          0%, 100% { opacity: 0; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </>
  );
}