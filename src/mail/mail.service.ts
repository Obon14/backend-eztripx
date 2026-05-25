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

  private isConfigured(): boolean {
    return Boolean(
      process.env.SMTP_HOST?.trim() &&
        process.env.SMTP_USER?.trim() &&
        process.env.MAIL_FROM?.trim(),
    );
  }

  async sendGuidePurchaseEmail(
    params: SendGuidePurchaseEmailParams,
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      this.logger.warn(
        "SMTP not configured — skipping guide purchase email",
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

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST!.trim(),
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER!.trim(),
        pass: process.env.SMTP_PASS?.trim() ?? "",
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
