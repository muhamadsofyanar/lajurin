import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["ADMIN", "MERCHANT", "MEMBER"]);
export const productStatusEnum = pgEnum("product_status", ["DRAFT", "PUBLISHED", "ARCHIVED"]);
export const orderStatusEnum = pgEnum("order_status", ["PENDING", "AWAITING_CONFIRMATION", "PAID", "REJECTED", "EXPIRED", "FAILED", "REFUNDED"]);
export const notificationChannelEnum = pgEnum("notification_channel", ["EMAIL", "WHATSAPP"]);
export const notificationEventEnum = pgEnum("notification_event", ["ORDER_CREATED", "PAYMENT_APPROVED", "PAYMENT_REJECTED"]);
export const notificationStatusEnum = pgEnum("notification_status", ["PENDING", "SENT", "FAILED", "SKIPPED"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(), name: text("name").notNull(), email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(), role: roleEnum("role").default("MERCHANT").notNull(), ...timestamps,
}, (table) => [uniqueIndex("users_email_unique").on(table.email)]);

export const merchantProfiles = pgTable("merchant_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  brandName: text("brand_name").notNull(),
  slug: text("slug").notNull(),
  headline: text("headline"),
  bio: text("bio"),
  logoUrl: text("logo_url"),
  supportEmail: text("support_email"),
  whatsapp: text("whatsapp"),
  accentColor: text("accent_color").default("#163d2d").notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("merchant_profiles_user_unique").on(table.userId),
  uniqueIndex("merchant_profiles_slug_unique").on(table.slug),
]);

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

export const productLandingPages = pgTable("product_landing_pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  eyebrow: text("eyebrow"),
  heroTitle: text("hero_title"),
  heroSubtitle: text("hero_subtitle"),
  coverImageUrl: text("cover_image_url"),
  benefitsText: text("benefits_text"),
  audienceText: text("audience_text"),
  ctaText: text("cta_text").default("Dapatkan akses").notNull(),
  accentColor: text("accent_color"),
  ...timestamps,
}, (table) => [uniqueIndex("product_landing_pages_product_unique").on(table.productId)]);

export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(), productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  title: text("title").notNull(), description: text("description").notNull(), ...timestamps,
}, (table) => [uniqueIndex("courses_product_unique").on(table.productId)]);

export const courseModules = pgTable("course_modules", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  position: integer("position").notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("course_modules_position_unique").on(table.courseId, table.position),
  index("course_modules_course_idx").on(table.courseId),
]);

export const lessons = pgTable("lessons", {
  id: uuid("id").primaryKey().defaultRandom(), courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  moduleId: uuid("module_id").references(() => courseModules.id, { onDelete: "set null" }),
  title: text("title").notNull(), content: text("content").notNull(), videoUrl: text("video_url"),
  isPreview: boolean("is_preview").default(false).notNull(), position: integer("position").notNull(), ...timestamps,
}, (table) => [
  uniqueIndex("lessons_position_unique").on(table.courseId, table.position),
  index("lessons_module_idx").on(table.moduleId),
]);

export const lessonAttachments = pgTable("lesson_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  storageKey: text("storage_key").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("lesson_attachments_storage_unique").on(table.storageKey),
  index("lesson_attachments_lesson_idx").on(table.lessonId, table.createdAt),
]);

export const lessonProgress = pgTable("lesson_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("lesson_progress_user_lesson_unique").on(table.userId, table.lessonId),
  index("lesson_progress_user_idx").on(table.userId, table.completedAt),
]);

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(), externalId: text("external_id").notNull(), productId: uuid("product_id").notNull().references(() => products.id),
  customerId: uuid("customer_id").references(() => users.id), customerName: text("customer_name").notNull(), customerEmail: text("customer_email").notNull(), customerPhone: text("customer_phone"),
  amount: integer("amount").notNull(), status: orderStatusEnum("status").default("PENDING").notNull(), xenditSessionId: text("xendit_invoice_id"),
  xenditPaymentUrl: text("xendit_invoice_url"), xenditPaymentId: text("xendit_payment_id"), paymentMethod: text("payment_method"),
  manualProofUrl: text("manual_proof_url"), manualBankName: text("manual_bank_name"), manualAccountName: text("manual_account_name"),
  manualTransferNote: text("manual_transfer_note"), manualSubmittedAt: timestamp("manual_submitted_at", { withTimezone: true }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }), reviewedBy: uuid("reviewed_by").references(() => users.id),
  paidAt: timestamp("paid_at", { withTimezone: true }), webhookPayload: jsonb("webhook_payload"), ...timestamps,
}, (table) => [uniqueIndex("orders_external_unique").on(table.externalId), uniqueIndex("orders_invoice_unique").on(table.xenditSessionId), index("orders_product_idx").on(table.productId, table.status)]);

export const notificationDeliveries = pgTable("notification_deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  channel: notificationChannelEnum("channel").notNull(),
  event: notificationEventEnum("event").notNull(),
  recipient: text("recipient").notNull(),
  provider: text("provider").notNull(),
  status: notificationStatusEnum("status").default("PENDING").notNull(),
  attemptCount: integer("attempt_count").default(0).notNull(),
  responseCode: integer("response_code"),
  providerResponse: jsonb("provider_response"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("notification_deliveries_order_channel_event_unique").on(table.orderId, table.channel, table.event),
  index("notification_deliveries_status_idx").on(table.status, table.createdAt),
  index("notification_deliveries_order_idx").on(table.orderId, table.createdAt),
]);

export const enrollments = pgTable("enrollments", {
  id: uuid("id").primaryKey().defaultRandom(), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }), orderId: uuid("order_id").notNull().references(() => orders.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("enrollments_user_course_unique").on(table.userId, table.courseId), uniqueIndex("enrollments_order_unique").on(table.orderId)]);

export const communityPosts = pgTable("community_posts", {
  id: uuid("id").primaryKey().defaultRandom(), authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(), content: text("content").notNull(), isPinned: boolean("is_pinned").default(false).notNull(), ...timestamps,
}, (table) => [index("community_posts_created_idx").on(table.createdAt)]);

export const communityComments = pgTable("community_comments", {
  id: uuid("id").primaryKey().defaultRandom(), postId: uuid("post_id").notNull().references(() => communityPosts.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }), content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("community_comments_post_idx").on(table.postId, table.createdAt)]);

export type User = typeof users.$inferSelect;
