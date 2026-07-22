import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { persistentStorageDirectories } from "@/lib/storage";

export type RuntimeCheck = { key: string; label: string; ok: boolean; detail: string };

function isValidEncryptionKey(value: string | undefined) {
  if (!value) return false;
  try { return Buffer.from(value, "base64").length === 32; } catch { return false; }
}

export function configurationChecks(): RuntimeCheck[] {
  const appUrl = process.env.APP_URL;
  const production = process.env.NODE_ENV === "production";
  return [
    { key: "database", label: "Database", ok: Boolean(process.env.DATABASE_URL?.startsWith("postgres")), detail: "DATABASE_URL PostgreSQL terisi" },
    { key: "app_url", label: "URL aplikasi", ok: Boolean(appUrl && (!production || appUrl.startsWith("https://"))), detail: production ? "APP_URL memakai HTTPS" : "APP_URL terisi" },
    { key: "actions_key", label: "Kunci Server Actions", ok: isValidEncryptionKey(process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY), detail: "Kunci Base64 stabil 32 byte" },
    { key: "manual_bank", label: "Rekening transfer", ok: Boolean(process.env.MANUAL_BANK_NAME && process.env.MANUAL_BANK_ACCOUNT && process.env.MANUAL_BANK_HOLDER), detail: "Nama bank, nomor, dan pemilik terisi" },
    { key: "xendit", label: "Xendit", ok: Boolean(process.env.XENDIT_SECRET_KEY) === Boolean(process.env.XENDIT_WEBHOOK_TOKEN), detail: process.env.XENDIT_SECRET_KEY && process.env.XENDIT_WEBHOOK_TOKEN ? "Payment gateway aktif" : "Opsional; isi kedua secret untuk mengaktifkan" },
    { key: "notifications", label: "Notifikasi eksternal", ok: process.env.NOTIFICATIONS_ENABLED !== "true" || Boolean(process.env.STARSENDER_API_KEY && process.env.MAILKETING_API_TOKEN && process.env.MAILKETING_FROM_EMAIL), detail: "Provider lengkap atau notifikasi dimatikan" },
  ];
}

export async function storageChecks(): Promise<RuntimeCheck[]> {
  return Promise.all(persistentStorageDirectories.map(async (directory) => {
    try {
      await access(directory, constants.R_OK | constants.W_OK);
      return { key: directory, label: directory.split("/").at(-1) ?? directory, ok: true, detail: "Dapat dibaca dan ditulis" };
    } catch {
      return { key: directory, label: directory.split("/").at(-1) ?? directory, ok: false, detail: "Tidak tersedia atau tidak dapat ditulis" };
    }
  }));
}
