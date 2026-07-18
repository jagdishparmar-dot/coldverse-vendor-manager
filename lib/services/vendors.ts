import { prisma } from "@/lib/db";
import { vendorToApi } from "@/lib/mappers";
import { notifyVendorRegistered } from "@/lib/services/notifications";
import { generateToken, ServiceError } from "@/lib/services/utils";
import { newSecureId } from "@/lib/auth-guards";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  paginatedEnvelope,
  type PaginatedResult,
} from "@/lib/pagination";
import type { Prisma } from "@/src/generated/prisma/client";
import type { Vendor } from "@/src/types";

export type ListVendorsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  hubId?: string;
  kycStatus?: string;
  /** Include archived vendors (default false → active only) */
  archived?: boolean;
};

function buildVendorWhere(query: ListVendorsQuery): Prisma.VendorWhereInput {
  const where: Prisma.VendorWhereInput = {
    archived: query.archived === true ? true : false,
  };

  if (query.kycStatus && query.kycStatus !== "All") {
    where.kycStatus = query.kycStatus;
  }

  if (query.hubId && query.hubId !== "All") {
    where.hubIds = { has: query.hubId };
  }

  const search = query.search?.trim();
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { gstNumber: { contains: search, mode: "insensitive" } },
    ];
  }

  return where;
}

/** Full active list — portal / internal callers */
export async function listActiveVendors() {
  const vendors = await prisma.vendor.findMany({
    where: { archived: false },
    orderBy: { createdAt: "desc" },
  });
  return vendors.map(vendorToApi);
}

/** Paginated list for admin console */
export async function listVendorsPaginated(
  query: ListVendorsQuery = {}
): Promise<PaginatedResult<Vendor> & { kycCounts?: Record<string, number> }> {
  const page = query.page && query.page > 0 ? query.page : DEFAULT_PAGE;
  const limit =
    query.limit && query.limit > 0
      ? Math.min(100, query.limit)
      : DEFAULT_PAGE_SIZE;
  const skip = (page - 1) * limit;
  const where = buildVendorWhere(query);

  const [rows, total, kycGroups] = await Promise.all([
    prisma.vendor.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.vendor.count({ where }),
    prisma.vendor.groupBy({
      by: ["kycStatus"],
      where: { archived: false },
      _count: { _all: true },
    }),
  ]);

  const kycCounts: Record<string, number> = { All: 0 };
  for (const g of kycGroups) {
    kycCounts[g.kycStatus] = g._count._all;
    kycCounts.All += g._count._all;
  }

  return {
    ...paginatedEnvelope(rows.map(vendorToApi), total, page, limit),
    kycCounts,
  };
}

/** Lightweight options for filters (id + name only) */
export async function listVendorOptions(limit = 500) {
  const vendors = await prisma.vendor.findMany({
    where: { archived: false },
    orderBy: { name: "asc" },
    take: Math.min(1000, limit),
    select: { id: true, name: true },
  });
  return vendors;
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
      id: newSecureId("v"),
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

  void notifyVendorRegistered({
    name: vendor.name,
    email: vendor.email,
    token: vendor.token,
  });

  return vendorToApi(vendor);
}

function splitCsvMulti(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[;|,]/)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [];
}

export async function bulkCreateVendors(vendorsList: unknown[]) {
  if (!Array.isArray(vendorsList)) {
    throw new ServiceError(400, "Invalid data format. Expected list of vendors.");
  }

  const hubs = await prisma.hub.findMany({
    select: { id: true, code: true },
  });
  const hubIdSet = new Set(hubs.map((hub) => hub.id));
  const hubCodeToId = new Map(
    hubs.map((hub) => [hub.code.trim().toLowerCase(), hub.id])
  );

  const resolveHubIds = (raw: string[]): string[] => {
    const resolved: string[] = [];
    for (const entry of raw) {
      const trimmed = entry.trim();
      if (!trimmed) continue;
      if (hubIdSet.has(trimmed)) {
        resolved.push(trimmed);
        continue;
      }
      const byCode = hubCodeToId.get(trimmed.toLowerCase());
      if (byCode) {
        resolved.push(byCode);
      }
    }
    return Array.from(new Set(resolved));
  };

  const added = [];

  for (let index = 0; index < vendorsList.length; index++) {
    const v = vendorsList[index] as Record<string, unknown>;
    const name = v.name || v.VendorName || v["Vendor Name"];
    const email = v.email || v.Email || v["Email Address"];
    const phone = v.phone || v.Phone || v["Phone Number"] || "";
    const gstRaw = v.gstNumber || v.GST || v.gst || v["GST Number"] || "";
    const gstNumber = String(gstRaw).trim().toUpperCase();
    const state = v.state || v.State || "";

    let statesVal = splitCsvMulti(v.states ?? v.States);
    if (statesVal.length === 0 && state) {
      statesVal = splitCsvMulti(state);
    }

    const hubsRaw = splitCsvMulti(
      v.hubs ?? v.Hubs ?? v.hub ?? v.hubCodes ?? v["Hub Codes"] ?? v["Hub Code"]
    );
    const hubIds = resolveHubIds(hubsRaw);

    let cats = splitCsvMulti(v.categories ?? v.Categories ?? v.Category);
    if (cats.length === 0) {
      cats = ["Others"];
    }

    if (name && phone) {
      const vendor = await prisma.vendor.create({
        data: {
          id: newSecureId("v"),
          name: String(name).trim(),
          email: String(email ?? "").trim(),
          phone: String(phone).trim(),
          token: generateToken(String(name).trim()),
          status: "active",
          categories: cats,
          gstNumber: gstNumber || null,
          state: statesVal.join(", "),
          states: statesVal,
          hubIds,
          kycStatus: "pending_submission",
        },
      });
      const apiVendor = vendorToApi(vendor);
      added.push(apiVendor);
      void notifyVendorRegistered({
        name: vendor.name,
        email: vendor.email,
        token: vendor.token,
      });
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
