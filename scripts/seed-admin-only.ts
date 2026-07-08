import "dotenv/config";
import { randomUUID } from "crypto";
import { hashPassword } from "better-auth/crypto";
import { auth } from "../lib/auth";
import { prisma } from "../lib/db";

async function main() {
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log("Admin user already exists, skipping.");
    return;
  }

  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || "Admin";

  if (!email || !password) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required.");
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
    // Fall through when sign-up is disabled.
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

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
