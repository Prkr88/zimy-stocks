import { NextResponse } from 'next/server';

interface CacheMetadata {
  lastModified?: string;
  etag?: string;
  maxAge?: number;
  cacheControl?: string;
}

interface CacheAwareResponseData {
  success: boolean;
  data?: any;
  error?: string;
  cache?: {
    lastModified: string;
    etag: string;
    maxAge: number;
    timestamp: string;
  };
}

/**
 * Create a cache-aware API response with proper headers
 */
export function createCacheAwareResponse(
  data: any,
  metadata: CacheMetadata = {},
  options: { flattenResponse?: boolean } = {}
): NextResponse {
  const now = new Date();
  const etag = metadata.etag || generateETag(data);
  const lastModified = metadata.lastModified || now.toISOString();
  const maxAge = metadata.maxAge || 300; // 5 minutes default

  // For backward compatibility, flatten the response by default
  const responseData = options.flattenResponse !== false ? {
    ...data,
    _cache: {
      lastModified,
      etag,
      maxAge,
      timestamp: now.toISOString()
    }
  } : {
    success: true,
    data,
    cache: {
      lastModified,
      etag,
      maxAge,
      timestamp: now.toISOString()
    }
  };

  const response = NextResponse.json(responseData);

  // Set cache headers
  response.headers.set('Last-Modified', new Date(lastModified).toUTCString());
  response.headers.set('ETag', etag);
  response.headers.set('Cache-Control', `max-age=${maxAge}, must-revalidate`);
  
  // Custom headers for client-side cache management
  response.headers.set('X-Cache-Last-Modified', lastModified);
  response.headers.set('X-Cache-Max-Age', maxAge.toString());

  return response;
}

/**
 * Generate ETag from data
 */
function generateETag(data: any): string {
  const content = JSON.stringify(data);
  let hash = 0;
  
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return `"${Math.abs(hash).toString(36)}"`;
}

/**
 * Check if client has fresh data based on conditional headers
 */
export function checkIfModifiedSince(
  request: Request,
  lastModified: string
): boolean {
  const ifModifiedSince = request.headers.get('If-Modified-Since');
  
  if (!ifModifiedSince) {
    return true; // No conditional header, assume modified
  }

  const clientDate = new Date(ifModifiedSince);
  const serverDate = new Date(lastModified);
  
  return serverDate > clientDate;
}

/**
 * Check ETag for conditional requests
 */
export function checkETag(
  request: Request,
  currentETag: string
): boolean {
  const ifNoneMatch = request.headers.get('If-None-Match');
  
  if (!ifNoneMatch) {
    return true; // No ETag header, assume modified
  }

  return ifNoneMatch !== currentETag;
}

/**
 * Create 304 Not Modified response
 */
export function createNotModifiedResponse(): NextResponse {
  return new NextResponse(null, {
    status: 304,
    statusText: 'Not Modified'
  });
}

/**
 * Middleware wrapper for cache-aware endpoints
 */
export function withCacheAware(
  handler: (request: Request) => Promise<NextResponse>,
  getCacheKey: (request: Request) => string,
  getLastModified: (request: Request) => Promise<string>
) {
  return async (request: Request): Promise<NextResponse> => {
    try {
      const lastModified = await getLastModified(request);
      const etag = generateETag(getCacheKey(request) + lastModified);

      // Check conditional headers
      const isModified = checkIfModifiedSince(request, lastModified);
      const etagMatches = !checkETag(request, etag);

      if (!isModified || etagMatches) {
        return createNotModifiedResponse();
      }

      // Process the request normally
      const response = await handler(request);
      
      // Add cache headers to successful responses
      if (response.status === 200) {
        response.headers.set('Last-Modified', new Date(lastModified).toUTCString());
        response.headers.set('ETag', etag);
        response.headers.set('Cache-Control', 'max-age=300, must-revalidate');
      }

      return response;
    } catch (error) {
      console.error('Cache-aware middleware error:', error);
      // Fall back to normal processing
      return handler(request);
    }
  };
}

/**
 * Extract cache metadata from Firestore documents
 */
export function extractFirestoreCacheMetadata(docs: any[]): CacheMetadata {
  if (docs.length === 0) {
    return {};
  }

  // Find the most recent update
  const latestUpdate = docs.reduce((latest, doc) => {
    const docUpdate = doc.data()?.updatedAt || doc.data()?.updated_at;
    if (!docUpdate) return latest;
    
    const docDate = docUpdate.toDate ? docUpdate.toDate() : new Date(docUpdate);
    const latestDate = latest ? new Date(latest) : new Date(0);
    
    return docDate > latestDate ? docDate.toISOString() : latest;
  }, null);

  return {
    lastModified: latestUpdate || new Date().toISOString(),
    maxAge: 300 // 5 minutes default
  };
}