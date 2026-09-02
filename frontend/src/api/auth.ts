import { apiRequest } from './client';


export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}


export interface RegisterData {

  name: string;

  email: string;

  password: string;

  phone: string;

  role:
    | 'HOSPITAL'
    | 'BLOOD_BANK'
    | 'DONOR';

  location: LocationData;

  bloodGroup?: string;

  hospitalName?: string;
}


export interface LoginData {

  email: string;

  password: string;
}


interface LoginResponse {

  access_token: string;

  token_type: string;
}


export async function register(
  data: RegisterData
) {

  return apiRequest(
    '/api/auth/register',
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
}


export async function login(
  data: LoginData
): Promise<LoginResponse> {

  return apiRequest<LoginResponse>(
    '/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
}


export async function getCurrentUser() {

  return apiRequest(
    '/api/auth/me'
  );
}