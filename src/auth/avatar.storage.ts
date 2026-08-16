import { BadRequestException } from "@nestjs/common";
import { existsSync, createReadStream } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import { extname, join } from "node:path";
import { diskStorage } from "multer";
import { ErrorMessages } from "../common/constants/message.constants";

const AVATAR_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function getAvatarUploadRoot(): string {
  const raw = process.env.AVATAR_UPLOAD_DIR?.trim();
  if (raw) {
    return raw.startsWith("/") ? raw : join(process.cwd(), raw);
  }
  return join(process.cwd(), "uploads", "avatars");
}

export function getAvatarContentType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export function avatarMulterStorage() {
  return diskStorage({
    destination: async (_req, _file, cb) => {
      const dir = getAvatarUploadRoot();
      await mkdir(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const userId = (req as { user?: { id?: string } }).user?.id;
      if (!userId) {
        cb(new BadRequestException("Unauthorized"), "");
        return;
      }
      const ext = extname(file.originalname).toLowerCase();
      const safe =
        ext === ".png" || ext === ".webp" || ext === ".jpg" || ext === ".jpeg"
          ? ext === ".jpeg"
            ? ".jpg"
            : ext
          : ".jpg";
      cb(null, `${userId}${safe}`);
    },
  });
}

export function assertAvatarFile(file: Express.Multer.File | undefined) {
  if (!file) return;
  if (!AVATAR_MIMES.has(file.mimetype)) {
    throw new BadRequestException(
      `${ErrorMessages.INVALID_FILE_TYPE}image/jpeg, image/png, image/webp`,
    );
  }
}

export function getAvatarPath(filename: string): string {
  return join(getAvatarUploadRoot(), filename);
}

export function avatarExists(filename: string): boolean {
  return existsSync(getAvatarPath(filename));
}

export function openAvatarStream(filename: string) {
  return createReadStream(getAvatarPath(filename));
}

export async function removeAvatarFile(filename: string | null | undefined) {
  if (!filename) return;
  const path = getAvatarPath(filename);
  if (!existsSync(path)) return;
  await unlink(path);
}
