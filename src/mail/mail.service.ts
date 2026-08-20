import { Injectable, Logger } from "@nestjs/common";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { getGuideFilePath } from "../document-guide/document-guide.storage";

export type SendGuidePurchaseEmailParams = {
  to: string;
  guideTitle: string;
  guideId: string;
  nameDocument: string;
  locale?: "id" | "en";
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private getMissingRequiredEnv(): string[] {
    const required = [
      "HOSTINGER_MAIL_API_TOKEN",
      "HOSTINGER_MAILBOX_ID",
      "MAIL_FROM",
    ] as const;
    return required.filter((key) => !process.env[key]?.trim());
  }

  async sendGuidePurchaseEmail(
    params: SendGuidePurchaseEmailParams,
  ): Promise<boolean> {
    const missingEnv = this.getMissingRequiredEnv();
    if (missingEnv.length > 0) {
      this.logger.warn(
        `Hostinger Mail API not configured (${missingEnv.join(", ")}) — skipping guide purchase email`,
      );
      return false;
    }

    const pdfPath = getGuideFilePath(params.guideId, params.nameDocument);
    if (!existsSync(pdfPath)) {
      this.logger.error(
        `PDF not found for guide ${params.guideId}: ${params.nameDocument}`,
      );
      return false;
    }

    const isEn = params.locale === "en";
    const subject = isEn
      ? `Your EzTripx guide: ${params.guideTitle}`
      : `Panduan EzTripx Anda: ${params.guideTitle}`;
    const html = isEn
      ? `<p>Thank you for your purchase!</p><p>Your document guide <strong>${params.guideTitle}</strong> is attached to this email.</p><p>— EzTripx</p>`
      : `<p>Terima kasih atas pembelian Anda!</p><p>Panduan <strong>${params.guideTitle}</strong> terlampir di email ini.</p><p>— EzTripx</p>`;

    const fromName = process.env.MAIL_FROM_NAME?.trim() || "EzTripx";
    const token = process.env.HOSTINGER_MAIL_API_TOKEN!.trim();
    const mailboxId = process.env.HOSTINGER_MAILBOX_ID!.trim();

    try {
      const pdfBuffer = await readFile(pdfPath);
      const payload = {
        to: [params.to],
        displayName: fromName,
        subject,
        html,
        attachments: [
          {
            filename: params.nameDocument,
            content: pdfBuffer.toString("base64"),
            contentType: "application/pdf",
            encoding: "base64",
          },
        ],
      };

      const response = await fetch(
        `https://api.mail.hostinger.com/api/v1/mailboxes/${mailboxId}/send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(
          `Hostinger Mail API send failed (${response.status}) for ${params.to}: ${body}`,
        );
        return false;
      }

      this.logger.log(`Guide email sent to ${params.to} via Hostinger Mail API`);
      return true;
    } catch (err) {
      this.logger.error(
        `Failed to send guide email to ${params.to}`,
        err instanceof Error ? err.stack : String(err),
      );
      return false;
    }
  }
}
