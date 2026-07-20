import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["ADMIN", "MERCHANT", "MEMBER"]);
export const productStatusEnum = pgEnum("product_status", ["DRAFT", "PUBLISHED", "ARCHIVED"]);
export const orderStatusEnum = pgEnum("order_status", ["PENDING", "PAID", "EXPIRED", "FAILED", "REFUNDED"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(), name: text("name").notNull(), email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(), role: roleEnum("role").default("MERCHANT").notNull(), ...timestamps,
}, (table) => [uniqueIndex("users_email_unique").on(table.email)]);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(), tokenHash: text("token_hash").notNull(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("sessions_token_unique").on(table.tokenHash), index("sessions_user_idx").on(table.userId)]);

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(), merchantId: uuid("merchant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(), slug: text("slug").notNull(), headline: text("headline").notNull(), description: text("description").notNull(),
  price: integer("price").notNull(), status: productStatusEnum("status").default("DRAFT").notNull(), ...timestamps,
}, (table) => [uniqueIndex("products_slug_unique").on(table.slug), index("products_merchant_idx").on(table.merchantId, table.status)]);

export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(), productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  title: text("title").notNull(), description: text("description").notNull(), ...timestamps,
}, (table) => [uniqueIndex("courses_product_unique").on(table.productId)]);

export const lessons = pgTable("lessons", {
  id: uuid("id").primaryKey().defaultRandom(), courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(), content: text("content").notNull(), videoUrl: text("video_url"), position: integer("position").notNull(), ...timestamps,
}, (table) => [uniqueIndex("lessons_position_unique").on(table.courseId, table.position)]);

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(), externalId: text("external_id").notNull(), productId: uuid("product_id").notNull().references(() => products.id),
  customerId: uuid("customer_id").references(() => users.id), customerName: text("customer_name").notNull(), customerEmail: text("customer_email").notNull(),
  amount: integer("amount").notNull(), status: orderStatusEnum("status").default("PENDING").notNull(), xenditSessionId: text("xendit_invoice_id"),
  xenditPaymentUrl: text("xendit_invoice_url"), xenditPaymentId: text("xendit_payment_id"), paymentMethod: text("payment_method"),
  paidAt: timestamp("paid_at", { withTimezone: true }), webhookPayload: jsonb("webhook_payload"), ...timestamps,
}, (table) => [uniqueIndex("orders_external_unique").on(table.externalId), uniqueIndex("orders_invoice_unique").on(table.xenditSessionId), index("orders_product_idx").on(table.productId, table.status)]);

export const enrollments = pgTable("enrollments", {
  id: uuid("id").primaryKey().defaultRandom(), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }), orderId: uuid("order_id").notNull().references(() => orders.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("enrollments_user_course_unique").on(table.userId, table.courseId), uniqueIndex("enrollments_order_unique").on(table.orderId)]);

export type User = typeof users.$inferSelect;
