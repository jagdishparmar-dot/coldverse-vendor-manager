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
}

export interface Hub {
  id: string;
  name: string;
  code: string;
  state: string;
  createdAt: string;
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
}

export interface VendorStats {
  vendorId: string;
  vendorName: string;
  invoiceCount: number;
  totalAmount: number;
  byCategory: Record<string, { count: number; total: number }>;
}
