import "dotenv/config";
import * as bcrypt from "bcrypt";
import * as fs from "node:fs";
import * as path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { Role } from "../generated/prisma/enums";
import { createPgPool } from "../src/prisma/pg-pool";

/** Rows per createMany to stay under Postgres parameter limits */
const CITY_BATCH = 2500;

type CityJson = { id: number; name: string };
type StateJson = { id: number; name: string; cities?: CityJson[] };
type CountryJson = {
  id: number;
  name: string;
  region_id: number | null;
  region: string | null;
  states?: StateJson[];
};

function isValidCountry(c: CountryJson): c is CountryJson & {
  region_id: number;
  region: string;
} {
  return (
    typeof c.id === "number" &&
    Number.isFinite(c.id) &&
    typeof c.region_id === "number" &&
    Number.isFinite(c.region_id) &&
    typeof c.region === "string" &&
    c.region.trim().length > 0 &&
    typeof c.name === "string" &&
    c.name.trim().length > 0
  );
}

function createPrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required (e.g. in .env)");
  }
  const pool = createPgPool(connectionString);
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  return { prisma, pool };
}

/**
 * Creates or upgrades one ADMIN user (idempotent).
 * - New user: requires `SEED_ADMIN_PASSWORD` (plain text; stored hashed with bcrypt cost 12, same as auth register).
 * - Existing user: ensures `role` is ADMIN; password is not changed unless `SEED_ADMIN_RESET_PASSWORD=1` and `SEED_ADMIN_PASSWORD` is set.
 */
async function seedAdminUser(prisma: PrismaClient) {
  const email =
    process.env.SEED_ADMIN_EMAIL?.trim() || "admin@ez-trip-x.local";
  const plainPassword = process.env.SEED_ADMIN_PASSWORD;
  const resetPassword = process.env.SEED_ADMIN_RESET_PASSWORD === "1";

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    const updates: { role?: "ADMIN" | "USER"; password?: string } = {};

    if (existing.role !== Role.ADMIN) {
      updates.role = "ADMIN";
    }

    if (resetPassword) {
      if (!plainPassword) {
        console.warn(
          "Admin seed: SEED_ADMIN_RESET_PASSWORD=1 but SEED_ADMIN_PASSWORD is empty — password not updated.",
        );
      } else {
        updates.password = await bcrypt.hash(plainPassword, 12);
      }
    }

    if (Object.keys(updates).length > 0) {
      await prisma.user.update({
        where: { email },
        data: updates,
      });
      console.log(
        `Admin seed: updated "${email}" (${Object.keys(updates).join(", ") || "no-op"}).`,
      );
    } else {
      console.log(
        `Admin seed: user "${email}" already exists as ADMIN (skipped).`,
      );
    }
    return;
  }

  if (!plainPassword) {
    console.warn(
      `Admin seed: user "${email}" does not exist and SEED_ADMIN_PASSWORD is not set — skipping admin creation.`,
    );
    return;
  }

  const password = await bcrypt.hash(plainPassword, 12);
  await prisma.user.create({
    data: {
      email,
      password,
      role: Role.ADMIN,
    },
  });
  console.log(`Admin seed: created ADMIN user "${email}".`);
}

async function syncSerialSequences(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe(`
    SELECT setval(
      pg_get_serial_sequence('"Region"', 'id'),
      COALESCE((SELECT MAX("id") FROM "Region"), 1)
    );
  `);
  await prisma.$executeRawUnsafe(`
    SELECT setval(
      pg_get_serial_sequence('"Country"', 'id'),
      COALESCE((SELECT MAX("id") FROM "Country"), 1)
    );
  `);
  await prisma.$executeRawUnsafe(`
    SELECT setval(
      pg_get_serial_sequence('"City"', 'id'),
      COALESCE((SELECT MAX("id") FROM "City"), 1)
    );
  `);
}

async function main() {
  const { prisma, pool } = createPrisma();

  try {
    const jsonPath = path.resolve(
      process.cwd(),
      "countries+states+cities.json",
    );
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`Geo JSON not found: ${jsonPath}`);
    }

    console.log("Reading JSON (this may use significant RAM)…");
    const raw = fs.readFileSync(jsonPath, "utf8");
    const parsed = JSON.parse(raw) as CountryJson[];
    const countries = parsed.filter(isValidCountry);
    if (countries.length < parsed.length) {
      console.warn(
        `Skipped ${parsed.length - countries.length} countr(ies) missing valid id, name, region_id, or region.`,
      );
    }
    console.log(`Countries in file (usable): ${countries.length}`);

    const regionById = new Map<number, string>();
    for (const c of countries) {
      const existing = regionById.get(c.region_id);
      if (existing === undefined) {
        regionById.set(c.region_id, c.region);
      } else if (existing !== c.region) {
        console.warn(
          `Region id ${c.region_id}: conflicting names "${existing}" vs "${c.region}" — keeping first`,
        );
      }
    }

    const regionRows = [...regionById.entries()].map(([id, name]) => ({
      id,
      name,
    }));

    const countryRows = countries.map((c) => ({
      id: c.id,
      name: c.name,
      regionId: c.region_id,
    }));

    const cityRows: { id: number; name: string; countryId: number }[] = [];
    const seenCityIds = new Set<number>();
    let skippedDuplicateCityIds = 0;

    for (const c of countries) {
      for (const state of c.states ?? []) {
        for (const city of state.cities ?? []) {
          if (
            typeof city.id !== "number" ||
            !Number.isFinite(city.id) ||
            typeof city.name !== "string" ||
            !city.name.trim()
          ) {
            continue;
          }
          if (seenCityIds.has(city.id)) {
            skippedDuplicateCityIds++;
            continue;
          }
          seenCityIds.add(city.id);
          cityRows.push({
            id: city.id,
            name: city.name,
            countryId: c.id,
          });
        }
      }
    }

    if (skippedDuplicateCityIds > 0) {
      console.warn(
        `Skipped ${skippedDuplicateCityIds} city row(s) with duplicate id (first country/state occurrence kept).`,
      );
    }
    console.log(`Unique regions: ${regionRows.length}`);
    console.log(`Cities to seed: ${cityRows.length}`);

    console.log("Seeding regions…");
    await prisma.region.createMany({
      data: regionRows,
      skipDuplicates: true,
    });

    console.log("Seeding countries…");
    await prisma.country.createMany({
      data: countryRows,
      skipDuplicates: true,
    });

    console.log("Seeding cities (batched)…");
    for (let i = 0; i < cityRows.length; i += CITY_BATCH) {
      const chunk = cityRows.slice(i, i + CITY_BATCH);
      await prisma.city.createMany({
        data: chunk,
        skipDuplicates: true,
      });
      const done = Math.min(i + CITY_BATCH, cityRows.length);
      if (done === cityRows.length || done % (CITY_BATCH * 10) === 0) {
        console.log(`  … ${done} / ${cityRows.length}`);
      }
    }

    console.log("Aligning SERIAL sequences with max ids…");
    await syncSerialSequences(prisma);

    console.log("Seeding admin user…");
    await seedAdminUser(prisma);

    console.log("Seed finished.");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
