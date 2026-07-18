import { prisma } from "@/lib/db";
import { vendorToApi } from "@/lib/mappers";
import { generateToken, ServiceError } from "@/lib/services/utils";

export async function listActiveVendors() {
  const vendors = await prisma.vendor.findMany({
    where: { archived: false },
    orderBy: { createdAt: "desc" },
  });
  return vendors.map(vendorToApi);
}

export async function createVendor(body: {
  name?: string;
  email?: string;
  phone?: string;
  categories?: string[];
  status?: string;
  gstNumber?: string;
  state?: string;
  states?: string[];
  hubs?: string[];
}) {
  const { name, email, phone, categories, status, gstNumber, state, states, hubs } = body;

  if (!name || !phone) {
    throw new ServiceError(400, "Vendor Name and Phone are required.");
  }

  const finalStates = Array.isArray(states) ? states : state ? [state] : [];
  const finalState = finalStates.join(", ");

  const vendor = await prisma.vendor.create({
    data: {
      id: `v-${Date.now()}`,
      name,
      email: email || "",
      phone: phone || "",
      token: generateToken(name),
      status: status || "active",
      categories: Array.isArray(categories) && categories.length > 0 ? categories : ["Others"],
      gstNumber: gstNumber || "",
      state: finalState,
      states: finalStates,
      hubIds: Array.isArray(hubs) ? hubs : [],
      kycStatus: "pending_submission",
    },
  });

  return vendorToApi(vendor);
}

export async function bulkCreateVendors(vendorsList: unknown[]) {
  if (!Array.isArray(vendorsList)) {
    throw new ServiceError(400, "Invalid data format. Expected list of vendors.");
  }

  const added = [];

  for (let index = 0; index < vendorsList.length; index++) {
    const v = vendorsList[index] as Record<string, unknown>;
    const name = v.name || v.VendorName || v["Vendor Name"];
    const email = v.email || v.Email || v["Email Address"];
    const phone = v.phone || v.Phone || v["Phone Number"] || "";
    const gstNumber = v.gstNumber || v.GST || v.gst || v["GST Number"] || "";
    const state = v.state || v.State || "";
    let statesVal = v.states || v.States || [];

    if (typeof statesVal === "string") {
      statesVal = statesVal.split(",").map((s: string) => s.trim()).filter((s: string) => s.length > 0);
    }
    if (!Array.isArray(statesVal)) {
      statesVal = state ? [String(state)] : [];
    }

    let hubsVal = v.hubs || v.Hubs || v.hub || [];
    if (typeof hubsVal === "string") {
      hubsVal = hubsVal.split(",").map((h: string) => h.trim()).filter((h: string) => h.length > 0);
    }
    if (!Array.isArray(hubsVal)) {
      hubsVal = [];
    }

    let cats = v.categories || v.Categories || v["Category"] || ["Others"];
    if (typeof cats === "string") {
      cats = cats.split(",").map((c: string) => c.trim()).filter((c: string) => c.length > 0);
    }
    if (!Array.isArray(cats) || cats.length === 0) {
      cats = ["Others"];
    }

    if (name && phone) {
      const vendor = await prisma.vendor.create({
        data: {
          id: `v-${Date.now()}-${index}`,
          name: String(name).trim(),
          email: String(email ?? "").trim(),
          phone: String(phone).trim(),
          token: generateToken(String(name).trim()),
          status: "active",
          categories: cats as string[],
          gstNumber: String(gstNumber).trim(),
          state: (statesVal as string[]).join(", "),
          states: statesVal as string[],
          hubIds: hubsVal as string[],
          kycStatus: "pending_submission",
        },
      });
      added.push(vendorToApi(vendor));
    }
  }

  return {
    message: `Successfully uploaded ${added.length} vendors`,
    vendors: added,
  };
}

export async function updateVendor(
  id: string,
  body: {
    name?: string;
    email?: string;
    phone?: string;
    categories?: string[];
    gstNumber?: string;
    state?: string;
    states?: string[];
    hubs?: string[];
  }
) {
  const { name, email, phone, categories, gstNumber, state, states, hubs } = body;

  if (!name || !phone) {
    throw new ServiceError(400, "Vendor Name and Phone are required.");
  }

  const existing = await prisma.vendor.findUnique({ where: { id } });
  if (!existing) {
    throw new ServiceError(404, "Vendor not found.");
  }

  const finalStates = Array.isArray(states) ? states : state ? [state] : [];

  const vendor = await prisma.vendor.update({
    where: { id },
    data: {
      name: name.trim(),
      email: email?.trim() ?? "",
      phone: phone.trim(),
      categories: Array.isArray(categories) ? categories : [],
      gstNumber: gstNumber ? gstNumber.trim().toUpperCase() : "",
      state: finalStates.join(", "),
      states: finalStates,
      hubIds: Array.isArray(hubs) ? hubs : [],
    },
  });

  return vendorToApi(vendor);
}

export async function archiveVendor(id: string, remarks?: string) {
  const existing = await prisma.vendor.findUnique({ where: { id } });
  if (!existing) {
    throw new ServiceError(404, "Vendor not found.");
  }

  const vendor = await prisma.vendor.update({
    where: { id },
    data: {
      archived: true,
      deletionRemarks: remarks || "No remarks provided",
      archivedAt: new Date(),
    },
  });

  return {
    message: "Vendor archived successfully.",
    vendor: vendorToApi(vendor),
  };
}

export async function findVendorByToken(token: string) {
  return prisma.vendor.findFirst({
    where: { token, archived: false },
  });
}

export async function findVendorById(id: string) {
  return prisma.vendor.findUnique({ where: { id } });
}
