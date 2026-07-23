import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["ADMIN", "MERCHANT", "MEMBER"]);
export const productStatusEnum = pgEnum("product_status", ["DRAFT", "PUBLISHED", "ARCHIVED"]);
export const productTypeEnum = pgEnum("product_type", ["COURSE", "DIGITAL", "SERVICE"]);
export const orderStatusEnum = pgEnum("order_status", ["PENDING", "AWAITING_CONFIRMATION", "PAID", "REJECTED", "EXPIRED", "FAILED", "REFUNDED"]);
export const serviceCaseStatusEnum = pgEnum("service_case_status", ["WAITING_PAYMENT", "WAITING_DOCUMENTS", "DOCUMENT_REVIEW", "REVISION_REQUIRED", "IN_PROGRESS", "WAITING_AGENCY", "COMPLETED", "CANCELLED"]);
export const serviceNoteVisibilityEnum = pgEnum("service_note_visibility", ["INTERNAL", "CLIENT"]);
export const serviceDocumentAudienceEnum = pgEnum("service_document_audience", ["MERCHANT", "CLIENT"]);
export const serviceFieldTypeEnum = pgEnum("service_field_type", ["TEXT", "TEXTAREA"]);
export const merchantPlanEnum = pgEnum("merchant_plan", ["STARTER", "PRO", "BUSINESS"]);
export const notificationChannelEnum = pgEnum("notification_channel", ["EMAIL", "WHATSAPP"]);
export const notificationEventEnum = pgEnum("notification_event", ["ORDER_CREATED", "PAYMENT_APPROVED", "PAYMENT_REJECTED", "CHECKOUT_REMINDER"]);
export const notificationStatusEnum = pgEnum("notification_status", ["PENDING", "PROCESSING", "SENT", "FAILED", "SKIPPED"]);
export const merchantStatusEnum = pgEnum("merchant_status", ["PENDING", "ACTIVE", "SUSPENDED"]);
export const payoutStatusEnum = pgEnum("payout_status", ["REQUESTED", "PAID", "REJECTED"]);
export const ledgerEntryTypeEnum = pgEnum("ledger_entry_type", ["SALE", "PAYOUT", "PAYOUT_REVERSAL", "REFUND", "ADJUSTMENT"]);
export const paymentSettlementModeEnum = pgEnum("payment_settlement_mode", ["PLATFORM", "MERCHANT_DIRECT"]);
export const platformReceivableEntryTypeEnum = pgEnum("platform_receivable_entry_type", ["MANUAL_SALE_FEE", "MANUAL_SALE_FEE_REVERSAL", "PAYMENT", "ADJUSTMENT"]);
export const landingTemplateEnum = pgEnum("landing_template", ["EDITORIAL", "CREATOR", "STUDIO"]);
export const couponDiscountTypeEnum = pgEnum("coupon_discount_type", ["PERCENT", "FIXED"]);
export const analyticsEventEnum = pgEnum("analytics_event", ["PAGE_VIEW", "CHECKOUT_STARTED", "PURCHASE"]);
export const communityReportStatusEnum = pgEnum("community_report_status", ["OPEN", "RESOLVED", "DISMISSED"]);
export const automationTriggerEnum = pgEnum("automation_trigger", ["PURCHASED", "COURSE_COMPLETED"]);
export const webhookProcessingStatusEnum = pgEnum("webhook_processing_status", ["RECEIVED", "PROCESSED", "IGNORED", "FAILED", "REJECTED"]);
export const workspaceKindEnum = pgEnum("workspace_kind", ["INTERNAL", "EXTERNAL"]);
export const workspaceStatusEnum = pgEnum("workspace_status", ["DRAFT", "ACTIVE", "SUSPENDED", "CLOSED"]);
export const workspaceMembershipRoleEnum = pgEnum("workspace_membership_role", ["OWNER", "ADMIN", "FINANCE", "STAFF", "MEMBER"]);
export const workspaceMembershipStatusEnum = pgEnum("workspace_membership_status", ["INVITED", "ACTIVE", "SUSPENDED", "REVOKED"]);
export const workspaceDomainStatusEnum = pgEnum("workspace_domain_status", ["PENDING", "VERIFIED", "FAILED", "DISABLED"]);
export const featureFlagRolloutEnum = pgEnum("feature_flag_rollout", ["OFF", "ALL", "USERS"]);
export const commissionPaymentStatusEnum = pgEnum("commission_payment_status", ["SUBMITTED", "APPROVED", "REJECTED"]);
export const workspaceInvitationStatusEnum = pgEnum("workspace_invitation_status", ["PENDING", "ACCEPTED", "REVOKED", "EXPIRED"]);

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
  status: merchantStatusEnum("status").default("PENDING").notNull(),
  platformFeeBps: integer("platform_fee_bps"),
  plan: merchantPlanEnum("plan").default("STARTER").notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  verificationLevel: text("verification_level").default("BASIC").notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("merchant_profiles_user_unique").on(table.userId),
  uniqueIndex("merchant_profiles_slug_unique").on(table.slug),
]);

// Workspace Foundation M1 is additive. Legacy merchant ownership remains the
// production path until a later per-use-case cutover is approved.
export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  kind: workspaceKindEnum("kind").default("EXTERNAL").notNull(),
  status: workspaceStatusEnum("status").default("DRAFT").notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  ...timestamps,
}, (table) => [
  uniqueIndex("workspaces_slug_unique").on(table.slug),
  index("workspaces_status_idx").on(table.status, table.createdAt),
]);

export const workspaceMemberships = pgTable("workspace_memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "restrict" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  role: workspaceMembershipRoleEnum("role").default("MEMBER").notNull(),
  status: workspaceMembershipStatusEnum("status").default("INVITED").notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("workspace_memberships_workspace_user_unique").on(table.workspaceId, table.userId),
  index("workspace_memberships_user_status_idx").on(table.userId, table.status),
  index("workspace_memberships_workspace_status_idx").on(table.workspaceId, table.status),
]);

export const workspaceInvitations = pgTable("workspace_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: workspaceMembershipRoleEnum("role").notNull(),
  status: workspaceInvitationStatusEnum("status").default("PENDING").notNull(),
  tokenHash: text("token_hash").notNull(),
  invitedBy: uuid("invited_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  acceptedBy: uuid("accepted_by").references(() => users.id, { onDelete: "set null" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("workspace_invitations_token_unique").on(table.tokenHash),
  index("workspace_invitations_workspace_status_idx").on(table.workspaceId, table.status, table.createdAt),
  index("workspace_invitations_email_status_idx").on(table.email, table.status),
]);

export const workspaceBranding = pgTable("workspace_branding", {
  workspaceId: uuid("workspace_id").primaryKey().references(() => workspaces.id, { onDelete: "restrict" }),
  displayName: text("display_name").notNull(),
  logoUrl: text("logo_url"),
  accentColor: text("accent_color").default("#163d2d").notNull(),
  supportEmail: text("support_email"),
  whatsapp: text("whatsapp"),
  ...timestamps,
});

export const workspaceModules = pgTable("workspace_modules", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "restrict" }),
  moduleKey: text("module_key").notNull(),
  enabled: boolean("enabled").default(false).notNull(),
  settings: jsonb("settings").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("workspace_modules_workspace_key_unique").on(table.workspaceId, table.moduleKey),
  index("workspace_modules_workspace_enabled_idx").on(table.workspaceId, table.enabled),
]);

export const workspaceDomains = pgTable("workspace_domains", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "restrict" }),
  hostname: text("hostname").notNull(),
  status: workspaceDomainStatusEnum("status").default("PENDING").notNull(),
  verificationTokenHash: text("verification_token_hash").notNull(),
  verificationToken: text("verification_token"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  isPrimary: boolean("is_primary").default(false).notNull(),
  dnsStatus: text("dns_status").default("PENDING").notNull(),
  cnameTarget: text("cname_target"),
  dnsCheckedAt: timestamp("dns_checked_at", { withTimezone: true }),
  sslStatus: text("ssl_status").default("PENDING").notNull(),
  sslCheckedAt: timestamp("ssl_checked_at", { withTimezone: true }),
  lastError: text("last_error"),
  ...timestamps,
}, (table) => [
  uniqueIndex("workspace_domains_hostname_unique").on(table.hostname),
  index("workspace_domains_workspace_status_idx").on(table.workspaceId, table.status),
]);

export const legacyMerchantWorkspaceLinks = pgTable("legacy_merchant_workspace_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantProfileId: uuid("merchant_profile_id").notNull().references(() => merchantProfiles.id, { onDelete: "restrict" }),
  legacyMerchantUserId: uuid("legacy_merchant_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "restrict" }),
  ...timestamps,
}, (table) => [
  uniqueIndex("legacy_workspace_links_profile_unique").on(table.merchantProfileId),
  uniqueIndex("legacy_workspace_links_user_unique").on(table.legacyMerchantUserId),
  uniqueIndex("legacy_workspace_links_workspace_unique").on(table.workspaceId),
]);

export const platformSettings = pgTable("platform_settings", {
  id: integer("id").primaryKey().default(1),
  defaultPlatformFeeBps: integer("default_platform_fee_bps").default(0).notNull(),
  minimumPayoutAmount: integer("minimum_payout_amount").default(100000).notNull(),
  commissionBankName: text("commission_bank_name"),
  commissionAccountNumber: text("commission_account_number"),
  commissionAccountHolder: text("commission_account_holder"),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  ...timestamps,
});

export const platformFeatureFlags = pgTable("platform_feature_flags", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  rollout: featureFlagRolloutEnum("rollout").default("OFF").notNull(),
  audienceUserIds: jsonb("audience_user_ids").$type<string[]>().default([]).notNull(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  ...timestamps,
}, (table) => [index("platform_feature_flags_rollout_idx").on(table.rollout)]);

export const merchantPayoutAccounts = pgTable("merchant_payout_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bankName: text("bank_name").notNull(),
  accountNumber: text("account_number").notNull(),
  accountHolder: text("account_holder").notNull(),
  ...timestamps,
}, (table) => [uniqueIndex("merchant_payout_accounts_merchant_unique").on(table.merchantId)]);

export const merchantManualPaymentAccounts = pgTable("merchant_manual_payment_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bankName: text("bank_name").notNull(),
  accountNumber: text("account_number").notNull(),
  accountHolder: text("account_holder").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  ...timestamps,
}, (table) => [uniqueIndex("merchant_manual_payment_accounts_merchant_unique").on(table.merchantId)]);

export const merchantPayouts = pgTable("merchant_payouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  status: payoutStatusEnum("status").default("REQUESTED").notNull(),
  bankName: text("bank_name").notNull(),
  accountNumber: text("account_number").notNull(),
  accountHolder: text("account_holder").notNull(),
  merchantNote: text("merchant_note"),
  adminNote: text("admin_note"),
  transferReference: text("transfer_reference"),
  reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  index("merchant_payouts_merchant_idx").on(table.merchantId, table.createdAt),
  index("merchant_payouts_status_idx").on(table.status, table.createdAt),
]);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(), tokenHash: text("token_hash").notNull(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("sessions_token_unique").on(table.tokenHash), index("sessions_user_idx").on(table.userId)]);

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("password_reset_tokens_token_unique").on(table.tokenHash),
  index("password_reset_tokens_user_idx").on(table.userId, table.createdAt),
]);

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(), merchantId: uuid("merchant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(), slug: text("slug").notNull(), headline: text("headline").notNull(), description: text("description").notNull(),
  price: integer("price").notNull(), type: productTypeEnum("type").default("COURSE").notNull(),
  category: text("category").default("LAINNYA").notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  status: productStatusEnum("status").default("DRAFT").notNull(), ...timestamps,
}, (table) => [uniqueIndex("products_slug_unique").on(table.slug), index("products_merchant_idx").on(table.merchantId, table.status)]);

export const affiliatePrograms = pgTable("affiliate_programs", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  commissionBps: integer("commission_bps").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
}, (table) => [uniqueIndex("affiliate_programs_product_unique").on(table.productId)]);

export const affiliatePartners = pgTable("affiliate_partners", {
  id: uuid("id").primaryKey().defaultRandom(),
  programId: uuid("program_id").notNull().references(() => affiliatePrograms.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  status: text("status").default("ACTIVE").notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("affiliate_partners_program_user_unique").on(table.programId, table.userId),
  uniqueIndex("affiliate_partners_code_unique").on(table.code),
]);

export const affiliateCommissions = pgTable("affiliate_commissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  partnerId: uuid("partner_id").notNull().references(() => affiliatePartners.id, { onDelete: "restrict" }),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "restrict" }),
  amount: integer("amount").notNull(),
  status: text("status").default("PENDING").notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("affiliate_commissions_order_unique").on(table.orderId),
  index("affiliate_commissions_partner_idx").on(table.partnerId, table.status, table.createdAt),
]);

export const affiliateClicks = pgTable("affiliate_clicks", {
  id: uuid("id").primaryKey().defaultRandom(),
  partnerId: uuid("partner_id").notNull().references(() => affiliatePartners.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  visitorHash: text("visitor_hash").notNull(),
  referer: text("referer"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("affiliate_clicks_partner_created_idx").on(table.partnerId, table.createdAt),
  index("affiliate_clicks_product_created_idx").on(table.productId, table.createdAt),
]);

export const affiliatePayoutRequests = pgTable("affiliate_payout_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  amount: integer("amount").notNull(),
  bankName: text("bank_name").notNull(),
  accountNumber: text("account_number").notNull(),
  accountHolder: text("account_holder").notNull(),
  status: text("status").default("REQUESTED").notNull(),
  adminNote: text("admin_note"),
  reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  index("affiliate_payout_requests_user_idx").on(table.userId, table.createdAt),
  index("affiliate_payout_requests_status_idx").on(table.status, table.createdAt),
]);

export const productVariants = pgTable("product_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  stock: integer("stock"),
  position: integer("position").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("product_variants_position_unique").on(table.productId, table.position),
  index("product_variants_product_active_idx").on(table.productId, table.isActive),
]);

export const merchantCustomerRecords = pgTable("merchant_customer_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tags: jsonb("tags").$type<string[]>().default([]).notNull(),
  note: text("note"),
  ...timestamps,
}, (table) => [
  uniqueIndex("merchant_customer_records_unique").on(table.merchantId, table.customerId),
  index("merchant_customer_records_merchant_idx").on(table.merchantId, table.updatedAt),
]);

export const productFiles = pgTable("product_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  storageKey: text("storage_key").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("product_files_storage_unique").on(table.storageKey),
  index("product_files_product_idx").on(table.productId, table.createdAt),
]);

export const serviceProductFields = pgTable("service_product_fields", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  fieldKey: text("field_key").notNull(),
  label: text("label").notNull(),
  type: serviceFieldTypeEnum("type").default("TEXT").notNull(),
  required: boolean("required").default(false).notNull(),
  position: integer("position").notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("service_product_fields_key_unique").on(table.productId, table.fieldKey),
  uniqueIndex("service_product_fields_position_unique").on(table.productId, table.position),
]);

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
  template: landingTemplateEnum("template").default("EDITORIAL").notNull(),
  heroVideoUrl: text("hero_video_url"),
  instructorName: text("instructor_name"),
  instructorRole: text("instructor_role"),
  instructorBio: text("instructor_bio"),
  instructorImageUrl: text("instructor_image_url"),
  bonusesText: text("bonuses_text"),
  testimonialsText: text("testimonials_text"),
  faqText: text("faq_text"),
  guaranteeTitle: text("guarantee_title"),
  guaranteeText: text("guarantee_text"),
  compareAtPrice: integer("compare_at_price"),
  promoEndsAt: timestamp("promo_ends_at", { withTimezone: true }),
  facebookPixelId: text("facebook_pixel_id"),
  tiktokPixelId: text("tiktok_pixel_id"),
  draftData: jsonb("draft_data").$type<Record<string, unknown>>().default({}).notNull(),
  sectionOrder: jsonb("section_order").$type<string[]>().default(["AUDIENCE", "INSTRUCTOR", "CURRICULUM", "BONUSES", "TESTIMONIALS", "OFFER", "FAQ"]).notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [uniqueIndex("product_landing_pages_product_unique").on(table.productId)]);

export const coupons = pgTable("coupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  discountType: couponDiscountTypeEnum("discount_type").notNull(),
  discountValue: integer("discount_value").notNull(),
  maxRedemptions: integer("max_redemptions"),
  redemptionCount: integer("redemption_count").default(0).notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("coupons_product_code_unique").on(table.productId, table.code),
  index("coupons_product_active_idx").on(table.productId, table.isActive),
]);

export const productFunnels = pgTable("product_funnels", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  orderBumpProductId: uuid("order_bump_product_id").references(() => products.id, { onDelete: "set null" }),
  upsellProductId: uuid("upsell_product_id").references(() => products.id, { onDelete: "set null" }),
  downsellProductId: uuid("downsell_product_id").references(() => products.id, { onDelete: "set null" }),
  bumpHeadline: text("bump_headline"),
  bumpDescription: text("bump_description"),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
}, (table) => [uniqueIndex("product_funnels_product_unique").on(table.productId)]);

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
  marketingConsent: boolean("marketing_consent").default(false).notNull(),
  marketingConsentAt: timestamp("marketing_consent_at", { withTimezone: true }),
  marketingConsentSource: text("marketing_consent_source"),
  amount: integer("amount").notNull(), status: orderStatusEnum("status").default("PENDING").notNull(), xenditSessionId: text("xendit_invoice_id"),
  productVariantId: uuid("product_variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  productVariantName: text("product_variant_name"),
  affiliatePartnerId: uuid("affiliate_partner_id").references(() => affiliatePartners.id, { onDelete: "set null" }),
  subtotalAmount: integer("subtotal_amount"), discountAmount: integer("discount_amount").default(0).notNull(),
  couponId: uuid("coupon_id").references(() => coupons.id, { onDelete: "set null" }), couponCode: text("coupon_code"),
  orderBumpProductId: uuid("order_bump_product_id").references(() => products.id, { onDelete: "set null" }), orderBumpAmount: integer("order_bump_amount").default(0).notNull(),
  utmSource: text("utm_source"), utmMedium: text("utm_medium"), utmCampaign: text("utm_campaign"),
  xenditPaymentUrl: text("xendit_invoice_url"), xenditPaymentId: text("xendit_payment_id"), paymentMethod: text("payment_method"),
  manualProofUrl: text("manual_proof_url"), manualBankName: text("manual_bank_name"), manualAccountName: text("manual_account_name"),
  manualTransferNote: text("manual_transfer_note"), manualSubmittedAt: timestamp("manual_submitted_at", { withTimezone: true }),
  settlementMode: paymentSettlementModeEnum("settlement_mode").default("PLATFORM").notNull(),
  manualDestinationBank: text("manual_destination_bank"), manualDestinationAccount: text("manual_destination_account"),
  manualDestinationHolder: text("manual_destination_holder"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }), reviewedBy: uuid("reviewed_by").references(() => users.id),
  platformFeeBps: integer("platform_fee_bps"), platformFeeAmount: integer("platform_fee_amount"), merchantNetAmount: integer("merchant_net_amount"),
  paidAt: timestamp("paid_at", { withTimezone: true }), webhookPayload: jsonb("webhook_payload"), ...timestamps,
  refundedAt: timestamp("refunded_at", { withTimezone: true }), refundAmount: integer("refund_amount"), refundReference: text("refund_reference"),
  refundReason: text("refund_reason"), refundedBy: uuid("refunded_by").references(() => users.id, { onDelete: "set null" }),
}, (table) => [uniqueIndex("orders_external_unique").on(table.externalId), uniqueIndex("orders_invoice_unique").on(table.xenditSessionId), index("orders_product_idx").on(table.productId, table.status)]);

export const productReviews = pgTable("product_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  title: text("title"),
  content: text("content").notNull(),
  status: text("status").default("PUBLISHED").notNull(),
  merchantReply: text("merchant_reply"),
  repliedAt: timestamp("replied_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("product_reviews_order_unique").on(table.orderId),
  index("product_reviews_product_status_idx").on(table.productId, table.status, table.createdAt),
  index("product_reviews_customer_idx").on(table.customerId, table.createdAt),
]);

export const productReports = pgTable("product_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  reporterId: uuid("reporter_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  reason: text("reason").notNull(),
  details: text("details").notNull(),
  status: text("status").default("OPEN").notNull(),
  adminNote: text("admin_note"),
  reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  index("product_reports_product_status_idx").on(table.productId, table.status),
  index("product_reports_status_created_idx").on(table.status, table.createdAt),
]);

export const bookingSlots = pgTable("booking_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  capacity: integer("capacity").default(1).notNull(),
  bookedCount: integer("booked_count").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
}, (table) => [index("booking_slots_product_start_idx").on(table.productId, table.startsAt)]);

export const bookingAppointments = pgTable("booking_appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  slotId: uuid("slot_id").notNull().references(() => bookingSlots.id, { onDelete: "restrict" }),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").default("CONFIRMED").notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("booking_appointments_order_unique").on(table.orderId),
  index("booking_appointments_customer_idx").on(table.customerId, table.createdAt),
]);

export const productSubscriptions = pgTable("product_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  customerId: uuid("customer_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "restrict" }),
  intervalMonths: integer("interval_months").default(1).notNull(),
  status: text("status").default("ACTIVE").notNull(),
  renewsAt: timestamp("renews_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  externalSubscriptionId: text("external_subscription_id"),
  ...timestamps,
}, (table) => [
  index("product_subscriptions_customer_idx").on(table.customerId, table.status),
  index("product_subscriptions_product_idx").on(table.productId, table.status),
]);

export const serviceCases = pgTable("service_cases", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  merchantId: uuid("merchant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").references(() => users.id, { onDelete: "set null" }),
  status: serviceCaseStatusEnum("status").default("WAITING_PAYMENT").notNull(),
  assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
  intakeData: jsonb("intake_data").$type<Record<string, string>>().default({}).notNull(),
  targetDate: timestamp("target_date", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("service_cases_order_unique").on(table.orderId),
  index("service_cases_merchant_status_idx").on(table.merchantId, table.status, table.updatedAt),
  index("service_cases_customer_idx").on(table.customerId, table.updatedAt),
]);

export const serviceCaseNotes = pgTable("service_case_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceCaseId: uuid("service_case_id").notNull().references(() => serviceCases.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  visibility: serviceNoteVisibilityEnum("visibility").default("CLIENT").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("service_case_notes_case_idx").on(table.serviceCaseId, table.createdAt)]);

export const serviceDocuments = pgTable("service_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceCaseId: uuid("service_case_id").notNull().references(() => serviceCases.id, { onDelete: "cascade" }),
  uploadedBy: uuid("uploaded_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  audience: serviceDocumentAudienceEnum("audience").notNull(),
  label: text("label").notNull(),
  fileName: text("file_name").notNull(),
  storageKey: text("storage_key").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("service_documents_storage_unique").on(table.storageKey),
  index("service_documents_case_idx").on(table.serviceCaseId, table.createdAt),
]);

export const couponRedemptions = pgTable("coupon_redemptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  couponId: uuid("coupon_id").notNull().references(() => coupons.id, { onDelete: "cascade" }),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").references(() => users.id, { onDelete: "set null" }),
  discountAmount: integer("discount_amount").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("coupon_redemptions_order_unique").on(table.orderId),
  index("coupon_redemptions_coupon_idx").on(table.couponId, table.createdAt),
]);

export const analyticsEvents = pgTable("analytics_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  event: analyticsEventEnum("event").notNull(),
  visitorId: text("visitor_id"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("analytics_events_product_event_idx").on(table.productId, table.event, table.createdAt),
  uniqueIndex("analytics_events_order_purchase_unique").on(table.orderId, table.event),
]);

export const merchantLedgerEntries = pgTable("merchant_ledger_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  payoutId: uuid("payout_id").references(() => merchantPayouts.id, { onDelete: "set null" }),
  type: ledgerEntryTypeEnum("type").notNull(),
  amount: integer("amount").notNull(),
  description: text("description").notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("merchant_ledger_entries_merchant_idx").on(table.merchantId, table.createdAt),
  uniqueIndex("merchant_ledger_entries_order_type_unique").on(table.orderId, table.type),
  uniqueIndex("merchant_ledger_entries_payout_type_unique").on(table.payoutId, table.type),
]);

export const platformReceivableEntries = pgTable("platform_receivable_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  type: platformReceivableEntryTypeEnum("type").notNull(),
  amount: integer("amount").notNull(),
  description: text("description").notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("platform_receivable_entries_merchant_idx").on(table.merchantId, table.createdAt),
  uniqueIndex("platform_receivable_entries_order_type_unique").on(table.orderId, table.type),
]);

export const commissionPayments = pgTable("commission_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  amount: integer("amount").notNull(),
  proofFileName: text("proof_file_name").notNull(),
  destinationBank: text("destination_bank").notNull(),
  destinationAccount: text("destination_account").notNull(),
  destinationHolder: text("destination_holder").notNull(),
  merchantNote: text("merchant_note"),
  status: commissionPaymentStatusEnum("status").default("SUBMITTED").notNull(),
  adminNote: text("admin_note"),
  reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  index("commission_payments_merchant_idx").on(table.merchantId, table.createdAt),
  index("commission_payments_status_idx").on(table.status, table.createdAt),
]);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "restrict" }),
  requestId: text("request_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("audit_logs_created_idx").on(table.createdAt),
  index("audit_logs_workspace_created_idx").on(table.workspaceId, table.createdAt),
]);

export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: text("provider").default("XENDIT").notNull(),
  fingerprint: text("fingerprint").notNull(),
  requestId: text("request_id").notNull(),
  eventName: text("event_name"),
  externalId: text("external_id"),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  status: webhookProcessingStatusEnum("status").default("RECEIVED").notNull(),
  responseStatus: integer("response_status"),
  payload: jsonb("payload"),
  errorMessage: text("error_message"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("webhook_events_fingerprint_unique").on(table.provider, table.fingerprint),
  index("webhook_events_created_idx").on(table.createdAt),
  index("webhook_events_order_idx").on(table.orderId, table.createdAt),
  index("webhook_events_status_idx").on(table.status, table.createdAt),
]);

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").default(1).notNull(),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).defaultNow().notNull(),
  blockedUntil: timestamp("blocked_until", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("rate_limits_blocked_idx").on(table.blockedUntil), index("rate_limits_updated_idx").on(table.updatedAt)]);

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

export const inAppNotifications = pgTable("in_app_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  href: text("href"),
  dedupeKey: text("dedupe_key"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("in_app_notifications_user_idx").on(table.userId, table.readAt, table.createdAt),
  uniqueIndex("in_app_notifications_dedupe_unique").on(table.dedupeKey),
]);

export const enrollments = pgTable("enrollments", {
  id: uuid("id").primaryKey().defaultRandom(), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }), orderId: uuid("order_id").notNull().references(() => orders.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("enrollments_user_course_unique").on(table.userId, table.courseId), index("enrollments_order_idx").on(table.orderId)]);

export const communitySpaces = pgTable("community_spaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id").references(() => users.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(), description: text("description"), isArchived: boolean("is_archived").default(false).notNull(), ...timestamps,
}, (table) => [
  index("community_spaces_merchant_idx").on(table.merchantId, table.isArchived),
  index("community_spaces_product_idx").on(table.productId, table.isArchived),
]);

export const communityPosts = pgTable("community_posts", {
  id: uuid("id").primaryKey().defaultRandom(), authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  spaceId: uuid("space_id").references(() => communitySpaces.id, { onDelete: "cascade" }),
  title: text("title").notNull(), content: text("content").notNull(), imageStorageKey: text("image_storage_key"),
  isPinned: boolean("is_pinned").default(false).notNull(), isHidden: boolean("is_hidden").default(false).notNull(),
  hiddenBy: uuid("hidden_by").references(() => users.id, { onDelete: "set null" }), hiddenAt: timestamp("hidden_at", { withTimezone: true }), ...timestamps,
}, (table) => [index("community_posts_created_idx").on(table.createdAt), index("community_posts_space_idx").on(table.spaceId, table.isPinned, table.createdAt)]);

export const communityComments = pgTable("community_comments", {
  id: uuid("id").primaryKey().defaultRandom(), postId: uuid("post_id").notNull().references(() => communityPosts.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }), content: text("content").notNull(),
  isHidden: boolean("is_hidden").default(false).notNull(), hiddenBy: uuid("hidden_by").references(() => users.id, { onDelete: "set null" }),
  hiddenAt: timestamp("hidden_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("community_comments_post_idx").on(table.postId, table.createdAt)]);

export const communityReactions = pgTable("community_reactions", {
  id: uuid("id").primaryKey().defaultRandom(), postId: uuid("post_id").notNull().references(() => communityPosts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), reaction: text("reaction").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("community_reactions_post_user_unique").on(table.postId, table.userId), index("community_reactions_post_idx").on(table.postId)]);

export const communityReports = pgTable("community_reports", {
  id: uuid("id").primaryKey().defaultRandom(), reporterId: uuid("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  postId: uuid("post_id").references(() => communityPosts.id, { onDelete: "cascade" }),
  commentId: uuid("comment_id").references(() => communityComments.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(), status: communityReportStatusEnum("status").default("OPEN").notNull(),
  reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }), reviewedAt: timestamp("reviewed_at", { withTimezone: true }), ...timestamps,
}, (table) => [index("community_reports_status_idx").on(table.status, table.createdAt), index("community_reports_post_idx").on(table.postId)]);

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(), merchantId: uuid("merchant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").notNull().references(() => users.id, { onDelete: "cascade" }), productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  ...timestamps,
}, (table) => [uniqueIndex("conversations_participants_product_unique").on(table.merchantId, table.memberId, table.productId), index("conversations_merchant_idx").on(table.merchantId, table.updatedAt), index("conversations_member_idx").on(table.memberId, table.updatedAt)]);

export const conversationMessages = pgTable("conversation_messages", {
  id: uuid("id").primaryKey().defaultRandom(), conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }), body: text("body").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("conversation_messages_conversation_idx").on(table.conversationId, table.createdAt), index("conversation_messages_unread_idx").on(table.conversationId, table.readAt)]);

export const automationRules = pgTable("automation_rules", {
  id: uuid("id").primaryKey().defaultRandom(), merchantId: uuid("merchant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }), name: text("name").notNull(),
  trigger: automationTriggerEnum("trigger").notNull(), sendEmail: boolean("send_email").default(true).notNull(), sendWhatsapp: boolean("send_whatsapp").default(false).notNull(),
  emailSubject: text("email_subject"), messageTemplate: text("message_template").notNull(), isActive: boolean("is_active").default(true).notNull(), ...timestamps,
}, (table) => [index("automation_rules_merchant_trigger_idx").on(table.merchantId, table.trigger, table.isActive)]);

export const automationDeliveries = pgTable("automation_deliveries", {
  id: uuid("id").primaryKey().defaultRandom(), ruleId: uuid("rule_id").notNull().references(() => automationRules.id, { onDelete: "cascade" }),
  sourceKey: text("source_key").notNull(), userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  channel: notificationChannelEnum("channel").notNull(), recipient: text("recipient").notNull(), provider: text("provider").notNull(),
  status: notificationStatusEnum("status").default("PENDING").notNull(), attemptCount: integer("attempt_count").default(0).notNull(),
  responseCode: integer("response_code"), providerResponse: jsonb("provider_response"), errorMessage: text("error_message"), sentAt: timestamp("sent_at", { withTimezone: true }), ...timestamps,
}, (table) => [uniqueIndex("automation_deliveries_rule_source_channel_unique").on(table.ruleId, table.sourceKey, table.channel), index("automation_deliveries_status_idx").on(table.status, table.createdAt)]);

export const broadcastCampaigns = pgTable("broadcast_campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  audience: text("audience").notNull(),
  subject: text("subject"),
  message: text("message").notNull(),
  sendEmail: boolean("send_email").default(true).notNull(),
  sendWhatsapp: boolean("send_whatsapp").default(false).notNull(),
  status: text("status").default("DRAFT").notNull(),
  recipientCount: integer("recipient_count").default(0).notNull(),
  sentCount: integer("sent_count").default(0).notNull(),
  failedCount: integer("failed_count").default(0).notNull(),
  recipientLimit: integer("recipient_limit").default(100).notNull(),
  queuedAt: timestamp("queued_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  index("broadcast_campaigns_merchant_idx").on(table.merchantId, table.createdAt),
  index("broadcast_campaigns_status_idx").on(table.status, table.createdAt),
]);

export const broadcastDeliveries = pgTable("broadcast_deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id").notNull().references(() => broadcastCampaigns.id, { onDelete: "cascade" }),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  channel: notificationChannelEnum("channel").notNull(),
  recipient: text("recipient").notNull(),
  recipientName: text("recipient_name"),
  productName: text("product_name"),
  actionUrl: text("action_url"),
  provider: text("provider").notNull(),
  status: notificationStatusEnum("status").default("PENDING").notNull(),
  attemptCount: integer("attempt_count").default(0).notNull(),
  responseCode: integer("response_code"),
  providerResponse: jsonb("provider_response"),
  errorMessage: text("error_message"),
  consentCapturedAt: timestamp("consent_captured_at", { withTimezone: true }).notNull(),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("broadcast_deliveries_campaign_channel_recipient_unique").on(table.campaignId, table.channel, table.recipient),
  index("broadcast_deliveries_campaign_status_idx").on(table.campaignId, table.status),
  index("broadcast_deliveries_queue_idx").on(table.status, table.nextAttemptAt, table.createdAt),
]);

export const broadcastDeliveryAttempts = pgTable("broadcast_delivery_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  deliveryId: uuid("delivery_id").notNull().references(() => broadcastDeliveries.id, { onDelete: "cascade" }),
  attemptNumber: integer("attempt_number").notNull(),
  status: notificationStatusEnum("status").notNull(),
  responseCode: integer("response_code"),
  providerResponse: jsonb("provider_response"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("broadcast_delivery_attempts_number_unique").on(table.deliveryId, table.attemptNumber),
  index("broadcast_delivery_attempts_delivery_idx").on(table.deliveryId, table.createdAt),
]);

export const broadcastTemplates = pgTable("broadcast_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  subject: text("subject"),
  message: text("message").notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("broadcast_templates_merchant_name_unique").on(table.merchantId, table.name),
  index("broadcast_templates_merchant_idx").on(table.merchantId, table.updatedAt),
]);

export type User = typeof users.$inferSelect;
