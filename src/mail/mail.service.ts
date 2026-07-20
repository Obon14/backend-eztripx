import { Injectable, Logger } from "@nestjs/common";
import nodemailer from "nodemailer";
import { existsSync } from "node:fs";
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
    const required = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "MAIL_FROM"] as const;
    return required.filter((key) => !process.env[key]?.trim());
  }

  async sendGuidePurchaseEmail(
    params: SendGuidePurchaseEmailParams,
  ): Promise<boolean> {
    const missingEnv = this.getMissingRequiredEnv();
    if (missingEnv.length > 0) {
      this.logger.warn(
        `SMTP not configured (${missingEnv.join(", ")}) — skipping guide purchase email`,
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

    const port = Number(process.env.SMTP_PORT ?? 587);
    const secure =
      process.env.SMTP_SECURE === "true" || port === 465;
    // Gmail app passwords are often pasted with spaces — strip them for auth.
    const smtpPass =
      process.env.SMTP_PASS?.trim().replace(/\s+/g, "") ?? "";

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST!.trim(),
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER!.trim(),
        pass: smtpPass,
      },
    });

    const fromName =
      process.env.MAIL_FROM_NAME?.trim() || "EzTripx";
    const from = `"${fromName}" <${process.env.MAIL_FROM!.trim()}>`;

    try {
      await transporter.sendMail({
        from,
        to: params.to,
        subject,
        html,
        attachments: [
          {
            filename: params.nameDocument,
            path: pdfPath,
            contentType: "application/pdf",
          },
        ],
      });
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
