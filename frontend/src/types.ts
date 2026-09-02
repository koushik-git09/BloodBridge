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
export type Role = 'HOSPITAL' | 'BLOOD_BANK' | 'DONOR';
export type DonorAvailability = 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';
export type Page = 'landing' | 'role-select' | 'hospital' | 'blood-bank' | 'donor';

export interface BloodBank {
  id: string;
  name: string;
  distance: number;
  inventory: Record<BloodGroup, number>;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Donor {
  id: string;
  name: string;
  bloodGroup: BloodGroup;
  availability: DonorAvailability;
  distance: number;
  matchScore: number;
  responses: number;
  lastDonation: string;
  scores: {
    compatibility: number;
    eligibility: number;
    distance: number;
    availability: number;
    reliability: number;
  };
}

export interface TimelineEvent {
  event: string;
  time: string;
  completed: boolean;
  active?: boolean;
}

export interface BloodRequest {
  id: string;
  bloodGroup: BloodGroup;
  unitsRequired: number;
  urgency: Urgency;
  status: RequestStatus;
  hospital: string;
  createdAt: string;
  bloodBankUnits: number;
  donorUnits: number;
  timeline: TimelineEvent[];
  donors?: Donor[];
}

export interface Notification {
  id: string;
  type: 'CRITICAL' | 'URGENT' | 'INFO' | 'SUCCESS';
  title: string;
  message: string;
  time: string;
  read: boolean;
}
