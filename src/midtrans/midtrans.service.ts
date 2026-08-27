import { Injectable } from "@nestjs/common";
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

@Injectable()
export class MidtransService {
  private readonly snap: InstanceType<(typeof midtransClient)["Snap"]>;
  private readonly core: InstanceType<(typeof midtransClient)["CoreApi"]>;
  private readonly serverKey: string;

  constructor(config: ConfigService) {
    this.serverKey = config.getOrThrow<string>("MIDTRANS_SERVER_KEY").trim();
    const isProduction =
      config.get<string>("MIDTRANS_IS_PRODUCTION")?.trim().toLowerCase() ===
      "true";
    const clientKey = config.get<string>("MIDTRANS_CLIENT_KEY")?.trim() || "";

    this.snap = new midtransClient.Snap({
      isProduction,
      serverKey: this.serverKey,
      clientKey,
    });

    this.core = new midtransClient.CoreApi({
      isProduction,
      serverKey: this.serverKey,
      clientKey,
    });
  }

  createSnapTransaction(parameter: Record<string, unknown>) {
    return this.snap.createTransaction(parameter);
  }

  getTransactionStatus(orderId: string) {
    return this.core.transaction.status(orderId);
  }

  verifyNotificationSignature(payload: {
    order_id?: string;
    status_code?: string;
    gross_amount?: string;
    signature_key?: string;
  }): boolean {
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
}
