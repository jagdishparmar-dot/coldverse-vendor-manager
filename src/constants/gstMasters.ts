/**
 * Category → default SAC + GST rate + UOM for service tax invoices.
 * Bill-To company/hub GSTINs are admin-managed in DB (CompanyProfile + Hub).
 */

export type CategoryGstPreset = {
  sac: string;
  defaultTaxRate: number;
  defaultUom: string;
  descriptionPresets: string[];
};

export const CATEGORY_GST_PRESETS: Record<string, CategoryGstPreset> = {
  Rent: {
    sac: "997212",
    defaultTaxRate: 18,
    defaultUom: "MON",
    descriptionPresets: [
      "Monthly Space Rent for Logistics Hub Operations",
      "Security Deposit for Cold Storage Room",
      "Maintenance & Facilities Usage Rent",
    ],
  },
  Manpower: {
    sac: "998513",
    defaultTaxRate: 18,
    defaultUom: "HRS",
    descriptionPresets: [
      "Skilled Warehouse Cargo Loader Services",
      "Technical Supervisor Hourly Fee",
      "Overtime Labor Allocation - Peak Hours",
    ],
  },
  "Vehicle rent": {
    sac: "996601",
    defaultTaxRate: 18,
    defaultUom: "TRP",
    descriptionPresets: [
      "Reefer Refrigerated Cargo Truck Rental Fee",
      "Local Transit Delivery Vehicle Lease",
      "Fuel & Distance Traveled Surcharges",
    ],
  },
  "Repairs & maintenance": {
    sac: "998717",
    defaultTaxRate: 18,
    defaultUom: "NOS",
    descriptionPresets: [
      "Cold Storage Compressors Scheduled Servicing",
      "Electrical Power Unit Calibration",
      "Forklift Maintenance & Spare Parts Replacement",
    ],
  },
  Electricity: {
    sac: "996331",
    defaultTaxRate: 18,
    defaultUom: "MON",
    descriptionPresets: [
      "Commercial Facility Main Power Bill Reimbursement",
      "Emergency Generator Diesel Fuel / Running Cost",
      "Utility Transmission Taxes & Local Levies",
    ],
  },
  Others: {
    sac: "999799",
    defaultTaxRate: 18,
    defaultUom: "NOS",
    descriptionPresets: [
      "SOP Training & Supplier Compliance Audit",
      "Administrative Supplies & Document Storage Fee",
    ],
  },
};

export function getCategoryGstPreset(category: string): CategoryGstPreset {
  return CATEGORY_GST_PRESETS[category] || CATEGORY_GST_PRESETS.Others;
}
