import { apiRequest } from "./api";
import type { BloodGroup, Urgency } from "../types";

export interface BloodRequestResponse {
  id: string;
  hospital_id: string;
  hospital_name?: string;

  patient_reference: string;
  blood_group: BloodGroup;

  units_required: number;
  urgency: Urgency;

  status: string;

  blood_bank_units: number;
  donor_units: number;
  remaining_units?: number;

  notes?: string;

  created_at: string;
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