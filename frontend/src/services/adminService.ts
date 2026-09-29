import { apiRequest } from './api';
import { getCurrentUser } from './authService';
import type { HospitalRegistration } from '../types';

interface LoginResponse {
  access_token?: string;
  accessToken?: string;
}

export async function adminLogin(email: string, password: string) {
  const response = await apiRequest<LoginResponse>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  const token = response.access_token ?? response.accessToken;
  if (!token) throw new Error('Login response did not contain an access token');

  localStorage.setItem('accessToken', token);

  const user = await getCurrentUser();
  localStorage.setItem('bloodbridge_user', JSON.stringify(user));

  return user;
}

export function getHospitalRegistrations(statusFilter?: string) {
  const query = statusFilter && statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
  return apiRequest<HospitalRegistration[]>(`/api/admin/hospital-registrations${query}`);
}

export function getHospitalRegistrationById(id: string) {
  return apiRequest<HospitalRegistration>(`/api/admin/hospital-registrations/${id}`);
}

export function approveHospital(id: string) {
  return apiRequest<{
    message: string;
    hospital_id: string;
    status: 'APPROVED';
    verified: boolean;
  }>(`/api/admin/hospital-registrations/${id}/approve`, {
    method: 'PATCH',
  });
}

export function rejectHospital(id: string) {
  return apiRequest<{
    message: string;
    hospital_id: string;
    status: 'REJECTED';
    verified: boolean;
  }>(`/api/admin/hospital-registrations/${id}/reject`, {
    method: 'PATCH',
  });
}
