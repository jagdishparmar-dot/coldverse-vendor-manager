import { prisma } from "@/lib/db";
import { hubToApi } from "@/lib/mappers";
import { ServiceError } from "@/lib/services/utils";

export async function listHubs() {
  const hubs = await prisma.hub.findMany({ orderBy: { createdAt: "desc" } });
  return hubs.map(hubToApi);
}

export async function createHub(body: { name?: string; code?: string; state?: string }) {
  const { name, code, state } = body;

  if (!name || !code || !state) {
    throw new ServiceError(400, "Hub Name, Code, and State are required.");
  }

  const cleanCode = code.trim().toUpperCase();
  const existing = await prisma.hub.findUnique({ where: { code: cleanCode } });
  if (existing) {
    throw new ServiceError(400, `Hub with code "${cleanCode}" already exists.`);
  }

  const hub = await prisma.hub.create({
    data: {
      id: `hub-${Date.now()}`,
      name: name.trim(),
      code: cleanCode,
      state: state.trim(),
    },
  });

  return hubToApi(hub);
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

    pendingCodes.add(cleanCode);
    const hub = await prisma.hub.create({
      data: {
        id: `hub-${Date.now()}-${index}`,
        name: String(name).trim(),
        code: cleanCode,
        state: String(state).trim(),
      },
    });
    added.push(hubToApi(hub));
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
