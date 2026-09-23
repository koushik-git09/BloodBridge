import { apiRequest } from "./api";
import type { BloodGroup } from "../types";

export interface BloodBankInventoryResponse {
  blood_bank_id: string;
  name: string;
  inventory: Record<BloodGroup, number>;
  last_inventory_update?: string | null;
  status: "ACTIVE" | "INACTIVE";
}

export interface BloodBankReservationResponse {
  id: string;
  request_id: string;
  blood_bank_id: string;
  hospital_id: string;
  hospital_name?: string | null;
  hospital_address?: string | null;
  blood_bank_name?: string | null;
  blood_bank_address?: string | null;
  urgency?: string | null;
  blood_group: BloodGroup;
  units_requested: number;
  units_confirmed: number;
  status: "PENDING" | "CONFIRMED" | "PARTIAL" | "REJECTED";
  distance: number;
  created_at: string;
  responded_at?: string | null;
}


export type ReservationAction =
  | "CONFIRM"
  | "PARTIAL"
  | "REJECT";

export interface ReservationResponseData {
  action: ReservationAction;
  units_confirmed: number;
}

/**
 * Get the currently logged-in blood bank's inventory.
 */
export async function getBloodBankInventory(): Promise<BloodBankInventoryResponse> {
  return apiRequest<BloodBankInventoryResponse>(
    "/api/blood-banks/me/inventory",
  );
}

/**
 * Update the currently logged-in blood bank's inventory.
 */
export async function updateBloodBankInventory(
  inventory: Record<BloodGroup, number>,
): Promise<BloodBankInventoryResponse> {
  return apiRequest<BloodBankInventoryResponse>(
    "/api/blood-banks/me/inventory",
    {
      method: "PUT",
      body: JSON.stringify({
        inventory,
      }),
    },
  );
}

/**
 * Get reservation requests sent to the
 * currently logged-in blood bank.
 */
export async function getBloodBankReservations(): Promise<
  BloodBankReservationResponse[]
> {
  return apiRequest<BloodBankReservationResponse[]>(
    "/api/blood-bank/reservations",
  );
}

/**
 * Respond to a hospital blood reservation.
 *
 * CONFIRM:
 * units_confirmed must equal units_requested.
 *
 * PARTIAL:
 * units_confirmed must be greater than 0
 * and less than units_requested.
 *
 * REJECT:
 * units_confirmed must be 0.
 */
export async function respondToReservation(
  reservationId: string,
  action: ReservationAction,
  unitsConfirmed: number,
): Promise<BloodBankReservationResponse> {
  return apiRequest<BloodBankReservationResponse>(
    `/api/blood-bank/reservations/${reservationId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        action,
        units_confirmed: unitsConfirmed,
      }),
    },
  );
}