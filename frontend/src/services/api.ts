export const API_BASE_URL = 'http://localhost:8000';

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('accessToken');
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
  const data = (await response.json()) as T & { detail?: string };
  if (!response.ok) throw new Error(data.detail || 'Something went wrong');
  return data;
}