import "dotenv/config";
import { randomUUID } from "crypto";
import { hashPassword } from "better-auth/crypto";
import { auth } from "../lib/auth";
import { prisma } from "../lib/db";
import { buildInvoiceKey, uploadInvoiceFile } from "../lib/storage/s3";

const defaultCategories = [
  "Rent",
  "Manpower",
  "Vehicle rent",
  "Repairs & maintenance",
  "Electricity",
  "Others",
];

const defaultVendors = [
  {
    id: "v-1",
    name: "Aman Logistics & Vehicle Rent",
    email: "aman.logistics@gmail.com",
    phone: "+91 98765 43210",
    token: "aman-logistics-xyz789",
    status: "active",
    categories: ["Vehicle rent", "Repairs & maintenance"],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
  {
    id: "v-2",
    name: "Techno Manpower Solutions",
    email: "billing@technomanpower.in",
    phone: "+91 88877 66554",
    token: "techno-manpower-abc123",
    status: "active",
    categories: ["Manpower"],
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
  },
  {
    id: "v-3",
    name: "Metro Space Realty",
    email: "accounts@metrorealestate.com",
    phone: "+91 77766 55443",
    token: "metro-space-def456",
    status: "active",
    categories: ["Rent"],
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
  },
  {
    id: "v-4",
    name: "State Power Grid Corp",
    email: "electricity@stategrid.org",
    phone: "+91 99911 22334",
    token: "state-grid-el8899",
    status: "active",
    categories: ["Electricity"],
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
  },
];

const defaultHubs = [
  {
    id: "hub-1",
    name: "Ahmedabad Main Hub",
    code: "AMD-01",
    state: "Gujarat",
    stateCode: "24",
    address: "SG Highway Logistics Park",
    city: "Ahmedabad",
    pincode: "380051",
    gstin: "24AABCC0000A1Z5",
    createdAt: new Date(),
  },
  {
    id: "hub-2",
    name: "Mumbai Distribution Center",
    code: "BOM-02",
    state: "Maharashtra",
    stateCode: "27",
    address: "Bhiwandi Warehousing Zone",
    city: "Mumbai",
    pincode: "400001",
    gstin: "27AABCC0000A1Z2",
    createdAt: new Date(),
  },
  {
    id: "hub-3",
    name: "Delhi Cargo Terminal",
    code: "DEL-03",
    state: "Delhi",
    stateCode: "07",
    address: "Okhla Industrial Area",
    city: "New Delhi",
    pincode: "110020",
    gstin: "07AABCC0000A1Z5",
    createdAt: new Date(),
  },
  {
    id: "hub-4",
    name: "Bengaluru Logistics Hub",
    code: "BLR-04",
    state: "Karnataka",
    stateCode: "29",
    address: "Whitefield Industrial Estate",
    city: "Bengaluru",
    pincode: "560066",
    gstin: "29AABCC0000A1Z0",
    createdAt: new Date(),
  },
];

const seedInvoices = [
  {
    id: "inv-101",
    vendorId: "v-3",
    vendorName: "Metro Space Realty",
    category: "Rent",
    invoiceNumber: "MSR/2026/06-01",
    amount: 145000,
    date: "2026-06-01",
    fileName: "metro_june_rent.txt",
    fileType: "text/plain",
    content: "INVOICE: Metro Space Realty - June 2026 Rent - Amount: 1,45,000 INR",
    uploadedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    status: "Paid",
    remarks: "Rent approved by Finance",
  },
  {
    id: "inv-102",
    vendorId: "v-2",
    vendorName: "Techno Manpower Solutions",
    category: "Manpower",
    invoiceNumber: "TMS/MAN/889",
    amount: 320000,
    date: "2026-06-05",
    fileName: "techno_manpower_june.txt",
    fileType: "text/plain",
    content: "INVOICE: Techno Manpower - 40 Operators - Amount: 3,20,000 INR",
    uploadedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    status: "Pending",
    remarks: "",
  },
  {
    id: "inv-103",
    vendorId: "v-1",
    vendorName: "Aman Logistics & Vehicle Rent",
    category: "Vehicle rent",
    invoiceNumber: "AL/TRUCK/401",
    amount: 85000,
    date: "2026-06-10",
    fileName: "aman_trucks_june.txt",
    fileType: "text/plain",
    content: "INVOICE: Aman Logistics - Truck Hiring June - Amount: 85,000 INR",
    uploadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    status: "Hold",
    remarks: "Vehicle log sheet not attached",
  },
  {
    id: "inv-104",
    vendorId: "v-4",
    vendorName: "State Power Grid Corp",
    category: "Electricity",
    invoiceNumber: "ELEC/GRID/1109",
    amount: 42300,
    date: "2026-06-12",
    fileName: "power_bill_june.txt",
    fileType: "text/plain",
    content: "INVOICE: State Power - June Electricity Consumption - Amount: 42,300 INR",
    uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    status: "Rejected",
    remarks: "Previous month penalty added, please revise bill",
  },
];

async function seedAdminUser() {
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log("Admin user already exists, skipping admin seed.");
    return;
  }

  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || "Admin";

  if (!email || !password) {
    console.warn(
      "SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD not set; skipping admin seed."
    );
    return;
  }

  try {
    const result = await auth.api.signUpEmail({
      body: { email, password, name },
    });

    if (result?.user?.id) {
      await prisma.user.update({
        where: { id: result.user.id },
        data: { role: "admin", emailVerified: true },
      });
      console.log(`Seeded admin user: ${email}`);
      return;
    }
  } catch {
    // Fall through to manual insert when public sign-up is disabled.
  }

  const userId = randomUUID();
  const hashedPassword = await hashPassword(password);
  const now = new Date();

  await prisma.user.create({
    data: {
      id: userId,
      name,
      email,
      emailVerified: true,
      role: "admin",
      createdAt: now,
      updatedAt: now,
    },
  });

  await prisma.account.create({
    data: {
      id: randomUUID(),
      accountId: email,
      providerId: "credential",
      userId,
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    },
  });

  console.log(`Seeded admin user: ${email}`);
}

async function main() {
  await prisma.portalOtp.deleteMany();
  await prisma.portalSession.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.hub.deleteMany();
  await prisma.category.deleteMany();
  await prisma.companyProfile.deleteMany();

  await prisma.companyProfile.create({
    data: {
      id: "default",
      legalName: "Shree Maruti Integrated Logistics Limited",
      tradeName: "Shree Maruti",
      pan: "AABCC0000A",
      email: "accounts@shreemaruti.com",
      phone: "+91 79 0000 0000",
      registeredAddress: "Corporate Billing & Logistics Compliance Desk, SG Highway",
      registeredState: "Gujarat",
      registeredStateCode: "24",
      registeredGstin: "24AABCC0000A1Z5",
    },
  });

  for (const name of defaultCategories) {
    await prisma.category.create({ data: { name } });
  }

  for (const hub of defaultHubs) {
    await prisma.hub.create({ data: hub });
  }

  for (const vendor of defaultVendors) {
    await prisma.vendor.create({
      data: {
        ...vendor,
        states: [],
        hubIds: [],
        kycStatus: "verified",
        kycDetails: {
          panNumber: "AAAPL1234C",
          companyType: "Private Limited Company (Pvt Ltd)",
          bankName: "HDFC Bank",
          accountNumber: "50100123456789",
          ifscCode: "HDFC0001234",
          beneficiaryName: vendor.name,
          address: "Registered Office, Sector-IV, Industrial Area",
          submittedAt: new Date().toISOString(),
          verifiedAt: new Date().toISOString(),
          remarks: "",
        },
      },
    });
  }

  for (const invoice of seedInvoices) {
    const storageKey = buildInvoiceKey(invoice.vendorId, invoice.fileName);
    await uploadInvoiceFile(
      storageKey,
      Buffer.from(invoice.content, "utf-8"),
      invoice.fileType
    );

    await prisma.invoice.create({
      data: {
        id: invoice.id,
        vendorId: invoice.vendorId,
        vendorName: invoice.vendorName,
        category: invoice.category,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        date: invoice.date,
        fileName: invoice.fileName,
        fileType: invoice.fileType,
        filePath: storageKey,
        uploadedAt: invoice.uploadedAt,
        status: invoice.status,
        remarks: invoice.remarks,
      },
    });
  }

  console.log("Database seeded successfully.");
  await seedAdminUser();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
