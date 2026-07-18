export interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  token: string; // shareable token
  status: 'active' | 'inactive';
  categories: string[]; // e.g. ["Rent", "Manpower", "Vehicle Rent", "Repairs & Maintenance", "Electricity", "Others"]
  createdAt: string;
  archived?: boolean;
  deletionRemarks?: string;
  archivedAt?: string;
  gstNumber?: string;
  state?: string;
  states?: string[];
  hubs?: string[]; // assigned hub ids
  kycStatus?: 'pending_submission' | 'pending_verification' | 'verified' | 'rejected';
  kycDetails?: KYCDetails;
}

export interface KYCDetails {
  panNumber: string;
  companyType: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  beneficiaryName: string;
  address: string;
  kycDocName?: string;
  kycDocType?: string;
  kycDocPath?: string;
  panDocName?: string;
  panDocType?: string;
  panDocPath?: string;
  gstDocName?: string;
  gstDocType?: string;
  gstDocPath?: string;
  msmeDocName?: string;
  msmeDocType?: string;
  msmeDocPath?: string;
  otherDocName?: string;
  otherDocType?: string;
  otherDocPath?: string;
  submittedAt?: string;
  verifiedAt?: string;
  remarks?: string;
}

export interface Hub {
  id: string;
  name: string;
  code: string;
  state: string;
  stateCode?: string;
  address?: string;
  city?: string;
  pincode?: string;
  gstin?: string;
  billingAddress?: string;
  createdAt: string;
  updatedAt?: string;
}

/** Buyer / company master used on tax invoices (Bill To). */
export interface CompanyProfile {
  id: string;
  legalName: string;
  tradeName?: string;
  pan?: string;
  email?: string;
  phone?: string;
  registeredAddress: string;
  registeredState: string;
  registeredStateCode?: string;
  registeredGstin: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  vendorId: string;
  vendorName: string;
  category: string;
  invoiceNumber: string;
  amount: number;
  date: string;
  fileName: string;
  fileType: string;
  filePath: string; // S3 object key
  uploadedAt: string;
  status: 'Pending' | 'Paid' | 'Hold' | 'Rejected';
  remarks?: string;
  archived?: boolean;
  deletionRemarks?: string;
  archivedAt?: string;
  state?: string;
  hubId?: string;
  hubName?: string;
  hardCopySubmittedTo?: string;
  hardCopySubmissionDate?: string;
}

export interface VendorStats {
  vendorId: string;
  vendorName: string;
  invoiceCount: number;
  totalAmount: number;
  byCategory: Record<string, { count: number; total: number }>;
}
