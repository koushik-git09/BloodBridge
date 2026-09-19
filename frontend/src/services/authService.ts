import { apiRequest } from './api';
import type { Role } from '../types';

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: Role;
  location: { latitude: number; longitude: number; address: string };
  bloodGroup?: string;
  hospitalName?: string;
}

interface LoginResponse {
  access_token?: string;
  accessToken?: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  [key: string]: unknown;
}

export async function login(email: string, password: string) {
  const response = await apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const token = response.access_token ?? response.accessToken;
  if (!token) throw new Error('Login response did not contain an access token');
  localStorage.setItem('accessToken', token);
  return token;
}

export function register(data: RegisterData) {
  return apiRequest<{ message: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getCurrentUser() {
  return apiRequest<CurrentUser>('/api/auth/me');
}

export function logout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('bloodbridge_user');
}

export function forgotPassword(email: string) {
  return apiRequest<{ message: string }>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token: string, newPassword: string) {
  return apiRequest<{ message: string }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, new_password: newPassword }),
  });
}