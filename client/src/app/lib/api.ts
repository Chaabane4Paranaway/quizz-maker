'use client';

export async function apiCall<T>(
  path: string,
  options?: RequestInit
): Promise<{ data: T | null; error: string | null }> {
  try {
    const headers = new Headers(options?.headers || {});

    // Add admin token if available
    const adminToken = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    if (adminToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${adminToken}`);
    }

    const response = await fetch(path, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        data: null,
        error: data.error || `HTTP ${response.status}`,
      };
    }

    return {
      data,
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
