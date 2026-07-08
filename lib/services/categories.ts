import { prisma } from "@/lib/db";
import { ServiceError } from "@/lib/services/utils";

export async function listCategories() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return categories.map((c) => c.name);
}

export async function addCategory(name: string) {
  if (!name || typeof name !== "string" || name.trim() === "") {
    throw new ServiceError(400, "Category name is required.");
  }

  const normalized = name.trim();
  const existing = await prisma.category.findFirst({
    where: { name: { equals: normalized, mode: "insensitive" } },
  });

  if (existing) {
    throw new ServiceError(400, "Category already exists.");
  }

  await prisma.category.create({ data: { name: normalized } });
  const categories = await listCategories();

  return {
    message: "Category added successfully.",
    categories,
    category: normalized,
  };
}
