import { prisma } from "@/lib/db";
import { hubToApi } from "@/lib/mappers";
import { ServiceError } from "@/lib/services/utils";
import { newSecureId } from "@/lib/auth-guards";
import {
  getStateCodeFromGstin,
  getStateCodeFromName,
  isValidGstin,
  normalizeGstin,
} from "@/src/utils/gst";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  paginatedEnvelope,
} from "@/lib/pagination";
import type { Prisma } from "@/src/generated/prisma/client";

export type HubInput = {
  name?: string;
  code?: string;
  state?: string;
  address?: string;
  city?: string;
  pincode?: string;
  gstin?: string;
  billingAddress?: string;
};

function normalizeHubGstFields(body: HubInput) {
  const state = body.state?.trim() || "";
  const stateCode = getStateCodeFromName(state) || "";
  const gstinRaw = body.gstin?.trim();
  const gstin = gstinRaw ? normalizeGstin(gstinRaw) : "";

  if (gstin) {
    if (!isValidGstin(gstin)) {
      throw new ServiceError(400, "Hub GSTIN is invalid. Enter a valid 15-character GSTIN.");
    }
    const gstinState = getStateCodeFromGstin(gstin);
    if (stateCode && gstinState && gstinState !== stateCode) {
      throw new ServiceError(
        400,
        `Hub GSTIN state code (${gstinState}) does not match hub state (${state} / ${stateCode}).`
      );
    }
  }

  const pincode = body.pincode?.trim() || "";
  if (pincode && !/^\d{6}$/.test(pincode)) {
    throw new ServiceError(400, "Pincode must be a 6-digit Indian postal code.");
  }

  return {
    state,
    stateCode: stateCode || getStateCodeFromGstin(gstin) || "",
    address: body.address?.trim() || "",
    city: body.city?.trim() || "",
    pincode,
    gstin: gstin || null,
    billingAddress: body.billingAddress?.trim() || null,
  };
}

export async function listHubs() {
  const hubs = await prisma.hub.findMany({ orderBy: { createdAt: "desc" } });
  return hubs.map(hubToApi);
}

export type ListHubsQuery = {
  page?: number;
  limit?: number;
  search?: string;
};

export async function listHubsPaginated(query: ListHubsQuery = {}) {
  const page = query.page && query.page > 0 ? query.page : DEFAULT_PAGE;
  const limit =
    query.limit && query.limit > 0
      ? Math.min(100, query.limit)
      : DEFAULT_PAGE_SIZE;
  const skip = (page - 1) * limit;

  const where: Prisma.HubWhereInput = {};
  const search = query.search?.trim();
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
      { state: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
      { gstin: { contains: search, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.hub.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.hub.count({ where }),
  ]);

  return paginatedEnvelope(rows.map(hubToApi), total, page, limit);
}

/** Compact hub options for header / form selects */
export async function listHubOptions(limit = 500) {
  return prisma.hub.findMany({
    orderBy: { name: "asc" },
    take: Math.min(1000, limit),
    select: { id: true, name: true, code: true, state: true },
  });
}

export async function createHub(body: HubInput) {
  const { name, code } = body;

  if (!name || !code || !body.state) {
    throw new ServiceError(400, "Hub Name, Code, and State are required.");
  }

  const cleanCode = code.trim().toUpperCase();
  const existing = await prisma.hub.findUnique({ where: { code: cleanCode } });
  if (existing) {
    throw new ServiceError(400, `Hub with code "${cleanCode}" already exists.`);
  }

  const gstFields = normalizeHubGstFields(body);

  const hub = await prisma.hub.create({
    data: {
      id: newSecureId("hub"),
      name: name.trim(),
      code: cleanCode,
      ...gstFields,
    },
  });

  return hubToApi(hub);
}

export async function updateHub(id: string, body: HubInput) {
  const existing = await prisma.hub.findUnique({ where: { id } });
  if (!existing) {
    throw new ServiceError(404, "Hub not found.");
  }

  if (!body.name?.trim() || !body.state?.trim()) {
    throw new ServiceError(400, "Hub Name and State are required.");
  }

  let cleanCode = existing.code;
  if (body.code?.trim()) {
    cleanCode = body.code.trim().toUpperCase();
    if (cleanCode !== existing.code) {
      const duplicate = await prisma.hub.findUnique({ where: { code: cleanCode } });
      if (duplicate) {
        throw new ServiceError(400, `Hub with code "${cleanCode}" already exists.`);
      }
    }
  }

  const gstFields = normalizeHubGstFields({
    ...body,
    state: body.state,
  });

  const hub = await prisma.hub.update({
    where: { id },
    data: {
      name: body.name.trim(),
      code: cleanCode,
      ...gstFields,
    },
  });

  return {
    message: "Hub updated successfully.",
    hub: hubToApi(hub),
  };
}

export async function bulkCreateHubs(hubsList: unknown[]) {
  if (!Array.isArray(hubsList)) {
    throw new ServiceError(400, "Invalid data format. Expected an array of hub objects.");
  }

  const added = [];
  const errors: string[] = [];
  const pendingCodes = new Set<string>();

  for (let index = 0; index < hubsList.length; index++) {
    const h = hubsList[index] as Record<string, unknown>;
    const name = h.name || h.HubName || h["Hub Name"];
    const code = h.code || h.HubCode || h["Hub Code"];
    const state = h.state || h.State;
    const address = h.address || h.Address || "";
    const city = h.city || h.City || "";
    const pincode = h.pincode || h.Pincode || h.PIN || "";
    const gstin = h.gstin || h.GSTIN || h.gst || "";

    if (!name || !code || !state) {
      errors.push(`Row ${index + 1}: Missing name, code, or state.`);
      continue;
    }

    const cleanCode = String(code).trim().toUpperCase();
    const existing = await prisma.hub.findUnique({ where: { code: cleanCode } });
    if (existing || pendingCodes.has(cleanCode)) {
      errors.push(`Row ${index + 1}: Code "${cleanCode}" is a duplicate.`);
      continue;
    }

    try {
      const gstFields = normalizeHubGstFields({
        state: String(state),
        address: String(address),
        city: String(city),
        pincode: String(pincode),
        gstin: String(gstin),
      });

      pendingCodes.add(cleanCode);
      const hub = await prisma.hub.create({
        data: {
          id: newSecureId("hub"),
          name: String(name).trim(),
          code: cleanCode,
          ...gstFields,
        },
      });
      added.push(hubToApi(hub));
    } catch (err) {
      const message = err instanceof ServiceError ? err.message : "Invalid hub row.";
      errors.push(`Row ${index + 1}: ${message}`);
    }
  }

  return {
    message: `Successfully uploaded ${added.length} hubs.`,
    added,
    errors: errors.length > 0 ? errors : undefined,
  };
}

export async function deleteHub(id: string) {
  const existing = await prisma.hub.findUnique({ where: { id } });
  if (!existing) {
    throw new ServiceError(404, "Hub not found.");
  }

  const deleted = await prisma.hub.delete({ where: { id } });
  return {
    message: "Hub deleted successfully.",
    deleted: hubToApi(deleted),
  };
}
