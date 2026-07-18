import "dotenv/config";
import { randomUUID } from "crypto";
import { hashPassword } from "better-auth/crypto";
import { auth } from "../lib/auth";
import { prisma } from "../lib/db";

async function ensureAdminUser() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || "Admin";

  if (!email || !password) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    const hashedPassword = await hashPassword(password);
    const now = new Date();

    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        role: "admin",
        emailVerified: true,
        updatedAt: now,
      },
    });

    const account = await prisma.account.findFirst({
      where: { userId: existing.id, providerId: "credential" },
    });

    if (account) {
      await prisma.account.update({
        where: { id: account.id },
        data: { password: hashedPassword, updatedAt: now },
      });
    } else {
      await prisma.account.create({
        data: {
          id: randomUUID(),
          accountId: email,
          providerId: "credential",
          userId: existing.id,
          password: hashedPassword,
          createdAt: now,
          updatedAt: now,
        },
      });
    }

    console.log(`Updated admin user: ${email}`);
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
    // Fall through when public sign-up is disabled.
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

ensureAdminUser()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
