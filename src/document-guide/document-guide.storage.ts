import { BadRequestException } from "@nestjs/common";
import { open } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, readdir, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { diskStorage } from "multer";
import { randomUUID } from "node:crypto";
import { ErrorMessages } from "../common/constants/message.constants";

const PDF_MIME = "application/pdf";
const COVER_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_COVER_IMAGES = 8;

export function getMaxCoverImages(): number {
  return MAX_COVER_IMAGES;
}

export function buildPublicCoverImageUrl(
  guideId: string,
  imageId: string,
): string {
  return `/document-guide/public/${guideId}/cover/${imageId}`;
}

export function getCoverContentType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

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

export function sanitizeCoverBasename(originalname: string): string {
  const base = basename(originalname).replace(/\0/g, "").trim();
  if (!base) {
    throw new BadRequestException("Invalid cover file name");
  }
  const lower = base.toLowerCase();
  if (!/\.(jpe?g|png|webp)$/.test(lower)) {
    throw new BadRequestException(
      `${ErrorMessages.INVALID_FILE_TYPE}image/jpeg, image/png, image/webp`,
    );
  }
  if (base.length > 255) {
    throw new BadRequestException("File name is too long");
  }
  return base;
}

export function uniqueCoverFilename(originalname: string): string {
  const safe = sanitizeCoverBasename(originalname);
  const ext = extname(safe);
  return `${randomUUID()}${ext}`;
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
        const safe =
          file.fieldname === "coverImages" || file.fieldname === "coverImage"
            ? uniqueCoverFilename(file.originalname)
            : sanitizePdfBasename(file.originalname);
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

export function getGuideCoversDirectory(guideId: string): string {
  return join(getGuideDirectory(guideId), "covers");
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
    const { copyFile, unlink: unlinkAsync } = await import("node:fs/promises");
    await copyFile(tempFilePath, destPath);
    await unlinkAsync(tempFilePath);
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

export function getCoverFilePath(guideId: string, filename: string): string {
  const inCovers = join(getGuideCoversDirectory(guideId), basename(filename));
  if (existsSync(inCovers)) {
    return inCovers;
  }
  return join(getGuideDirectory(guideId), basename(filename));
}

export async function assertCoverImageFile(
  file: Express.Multer.File,
): Promise<void> {
  if (!file?.path) {
    throw new BadRequestException(ErrorMessages.INVALID_FILE_FORMAT);
  }
  if (!COVER_MIMES.has(file.mimetype)) {
    throw new BadRequestException(
      `${ErrorMessages.INVALID_FILE_TYPE}image/jpeg, image/png, image/webp`,
    );
  }
  const handle = await open(file.path, "r");
  try {
    const buf = Buffer.alloc(12);
    await handle.read(buf, 0, 12, 0);
    const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
    const isPng =
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47;
    const isWebp =
      buf.toString("ascii", 0, 4) === "RIFF" &&
      buf.toString("ascii", 8, 12) === "WEBP";
    if (!isJpeg && !isPng && !isWebp) {
      throw new BadRequestException(ErrorMessages.FILE_NOT_IMAGE);
    }
  } finally {
    await handle.close();
  }
}

export async function moveTempCoverToGuideFolder(
  tempFilePath: string,
  guideId: string,
  coverImageName: string,
): Promise<void> {
  const destDir = getGuideCoversDirectory(guideId);
  await mkdir(destDir, { recursive: true });
  const destPath = join(destDir, basename(coverImageName));
  try {
    await rename(tempFilePath, destPath);
  } catch {
    const { copyFile, unlink: unlinkAsync } = await import("node:fs/promises");
    await copyFile(tempFilePath, destPath);
    await unlinkAsync(tempFilePath);
  }
}

export async function removeGuidePdfFile(
  guideId: string,
  nameDocument: string,
): Promise<void> {
  const path = getGuideFilePath(guideId, nameDocument);
  if (existsSync(path)) {
    await rm(path, { force: true });
  }
}

export async function removeCoverFile(
  guideId: string,
  filename: string,
): Promise<void> {
  const path = getCoverFilePath(guideId, filename);
  if (existsSync(path)) {
    await rm(path, { force: true });
  }
}

export function createCoverReadStream(guideId: string, filename: string) {
  const path = getCoverFilePath(guideId, filename);
  if (!existsSync(path)) {
    return null;
  }
  return createReadStream(path);
}
