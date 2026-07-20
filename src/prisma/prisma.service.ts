import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from "../../generated/prisma/client";
import { createPgPool } from "./pg-pool";

@Injectable()
export class PrismaService  extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set. Please check your .env file.');
    }
    const connectTimeoutMs = Number(
      process.env.DATABASE_CONNECT_TIMEOUT_MS ?? 10_000,
    );
    const pool = createPgPool(connectionString, {
      connectionTimeoutMillis: Number.isFinite(connectTimeoutMs)
        ? connectTimeoutMs
        : 10_000,
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
