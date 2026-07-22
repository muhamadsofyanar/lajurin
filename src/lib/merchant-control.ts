import { z } from "zod";

const feePercentSchema = z.union([
  z.literal(""),
  z.coerce.number().min(0).max(100).refine(
    (value) => Math.abs(Math.round(value * 100) - value * 100) < 0.000001,
    "Komisi maksimal dua angka desimal",
  ),
]);

export const merchantControlUpdateSchema = z.object({
  ownerName: z.string().trim().min(2).max(80),
  loginEmail: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  supportEmail: z.union([
    z.literal(""),
    z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  ]),
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED"]),
  feePercent: feePercentSchema,
}).transform((value) => ({
  ownerName: value.ownerName,
  loginEmail: value.loginEmail,
  supportEmail: value.supportEmail || null,
  status: value.status,
  platformFeeBps: value.feePercent === "" ? null : Math.round(value.feePercent * 100),
}));

