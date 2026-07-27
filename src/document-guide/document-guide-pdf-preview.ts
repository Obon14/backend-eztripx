import { BadRequestException } from "@nestjs/common";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { Readable } from "node:stream";
import { getGuideFilePath } from "./document-guide.storage";

/**
 * Builds a PDF buffer containing only the first `maxPages` pages.
 * Used for public preview when previewMode = hide (never send the full file).
 */
export async function buildLimitedPdfBuffer(
  guideId: string,
  nameDocument: string,
  maxPages: number,
): Promise<{ buffer: Buffer; filename: string }> {
  if (!Number.isInteger(maxPages) || maxPages < 1) {
    throw new BadRequestException("previewPageCount must be an integer >= 1");
  }

  const path = getGuideFilePath(guideId, nameDocument);
  let bytes: Buffer;
  try {
    bytes = await readFile(path);
  } catch {
    throw new BadRequestException("Document file not found");
  }

  let src: PDFDocument;
  try {
    src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  } catch {
    throw new BadRequestException("Unable to read PDF for preview");
  }

  const total = src.getPageCount();
  const count = Math.min(maxPages, total);
  const out = await PDFDocument.create();
  const indices = Array.from({ length: count }, (_, i) => i);
  const pages = await out.copyPages(src, indices);
  for (const page of pages) {
    out.addPage(page);
  }

  const pdfBytes = await out.save();
  return {
    buffer: Buffer.from(pdfBytes),
    filename: nameDocument,
  };
}

export function bufferToReadable(buffer: Buffer): Readable {
  return Readable.from(buffer);
}
