import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { communitySpaces, courses, enrollments, merchantProfiles, products, users, type User } from "@/lib/schema";

export async function getAccessibleCommunitySpaces(user: User) {
  const base = db.select({
    space: communitySpaces,
    merchantName: users.name,
    merchantBrand: merchantProfiles.brandName,
    productName: products.name,
  }).from(communitySpaces)
    .leftJoin(users, eq(communitySpaces.merchantId, users.id))
    .leftJoin(merchantProfiles, eq(communitySpaces.merchantId, merchantProfiles.userId))
    .leftJoin(products, eq(communitySpaces.productId, products.id));

  if (user.role === "ADMIN") return base;
  if (user.role === "MERCHANT") return base.where(or(isNull(communitySpaces.merchantId), eq(communitySpaces.merchantId, user.id)));

  const accessRows = await db.select({ productId: products.id, merchantId: products.merchantId })
    .from(enrollments).innerJoin(courses, eq(enrollments.courseId, courses.id))
    .innerJoin(products, eq(courses.productId, products.id)).where(eq(enrollments.userId, user.id));
  const productIds = [...new Set(accessRows.map((row) => row.productId))];
  const merchantIds = [...new Set(accessRows.map((row) => row.merchantId))];
  if (!productIds.length) return [];
  return base.where(and(eq(communitySpaces.isArchived, false), or(
    isNull(communitySpaces.merchantId),
    inArray(communitySpaces.productId, productIds),
    and(isNull(communitySpaces.productId), inArray(communitySpaces.merchantId, merchantIds)),
  )));
}

export async function getAccessibleCommunitySpace(user: User, spaceId: string) {
  const spaces = await getAccessibleCommunitySpaces(user);
  return spaces.find((row) => row.space.id === spaceId) ?? null;
}

export function canModerateSpace(user: User, space: typeof communitySpaces.$inferSelect) {
  return user.role === "ADMIN" || (user.role === "MERCHANT" && space.merchantId === user.id);
}
