import * as XLSX from "xlsx";
import { Invoice, Vendor, Hub } from "../types";

/**
 * Exports a detailed list of invoices with vendor and hub info to a high-quality Excel file.
 */
export function exportInvoicesToExcel(
  invoices: Invoice[],
  vendors: Vendor[],
  hubs: Hub[],
  filename = "SMILe_Invoice_Details_Report.xlsx"
) {
  // Map hubs and vendors for quick lookup
  const vendorMap = new Map(vendors.map(v => [v.id, v]));
  const hubMap = new Map(hubs.map(h => [h.id, h]));

  const dataRows = invoices.map((inv, index) => {
    const vendor = vendorMap.get(inv.vendorId);
    const hub = inv.hubId ? hubMap.get(inv.hubId) : null;

    return {
      "S.No.": index + 1,
      "Invoice Number": inv.invoiceNumber || "N/A",
      "Invoice Date": inv.date || "N/A",
      "Vendor Name": inv.vendorName || vendor?.name || "N/A",
      "Vendor Email": vendor?.email || "N/A",
      "Vendor Phone": vendor?.phone || "N/A",
      "Vendor GSTIN": vendor?.gstNumber || "N/A",
      "Category": inv.category || "N/A",
      "Gross Amount (INR)": inv.amount || 0,
      "Status": inv.status || "Pending",
      "Remarks / Reject Reason": inv.remarks || "N/A",
      "Assigned Hub Code": hub?.code || "N/A",
      "Assigned Hub Name": inv.hubName || hub?.name || "N/A",
      "Hub State": inv.state || hub?.state || vendor?.state || "N/A",
      "Upload Timestamp": inv.uploadedAt ? new Date(inv.uploadedAt).toLocaleString("en-IN") : "N/A",
      "File Name": inv.fileName || "N/A"
    };
  });

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(dataRows);

  // Define column widths for auto-fit readability
  const colWidths = [
    { wch: 6 },   // S.No.
    { wch: 22 },  // Invoice Number
    { wch: 14 },  // Invoice Date
    { wch: 30 },  // Vendor Name
    { wch: 28 },  // Vendor Email
    { wch: 16 },  // Vendor Phone
    { wch: 18 },  // Vendor GSTIN
    { wch: 20 },  // Category
    { wch: 20 },  // Gross Amount (INR)
    { wch: 12 },  // Status
    { wch: 35 },  // Remarks / Reject Reason
    { wch: 18 },  // Assigned Hub Code
    { wch: 25 },  // Assigned Hub Name
    { wch: 15 },  // Hub State
    { wch: 22 },  // Upload Timestamp
    { wch: 32 }   // File Name
  ];
  worksheet["!cols"] = colWidths;

  // Create workbook and append worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Invoice Details");

  // Save/download the file
  XLSX.writeFile(workbook, filename);
}

/**
 * Exports a detailed list of Vendors with categories and hub details to an Excel file.
 */
export function exportVendorsToExcel(
  vendors: Vendor[],
  hubs: Hub[],
  filename = "SMILe_Vendors_Report.xlsx"
) {
  const hubMap = new Map(hubs.map(h => [h.id, h]));

  const dataRows = vendors.map((vendor, index) => {
    const vendorHubs = vendor.hubs
      ? vendor.hubs.map(hId => hubMap.get(hId)?.name || hId).join(", ")
      : "N/A";

    return {
      "S.No.": index + 1,
      "Vendor ID": vendor.id,
      "Vendor Name": vendor.name,
      "Email Address": vendor.email,
      "Phone Number": vendor.phone || "N/A",
      "GSTIN / Tax No": vendor.gstNumber || "N/A",
      "Status": vendor.status === "active" ? "Active" : "Inactive",
      "Categories": (vendor.categories || []).join(", "),
      "Assigned Hubs": vendorHubs || "N/A",
      "State": vendor.state || "N/A",
      "Secure Portal Token": vendor.token,
      "Created At": vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString("en-IN") : "N/A"
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(dataRows);

  const colWidths = [
    { wch: 6 },   // S.No.
    { wch: 12 },  // Vendor ID
    { wch: 30 },  // Vendor Name
    { wch: 28 },  // Email Address
    { wch: 16 },  // Phone Number
    { wch: 18 },  // GSTIN
    { wch: 12 },  // Status
    { wch: 30 },  // Categories
    { wch: 35 },  // Assigned Hubs
    { wch: 15 },  // State
    { wch: 25 },  // Secure Portal Token
    { wch: 14 }   // Created At
  ];
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Vendors List");

  XLSX.writeFile(workbook, filename);
}
