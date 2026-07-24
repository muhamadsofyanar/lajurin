import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { affiliateCommissions, affiliatePartners, affiliatePayoutRequests } from "@/lib/schema";

type AppTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type PayoutAccount = { bankName: string; accountNumber: string; accountHolder: string };
type PayoutDecision = "PAID" | "REJECTED";

export class AffiliatePayoutError extends Error {}

export async function reserveAffiliatePayout(
  tx: AppTransaction,
  userId: string,
  account: PayoutAccount,
) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`affiliate-payout:${userId}`}))`);

  const [active] = await tx.select({ id: affiliatePayoutRequests.id }).from(affiliatePayoutRequests)
    .where(and(
      eq(affiliatePayoutRequests.userId, userId),
      eq(affiliatePayoutRequests.status, "REQUESTED"),
    )).limit(1);
  if (active) throw new AffiliatePayoutError("Permintaan pencairan sebelumnya masih diproses");

  const partners = await tx.select({ id: affiliatePartners.id }).from(affiliatePartners)
    .where(eq(affiliatePartners.userId, userId));
  if (!partners.length) throw new AffiliatePayoutError("Belum ada komisi yang dapat dicairkan");

  const available = await tx.select({
    id: affiliateCommissions.id,
    amount: affiliateCommissions.amount,
  }).from(affiliateCommissions).where(and(
    inArray(affiliateCommissions.partnerId, partners.map((partner) => partner.id)),
    eq(affiliateCommissions.status, "PENDING"),
  ));
  const amount = available.reduce((total, commission) => total + commission.amount, 0);
  if (amount < 50_000) throw new AffiliatePayoutError("Minimum pencairan affiliate Rp50.000");

  const [request] = await tx.insert(affiliatePayoutRequests).values({
    userId,
    amount,
    ...account,
  }).returning();

  const reserved = await tx.update(affiliateCommissions).set({
    status: "RESERVED",
    payoutRequestId: request.id,
    updatedAt: new Date(),
  }).where(and(
    inArray(affiliateCommissions.id, available.map((commission) => commission.id)),
    eq(affiliateCommissions.status, "PENDING"),
  )).returning({ id: affiliateCommissions.id });

  if (reserved.length !== available.length) {
    throw new AffiliatePayoutError("Saldo komisi berubah; silakan ajukan ulang");
  }
  return request;
}

export async function settleAffiliatePayout(
  tx: AppTransaction,
  requestId: string,
  decision: PayoutDecision,
  review: { adminId: string; note: string },
) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`affiliate-payout-request:${requestId}`}))`);
  const [request] = await tx.select().from(affiliatePayoutRequests)
    .where(and(
      eq(affiliatePayoutRequests.id, requestId),
      eq(affiliatePayoutRequests.status, "REQUESTED"),
    )).limit(1);
  if (!request) throw new AffiliatePayoutError("Permintaan tidak ditemukan atau sudah diproses");

  const [reserved] = await tx.select({
    amount: sql<number>`coalesce(sum(${affiliateCommissions.amount}), 0)::int`,
    count: sql<number>`count(*)::int`,
  }).from(affiliateCommissions).where(and(
    eq(affiliateCommissions.payoutRequestId, request.id),
    eq(affiliateCommissions.status, "RESERVED"),
  ));
  if (!reserved?.count || Number(reserved.amount) !== request.amount) {
    throw new AffiliatePayoutError("Komisi yang dicadangkan tidak sesuai dengan nominal payout");
  }

  await tx.update(affiliateCommissions).set(decision === "PAID" ? {
    status: "PAID",
    paidAt: new Date(),
    updatedAt: new Date(),
  } : {
    status: "PENDING",
    payoutRequestId: null,
    updatedAt: new Date(),
  }).where(and(
    eq(affiliateCommissions.payoutRequestId, request.id),
    eq(affiliateCommissions.status, "RESERVED"),
  ));

  await tx.update(affiliatePayoutRequests).set({
    status: decision,
    adminNote: review.note,
    reviewedBy: review.adminId,
    reviewedAt: new Date(),
    paidAt: decision === "PAID" ? new Date() : null,
    updatedAt: new Date(),
  }).where(and(
    eq(affiliatePayoutRequests.id, request.id),
    eq(affiliatePayoutRequests.status, "REQUESTED"),
  ));
  return request;
}
