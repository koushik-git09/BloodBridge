export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type Urgency = 'NORMAL' | 'URGENT' | 'CRITICAL';
export type RequestStatus =
  | 'PENDING'
  | 'VERIFIED'
  | 'CHECKING_BLOOD_BANK'
  | 'PARTIAL_FULFILLMENT'
  | 'DONOR_MATCHING'
  | 'FULFILLED'
  | 'CONFIRMED';
export type DonorAvailability = 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';
export type DonorRequestStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'DONATED';
export type Page =
  | 'landing'
  | 'role-select'
  | 'login'
  | 'register'
  | 'hospital'
  | 'blood-bank'
  | 'donor';

export type Role =
  | 'HOSPITAL'
  | 'BLOOD_BANK'
  | 'DONOR';
export interface BloodBank {
  id: string;
  name: string;
  distance: number;
  inventory: Record<BloodGroup, number>;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Donor {
  id: string;
  donorRequestId?: string;
  status: DonorRequestStatus;
  name: string;
  bloodGroup: BloodGroup;
  availability: DonorAvailability;
  distance: number;
  address?: string;
  matchScore: number;
  responses: number;
  lastDonation: string;
  phone?: string | null;
  respondedAt?: string | null;
  scores: {
    compatibility: number;
    eligibility: number;
    distance: number;
    availability: number;
    reliability: number;
  };
}

export interface BloodBankReservationItem {
  id: string;
  bloodBankId: string;
  bloodBankName: string;
  bloodBankAddress?: string;
  bloodBankPhone?: string;
  bloodGroup: BloodGroup;
  unitsRequested: number;
  unitsConfirmed: number;
  status: string;
  distance: number;
}

export interface TimelineEvent {
  event: string;
  time: string;
  completed: boolean;
  active?: boolean;
}

export interface BloodRequest {
  id: string;
  patient_reference?: string;
  bloodGroup: BloodGroup;
  unitsRequired: number;
  urgency: Urgency;
  status: RequestStatus;
  hospital: string;
  hospitalAddress?: string;
  createdAt: string;
  updatedAt?: string;
  fulfilledAt?: string;
  bloodBankUnits: number;
  donorUnits: number;
  remainingUnits: number;
  timeline: TimelineEvent[];
  donors?: Donor[];
  bloodBanks?: BloodBankReservationItem[];
}


export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  time?: string;
  read: boolean;
  sent?: boolean;
  created_at?: string;
  data?: Record<string, any>;
}


export interface DonationRecord {
  id: string;
  donor_id: string;
  request_id: string;
  hospital_id: string;
  hospital_name?: string | null;
  blood_group: BloodGroup;
  units: number;
  donated_at: string;
  status: string;
}

export interface DonorStatistics {
  total_donations: number;
  total_units: number;
  last_donation: string | null;
  trust_score: number;
}

