import { apiRequest } from "./api";
import type { BloodGroup, Urgency } from "../types";

export interface DonorMatchResponse {
  donor_id: string;
  donor_request_id?: string | null;
  name: string;
  blood_group: BloodGroup;
  availability: "AVAILABLE" | "BUSY" | "UNAVAILABLE";
  distance: number;
  match_score: number;
  trust_score: number;
  donation_count: number;
  last_donation?: string | null;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "DONATED";
  phone?: string | null;
  address?: string | null;
  responded_at?: string | null;
}

export interface BloodBankReservationSummaryResponse {
  id: string;
  blood_bank_id: string;
  blood_bank_name?: string | null;
  blood_bank_address?: string | null;
  blood_bank_phone?: string | null;
  blood_group: BloodGroup;
  units_requested: number;
  units_confirmed: number;
  status: string;
  distance: number;
}

export interface BloodRequestResponse {
  id: string;
  hospital_id: string;
  hospital_name?: string;
  hospital_address?: string;

  patient_reference: string;
  blood_group: BloodGroup;

  units_required: number;
  urgency: Urgency;

  status: string;

  blood_bank_units: number;
  donor_units: number;
  remaining_units: number;

  notes?: string;

  created_at: string;
  updated_at?: string;
  fulfilled_at?: string;
  donors?: DonorMatchResponse[];
  donor_matches?: DonorMatchResponse[];
  blood_banks?: BloodBankReservationSummaryResponse[];
}


export interface CreateBloodRequestData {
  patient_reference: string;
  blood_group: BloodGroup;
  units_required: number;
  urgency: Urgency;
  notes?: string;
}

export async function getHospitalRequests(): Promise<
  BloodRequestResponse[]
> {
  return apiRequest<BloodRequestResponse[]>("/api/requests");
}

export async function getBloodRequest(
  requestId: string,
): Promise<BloodRequestResponse> {
  return apiRequest<BloodRequestResponse>(
    `/api/requests/${requestId}`,
  );
}

export async function createBloodRequest(
  data: CreateBloodRequestData,
): Promise<BloodRequestResponse> {
  return apiRequest<BloodRequestResponse>("/api/requests", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function confirmDonorDonation(
  requestId: string,
  donorRequestId: string,
): Promise<BloodRequestResponse> {
  return apiRequest<BloodRequestResponse>(
    `/api/requests/${requestId}/donors/${donorRequestId}/confirm-donation`,
    { method: "PATCH" },
  );
}
