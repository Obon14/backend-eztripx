import * as fs from "node:fs";
import * as path from "node:path";
import type { PrismaClient } from "../generated/prisma/client";
import { LegalSlug } from "../generated/prisma/enums";

type SeedDoc = {
  slug: "terms" | "privacy";
  titleId: string;
  titleEn: string;
  titleHighlightId: string;
  titleHighlightEn: string;
  introId: string;
  introEn: string;
  bodyId: string;
  bodyEn: string;
};

function loadSeedDocs(): SeedDoc[] {
  const jsonPath = path.resolve(__dirname, "legal-seed.json");
  const raw = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as {
    terms: SeedDoc;
    privacy: SeedDoc;
  };
  return [raw.terms, raw.privacy];
}

/**
 * Inserts terms + privacy if missing. Never overwrites admin edits.
 */
export async function seedLegalDocuments(prisma: PrismaClient) {
  const docs = loadSeedDocs();
  for (const doc of docs) {
    const slug = doc.slug === "privacy" ? LegalSlug.privacy : LegalSlug.terms;
    const existing = await prisma.legalDocument.findUnique({ where: { slug } });
    if (existing) {
      console.log(`Legal seed: "${doc.slug}" already exists (skipped).`);
      continue;
    }
    await prisma.legalDocument.create({
      data: {
        slug,
        titleId: doc.titleId,
        titleEn: doc.titleEn,
        titleHighlightId: doc.titleHighlightId,
        titleHighlightEn: doc.titleHighlightEn,
        introId: doc.introId,
        introEn: doc.introEn,
        bodyId: doc.bodyId,
        bodyEn: doc.bodyEn,
      },
    });
    console.log(`Legal seed: created "${doc.slug}".`);
  }
}

async function runStandalone() {
  const { config } = await import("dotenv");
  config();
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { PrismaClient } = await import("../generated/prisma/client");
  const { createPgPool } = await import("../src/prisma/pg-pool");

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required (e.g. in .env)");
  }
  const pool = createPgPool(connectionString);
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  try {
    await seedLegalDocuments(prisma);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

const isDirectRun = process.argv[1]?.includes("seed-legal");
if (isDirectRun) {
  runStandalone().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
