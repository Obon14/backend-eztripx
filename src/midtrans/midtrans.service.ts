import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";

// Official package; @types/midtrans-client is incomplete (missing CoreApi.transaction).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const midtransClient = require("midtrans-client") as {
  Snap: new (opts: {
    isProduction: boolean;
    serverKey: string;
    clientKey: string;
  }) => {
    createTransaction: (
      parameter: Record<string, unknown>,
    ) => Promise<MidtransSnapTransaction>;
  };
  CoreApi: new (opts: {
    isProduction: boolean;
    serverKey: string;
    clientKey: string;
  }) => {
    transaction: {
      status: (orderId: string) => Promise<MidtransTransactionStatus>;
    };
  };
};

export type MidtransSnapTransaction = {
  token: string;
  redirect_url: string;
};

export type MidtransTransactionStatus = {
  order_id?: string;
  transaction_id?: string;
  transaction_status?: string;
  fraud_status?: string;
  status_code?: string;
  gross_amount?: string;
  status_message?: string;
};

type MidtransApiError = Error & {
  httpStatusCode?: number | null;
  ApiResponse?: unknown;
};

@Injectable()
export class MidtransService {
  private readonly logger = new Logger(MidtransService.name);
  private readonly snap: InstanceType<(typeof midtransClient)["Snap"]> | null =
    null;
  private readonly core: InstanceType<(typeof midtransClient)["CoreApi"]> | null =
    null;
  private readonly serverKey: string;
  private readonly isProduction: boolean;
  private readonly configured: boolean;

  constructor(config: ConfigService) {
    this.serverKey = this.normalizeKey(
      config.get<string>("MIDTRANS_SERVER_KEY") ?? "",
    );
    const clientKey = this.normalizeKey(
      config.get<string>("MIDTRANS_CLIENT_KEY") ?? "",
    );
    const bypass =
      config.get<string>("PAYMENT_BYPASS")?.trim().toLowerCase() === "true";

    const flag = config
      .get<string>("MIDTRANS_IS_PRODUCTION")
      ?.trim()
      .toLowerCase();
    this.isProduction =
      flag === "true"
        ? true
        : flag === "false"
          ? false
          : Boolean(this.serverKey) && !this.serverKey.startsWith("SB-");

    this.configured = Boolean(this.serverKey);

    if (!this.configured) {
      if (bypass) {
        this.logger.warn(
          "MIDTRANS_SERVER_KEY empty — Midtrans disabled (PAYMENT_BYPASS=true).",
        );
      } else {
        this.logger.error(
          "MIDTRANS_SERVER_KEY is empty. Paste Sandbox Server Key into .env, then run: npm run midtrans:verify",
        );
      }
      return;
    }

    this.logger.log(
      `Midtrans ready (isProduction=${this.isProduction}, keyPrefix=${this.serverKey.slice(0, 12)}…)`,
    );

    if (!this.isProduction && !this.serverKey.startsWith("SB-")) {
      this.logger.warn(
        "Sandbox mode is on, but Server Key does not start with SB-. " +
          "Copy Server Key from dashboard.sandbox.midtrans.com → Settings → Access Keys. Wrong keys cause HTTP 401.",
      );
    }

    this.snap = new midtransClient.Snap({
      isProduction: this.isProduction,
      serverKey: this.serverKey,
      clientKey,
    });

    this.core = new midtransClient.CoreApi({
      isProduction: this.isProduction,
      serverKey: this.serverKey,
      clientKey,
    });
  }

  async createSnapTransaction(
    parameter: Record<string, unknown>,
  ): Promise<MidtransSnapTransaction> {
    this.assertConfigured();
    try {
      return await this.snap!.createTransaction(parameter);
    } catch (err) {
      this.rethrowAsHttp(err, "createSnapTransaction");
    }
  }

  async getTransactionStatus(
    orderId: string,
  ): Promise<MidtransTransactionStatus> {
    this.assertConfigured();
    try {
      return await this.core!.transaction.status(orderId);
    } catch (err) {
      this.rethrowAsHttp(err, "getTransactionStatus");
    }
  }

  verifyNotificationSignature(payload: {
    order_id?: string;
    status_code?: string;
    gross_amount?: string;
    signature_key?: string;
  }): boolean {
    if (!this.configured) {
      return false;
    }
    const orderId = payload.order_id?.trim() ?? "";
    const statusCode = payload.status_code?.trim() ?? "";
    const grossAmount = payload.gross_amount?.trim() ?? "";
    const signatureKey = payload.signature_key?.trim() ?? "";
    if (!orderId || !statusCode || !grossAmount || !signatureKey) {
      return false;
    }

    const expected = crypto
      .createHash("sha512")
      .update(`${orderId}${statusCode}${grossAmount}${this.serverKey}`)
      .digest("hex");

    return expected === signatureKey;
  }

  private assertConfigured(): void {
    if (!this.configured || !this.snap || !this.core) {
      throw new ServiceUnavailableException(
        "Midtrans is not configured. Set MIDTRANS_SERVER_KEY in .env (Sandbox Access Keys), then restart.",
      );
    }
  }

  private normalizeKey(raw: string): string {
    return raw.trim().replace(/^["']+|["']+$/g, "");
  }

  private rethrowAsHttp(err: unknown, action: string): never {
    const apiErr = err as MidtransApiError;
    const status = apiErr.httpStatusCode ?? null;
    const detail =
      typeof apiErr.ApiResponse === "object" && apiErr.ApiResponse !== null
        ? JSON.stringify(apiErr.ApiResponse)
        : apiErr.message || String(err);

    this.logger.error(`Midtrans ${action} failed (HTTP ${status}): ${detail}`);

    if (status === 401) {
      const gatewayErr = new BadGatewayException(
        "Midtrans rejected the Server Key (401). " +
          "Paste MIDTRANS_SERVER_KEY from Sandbox Access Keys and set MIDTRANS_IS_PRODUCTION=false, then restart. " +
          "Verify with: npm run midtrans:verify",
      );
      (
        gatewayErr as BadGatewayException & { midtransHttpStatus: number }
      ).midtransHttpStatus = 401;
      throw gatewayErr;
    }

    const gatewayErr = new BadGatewayException(
      `Midtrans payment gateway error${status ? ` (${status})` : ""}. Please try again.`,
    );
    (
      gatewayErr as BadGatewayException & { midtransHttpStatus: number | null }
    ).midtransHttpStatus = status;
    throw gatewayErr;
  }
}
