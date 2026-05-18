import { BadRequestException } from "@nestjs/common";
import { open } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, readdir, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { diskStorage } from "multer";
import { randomUUID } from "node:crypto";
import { ErrorMessages } from "../common/constants/message.constants";

const PDF_MIME = "application/pdf";

export function getDocumentGuideUploadRoot(): string {
  const raw = process.env.DOCUMENT_GUIDE_UPLOAD_DIR?.trim();
  if (raw) {
    return raw.startsWith("/") ? raw : join(process.cwd(), raw);
  }
  return join(process.cwd(), "uploads", "document-guides");
}

export function sanitizePdfBasename(originalname: string): string {
  const base = basename(originalname).replace(/\0/g, "").trim();
  if (!base) {
    throw new BadRequestException("Invalid file name");
  }
  if (!base.toLowerCase().endsWith(".pdf")) {
    throw new BadRequestException(
      `${ErrorMessages.INVALID_FILE_TYPE}application/pdf`,
    );
  }
  if (base.length > 255) {
    throw new BadRequestException("File name is too long");
  }
  return base;
}

export function documentGuideMulterDiskStorage() {
  return diskStorage({
    destination: (_req, _file, cb) => {
      const dir = join(tmpdir(), "ez-trip-document-guide", randomUUID());
      mkdir(dir, { recursive: true })
        .then(() => cb(null, dir))
        .catch((err: Error) => cb(err, ""));
    },
    filename: (_req, file, cb) => {
      try {
        const safe = sanitizePdfBasename(file.originalname);
        cb(null, safe);
      } catch (e) {
        cb(e as Error, "");
      }
    },
  });
}

export function getGuideDirectory(guideId: string): string {
  return join(getDocumentGuideUploadRoot(), guideId);
}

export function getGuideFilePath(guideId: string, nameDocument: string): string {
  return join(getGuideDirectory(guideId), basename(nameDocument));
}

export async function assertPdfFile(
  file: Express.Multer.File,
): Promise<void> {
  if (!file?.path) {
    throw new BadRequestException(ErrorMessages.INVALID_FILE_FORMAT);
  }
  if (file.mimetype !== PDF_MIME) {
    throw new BadRequestException(
      `${ErrorMessages.INVALID_FILE_TYPE}${PDF_MIME}`,
    );
  }
  const handle = await open(file.path, "r");
  try {
    const buf = Buffer.alloc(5);
    await handle.read(buf, 0, 5, 0);
    const sig = buf.toString("utf8", 0, 4);
    if (sig !== "%PDF") {
      throw new BadRequestException(ErrorMessages.INVALID_FILE_FORMAT);
    }
  } finally {
    await handle.close();
  }
}

export async function moveTempFileToGuideFolder(
  tempFilePath: string,
  guideId: string,
  nameDocument: string,
): Promise<void> {
  const destDir = getGuideDirectory(guideId);
  await mkdir(destDir, { recursive: true });
  const destPath = join(destDir, basename(nameDocument));
  try {
    await rename(tempFilePath, destPath);
  } catch {
    await mkdir(destDir, { recursive: true });
    const { copyFile, unlink: unlinkAsync } = await import("node:fs/promises");
    await copyFile(tempFilePath, destPath);
    await unlinkAsync(tempFilePath);
  }
  const tempDir = dirname(tempFilePath);
  try {
    const entries = await readdir(tempDir);
    if (entries.length === 0) {
      await rm(tempDir, { recursive: true, force: true });
    }
  } catch {
    // ignore cleanup errors
  }
}

export async function clearGuideDirectory(guideId: string): Promise<void> {
  const dir = getGuideDirectory(guideId);
  if (existsSync(dir)) {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function removeGuideDirectory(guideId: string): Promise<void> {
  await clearGuideDirectory(guideId);
}

export function createPdfReadStream(guideId: string, nameDocument: string) {
  const path = getGuideFilePath(guideId, nameDocument);
  if (!existsSync(path)) {
    return null;
  }
  return createReadStream(path);
}
