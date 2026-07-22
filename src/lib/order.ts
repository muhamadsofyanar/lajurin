export const orderStatusLabel = {
  PENDING: "Menunggu pembayaran",
  AWAITING_CONFIRMATION: "Menunggu konfirmasi",
  PAID: "Lunas",
  REJECTED: "Bukti ditolak",
  EXPIRED: "Kedaluwarsa",
  FAILED: "Gagal",
  REFUNDED: "Dikembalikan",
} as const;

export function formatDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(value) : "—";
}
