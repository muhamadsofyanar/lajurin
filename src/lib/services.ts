export const serviceStatusLabel = {
  WAITING_PAYMENT: "Menunggu pembayaran",
  WAITING_DOCUMENTS: "Menunggu dokumen",
  DOCUMENT_REVIEW: "Pemeriksaan dokumen",
  REVISION_REQUIRED: "Perlu perbaikan",
  IN_PROGRESS: "Sedang diproses",
  WAITING_AGENCY: "Menunggu instansi",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
} as const;

export const serviceStatusOptions = Object.entries(serviceStatusLabel) as Array<
  [keyof typeof serviceStatusLabel, string]
>;

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
