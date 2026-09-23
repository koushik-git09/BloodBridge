import { apiRequest } from "./api";

export interface DonorRequest {
  id: string;
  request_id: string;
  donor_id: string;
  hospital_id: string;

  hospital_name?: string | null;
  hospital_address?: string | null;
  hospital_phone?: string | null;
  patient_reference?: string | null;

  blood_group: string;
  units_required?: number | null;
  urgency?: string | null;

  distance: number;
  match_score: number;
  trust_score: number;

  status: "PENDING" | "ACCEPTED" | "DECLINED" | "DONATED";

  created_at: string;
  responded_at?: string | null;
}


/**
 * Get blood requests assigned to the logged-in donor.
 */
export async function getDonorRequests(): Promise<DonorRequest[]> {
  return apiRequest<DonorRequest[]>("/api/donor-requests");
}

/**
 * Accept or decline a donor request.
 */
export async function respondToDonorRequest(
  donorRequestId: string,
  action: "ACCEPT" | "DECLINE",
): Promise<DonorRequest> {
  return apiRequest<DonorRequest>(
    `/api/donor-requests/${donorRequestId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        action,
      }),
    },
  );
}

/**
 * Get donation history for the logged-in donor.
 */
export async function getDonorDonationHistory() {
  return apiRequest<import("../types").DonationRecord[]>("/api/donations/me");
}

/**
 * Get donation statistics for the logged-in donor.
 */
export async function getDonorStatistics() {
  return apiRequest<import("../types").DonorStatistics>("/api/donors/me/statistics");
}