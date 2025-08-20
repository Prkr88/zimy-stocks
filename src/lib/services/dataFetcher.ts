// Client-side data fetching utilities

export async function fetchEarningsData(
  startDate?: string,
  endDate?: string,
  forceRefresh: boolean = false
) {
  try {
    const response = await fetch('/api/earnings/fetch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate,
        endDate,
        forceRefresh,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch earnings data');
    }

    return data;
  } catch (error) {
    console.error('Error fetching earnings data:', error);
    throw error;
  }
}

export async function getEarningsEvents(
  startDate?: string,
  endDate?: string,
  market?: string
) {
  try {
    const params = new URLSearchParams();
    
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (market) params.append('market', market);

    const response = await fetch(`/api/earnings/fetch?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to get earnings events');
    }

    return data.events;
  } catch (error) {
    console.error('Error getting earnings events:', error);
    throw error;
  }
}

// Utility to refresh earnings data on demand
export async function refreshEarningsData(
  days: number = 30
): Promise<{ success: boolean; message: string; eventsCount: number }> {
  const startDate = new Date().toISOString();
  const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  try {
    const result = await fetchEarningsData(startDate, endDate, true);
    
    return {
      success: true,
      message: result.message,
      eventsCount: result.events?.length || 0,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to refresh data',
      eventsCount: 0,
    };
  }
}