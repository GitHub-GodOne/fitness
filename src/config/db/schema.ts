import {
  boolean,
  index,
  integer,
  pgSchema,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { envConfigs } from "@/config";

const schemaName = (envConfigs.db_schema || "public").trim();
// Drizzle forbids pgSchema('public'); for public schema use pgTable().
// For non-public schema (e.g. 'web'), use pgSchema(name).table() to generate "schema"."table".
const customSchema =
  schemaName && schemaName !== "public" ? pgSchema(schemaName) : null;
const table: typeof pgTable = customSchema
  ? (customSchema.table.bind(customSchema) as unknown as typeof pgTable)
  : pgTable;

export const user = table(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    // Track first-touch acquisition channel (e.g. google, twitter, newsletter)
    utmSource: text("utm_source").notNull().default(""),
    ip: text("ip").notNull().default(""),
    locale: text("locale").notNull().default(""),
  },
  (table) => [
    // Search users by name in admin dashboard
    index("idx_user_name").on(table.name),
    // Order users by registration time for latest users list
    index("idx_user_created_at").on(table.createdAt),
  ],
);

export const session = table(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    // Composite: Query user sessions and filter by expiration
    // Can also be used for: WHERE userId = ? (left-prefix)
    index("idx_session_user_expires").on(table.userId, table.expiresAt),
  ],
);

export const account = table(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Query all linked accounts for a user
    index("idx_account_user_id").on(table.userId),
    // Composite: OAuth login (most critical)
    // Can also be used for: WHERE providerId = ? (left-prefix)
    index("idx_account_provider_account").on(table.providerId, table.accountId),
  ],
);

export const verification = table(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Find verification code by identifier (e.g., find code by email)
    index("idx_verification_identifier").on(table.identifier),
  ],
);

export const config = table("config", {
  name: text("name").unique().notNull(),
  value: text("value"),
});

export const i18nMessage = table(
  "i18n_message",
  {
    id: text("id").primaryKey(),
    locale: text("locale").notNull(),
    namespace: text("namespace").notNull(),
    key: text("key").notNull(),
    value: text("value").notNull(),
    updatedBy: text("updated_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("idx_i18n_message_locale_namespace_key").on(
      table.locale,
      table.namespace,
      table.key,
    ),
    index("idx_i18n_message_locale_namespace").on(
      table.locale,
      table.namespace,
    ),
  ],
);

export const pageOverride = table(
  "page_override",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    locale: text("locale").notNull(),
    title: text("title"),
    description: text("description"),
    content: text("content"),
    updatedBy: text("updated_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("idx_page_override_locale_slug").on(table.locale, table.slug),
    index("idx_page_override_locale").on(table.locale),
  ],
);

export const customHtmlPage = table(
  "custom_html_page",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    locale: text("locale").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    title: text("title"),
    description: text("description"),
    html: text("html").notNull(),
    updatedBy: text("updated_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("idx_custom_html_page_locale_slug").on(table.locale, table.slug),
    index("idx_custom_html_page_locale").on(table.locale),
  ],
);

export const customHtmlPageRevision = table(
  "custom_html_page_revision",
  {
    id: text("id").primaryKey(),
    pageId: text("page_id")
      .notNull()
      .references(() => customHtmlPage.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    locale: text("locale").notNull(),
    title: text("title"),
    description: text("description"),
    html: text("html").notNull(),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_custom_html_page_revision_page_created_at").on(
      table.pageId,
      table.createdAt,
    ),
  ],
);

export const taxonomy = table(
  "taxonomy",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    parentId: text("parent_id"),
    slug: text("slug").unique().notNull(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    seoKeywords: text("seo_keywords"),
    targetUrl: text("target_url"),
    image: text("image"),
    icon: text("icon"),
    status: text("status").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
    sort: integer("sort").default(0).notNull(),
  },
  (table) => [
    // Composite: Query taxonomies by type and status
    // Can also be used for: WHERE type = ? (left-prefix)
    index("idx_taxonomy_type_status").on(table.type, table.status),
  ],
);

export const post = table(
  "post",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    parentId: text("parent_id"),
    slug: text("slug").unique().notNull(),
    type: text("type").notNull(),
    title: text("title"),
    description: text("description"),
    image: text("image"),
    content: text("content"),
    categories: text("categories"),
    tags: text("tags"),
    authorName: text("author_name"),
    authorImage: text("author_image"),
    status: text("status").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
    sort: integer("sort").default(0).notNull(),
  },
  (table) => [
    // Composite: Query posts by type and status
    // Can also be used for: WHERE type = ? (left-prefix)
    index("idx_post_type_status").on(table.type, table.status),
  ],
);

export const order = table(
  "order",
  {
    id: text("id").primaryKey(),
    orderNo: text("order_no").unique().notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    userEmail: text("user_email"), // checkout user email
    status: text("status").notNull(), // created, paid, failed
    amount: integer("amount").notNull(), // checkout amount in cents
    currency: text("currency").notNull(), // checkout currency
    productId: text("product_id"),
    paymentType: text("payment_type"), // one_time, subscription
    paymentInterval: text("payment_interval"), // day, week, month, year
    paymentProvider: text("payment_provider").notNull(),
    paymentSessionId: text("payment_session_id"),
    checkoutInfo: text("checkout_info").notNull(), // checkout request info
    checkoutResult: text("checkout_result"), // checkout result
    paymentResult: text("payment_result"), // payment result
    discountCode: text("discount_code"), // discount code
    discountAmount: integer("discount_amount"), // discount amount in cents
    discountCurrency: text("discount_currency"), // discount currency
    paymentEmail: text("payment_email"), // actual payment email
    paymentAmount: integer("payment_amount"), // actual payment amount
    paymentCurrency: text("payment_currency"), // actual payment currency
    paidAt: timestamp("paid_at"), // paid at
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
    description: text("description"), // order description
    productName: text("product_name"), // product name
    subscriptionId: text("subscription_id"), // provider subscription id
    subscriptionResult: text("subscription_result"), // provider subscription result
    checkoutUrl: text("checkout_url"), // checkout url
    callbackUrl: text("callback_url"), // callback url, after handle callback
    creditsAmount: integer("credits_amount"), // credits amount
    creditsValidDays: integer("credits_valid_days"), // credits validity days
    planName: text("plan_name"), // subscription plan name
    paymentProductId: text("payment_product_id"), // payment product id
    invoiceId: text("invoice_id"),
    invoiceUrl: text("invoice_url"),
    subscriptionNo: text("subscription_no"), // order subscription no
    transactionId: text("transaction_id"), // payment transaction id
    paymentUserName: text("payment_user_name"), // payment user name
    paymentUserId: text("payment_user_id"), // payment user id
  },
  (table) => [
    // Composite: Query user orders by status (most common)
    // Can also be used for: WHERE userId = ? (left-prefix)
    index("idx_order_user_status_payment_type").on(
      table.userId,
      table.status,
      table.paymentType,
    ),
    // Composite: Prevent duplicate payments
    // Can also be used for: WHERE transactionId = ? (left-prefix)
    index("idx_order_transaction_provider").on(
      table.transactionId,
      table.paymentProvider,
    ),
    // Order orders by creation time for listing
    index("idx_order_created_at").on(table.createdAt),
  ],
);

export const subscription = table(
  "subscription",
  {
    id: text("id").primaryKey(),
    subscriptionNo: text("subscription_no").unique().notNull(), // subscription no
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    userEmail: text("user_email"), // subscription user email
    status: text("status").notNull(), // subscription status
    paymentProvider: text("payment_provider").notNull(),
    subscriptionId: text("subscription_id").notNull(), // provider subscription id
    subscriptionResult: text("subscription_result"), // provider subscription result
    productId: text("product_id"), // product id
    description: text("description"), // subscription description
    amount: integer("amount"), // subscription amount
    currency: text("currency"), // subscription currency
    interval: text("interval"), // subscription interval, day, week, month, year
    intervalCount: integer("interval_count"), // subscription interval count
    trialPeriodDays: integer("trial_period_days"), // subscription trial period days
    currentPeriodStart: timestamp("current_period_start"), // subscription current period start
    currentPeriodEnd: timestamp("current_period_end"), // subscription current period end
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
    planName: text("plan_name"),
    billingUrl: text("billing_url"),
    productName: text("product_name"), // subscription product name
    creditsAmount: integer("credits_amount"), // subscription credits amount
    creditsValidDays: integer("credits_valid_days"), // subscription credits valid days
    paymentProductId: text("payment_product_id"), // subscription payment product id
    paymentUserId: text("payment_user_id"), // subscription payment user id
    canceledAt: timestamp("canceled_at"), // subscription canceled apply at
    canceledEndAt: timestamp("canceled_end_at"), // subscription canceled end at
    canceledReason: text("canceled_reason"), // subscription canceled reason
    canceledReasonType: text("canceled_reason_type"), // subscription canceled reason type
  },
  (table) => [
    // Composite: Query user's subscriptions by status (most common)
    // Can also be used for: WHERE userId = ? (left-prefix)
    index("idx_subscription_user_status_interval").on(
      table.userId,
      table.status,
      table.interval,
    ),
    // Composite: Prevent duplicate subscriptions
    // Can also be used for: WHERE paymentProvider = ? (left-prefix)
    index("idx_subscription_provider_id").on(
      table.subscriptionId,
      table.paymentProvider,
    ),
    // Order subscriptions by creation time for listing
    index("idx_subscription_created_at").on(table.createdAt),
  ],
);

export const credit = table(
  "credit",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }), // user id
    userEmail: text("user_email"), // user email
    orderNo: text("order_no"), // payment order no
    subscriptionNo: text("subscription_no"), // subscription no
    transactionNo: text("transaction_no").unique().notNull(), // transaction no
    transactionType: text("transaction_type").notNull(), // transaction type, grant / consume
    transactionScene: text("transaction_scene"), // transaction scene, payment / subscription / gift / award
    credits: integer("credits").notNull(), // credits amount, n or -n
    remainingCredits: integer("remaining_credits").notNull().default(0), // remaining credits amount
    description: text("description"), // transaction description
    expiresAt: timestamp("expires_at"), // transaction expires at
    status: text("status").notNull(), // transaction status
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
    consumedDetail: text("consumed_detail"), // consumed detail
    metadata: text("metadata"), // transaction metadata
  },
  (table) => [
    // Critical composite index for credit consumption (FIFO queue)
    // Query: WHERE userId = ? AND transactionType = 'grant' AND status = 'active'
    //        AND remainingCredits > 0 ORDER BY expiresAt
    // Can also be used for: WHERE userId = ? (left-prefix)
    index("idx_credit_consume_fifo").on(
      table.userId,
      table.status,
      table.transactionType,
      table.remainingCredits,
      table.expiresAt,
    ),
    // Query credits by order number
    index("idx_credit_order_no").on(table.orderNo),
    // Query credits by subscription number
    index("idx_credit_subscription_no").on(table.subscriptionNo),
  ],
);

export const apikey = table(
  "apikey",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    title: text("title").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    // Composite: Query user's API keys by status
    // Can also be used for: WHERE userId = ? (left-prefix)
    index("idx_apikey_user_status").on(table.userId, table.status),
    // Composite: Validate active API key (most common for auth)
    // Can also be used for: WHERE key = ? (left-prefix)
    index("idx_apikey_key_status").on(table.key, table.status),
  ],
);

// RBAC Tables
export const role = table(
  "role",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull().unique(), // admin, editor, viewer
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    sort: integer("sort").default(0).notNull(),
  },
  (table) => [
    // Query active roles
    index("idx_role_status").on(table.status),
  ],
);

export const permission = table(
  "permission",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull().unique(), // admin.users.read, admin.posts.write
    resource: text("resource").notNull(), // users, posts, categories
    action: text("action").notNull(), // read, write, delete
    title: text("title").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Composite: Query permissions by resource and action
    // Can also be used for: WHERE resource = ? (left-prefix)
    index("idx_permission_resource_action").on(table.resource, table.action),
  ],
);

export const rolePermission = table(
  "role_permission",
  {
    id: text("id").primaryKey(),
    roleId: text("role_id")
      .notNull()
      .references(() => role.id, { onDelete: "cascade" }),
    permissionId: text("permission_id")
      .notNull()
      .references(() => permission.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    // Composite: Query permissions for a role
    // Can also be used for: WHERE roleId = ? (left-prefix)
    index("idx_role_permission_role_permission").on(
      table.roleId,
      table.permissionId,
    ),
  ],
);

export const userRole = table(
  "user_role",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    roleId: text("role_id")
      .notNull()
      .references(() => role.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    expiresAt: timestamp("expires_at"),
  },
  (table) => [
    // Composite: Query user's active roles (most critical for auth)
    // Can also be used for: WHERE userId = ? (left-prefix)
    index("idx_user_role_user_expires").on(table.userId, table.expiresAt),
  ],
);

export const aiTask = table(
  "ai_task",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    mediaType: text("media_type").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    prompt: text("prompt").notNull(),
    options: text("options"),
    status: text("status").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
    taskId: text("task_id"), // provider task id
    taskInfo: text("task_info"), // provider task info
    taskResult: text("task_result"), // provider task result
    costCredits: integer("cost_credits").notNull().default(0),
    scene: text("scene").notNull().default(""),
    creditId: text("credit_id"), // credit consumption record id
  },
  (table) => [
    // Composite: Query user's AI tasks by status
    // Can also be used for: WHERE userId = ? (left-prefix)
    index("idx_ai_task_user_media_type").on(table.userId, table.mediaType),
    // Composite: Query user's AI tasks by media type and provider
    // Can also be used for: WHERE mediaType = ? AND provider = ? (left-prefix)
    index("idx_ai_task_media_type_status").on(table.mediaType, table.status),
  ],
);

export const chat = table(
  "chat",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    model: text("model").notNull(),
    provider: text("provider").notNull(),
    title: text("title").notNull().default(""),
    parts: text("parts").notNull(),
    metadata: text("metadata"),
    content: text("content"),
  },
  (table) => [index("idx_chat_user_status").on(table.userId, table.status)],
);

export const chatMessage = table(
  "chat_message",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    chatId: text("chat_id")
      .notNull()
      .references(() => chat.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    role: text("role").notNull(),
    parts: text("parts").notNull(),
    metadata: text("metadata"),
    model: text("model").notNull(),
    provider: text("provider").notNull(),
  },
  (table) => [
    index("idx_chat_message_chat_id").on(table.chatId, table.status),
    index("idx_chat_message_user_id").on(table.userId, table.status),
  ],
);

export const comment = table(
  "comment",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    userName: text("user_name").notNull(), // For anonymous users
    userEmail: text("user_email").notNull(), // Required for anonymous
    userAvatar: text("user_avatar"), // User avatar URL
    content: text("content").notNull(),
    pageId: text("page_id"), // Page-scoped comments (e.g. showcase watch page)
    referencedTaskId: text("referenced_task_id").references(() => aiTask.id, {
      onDelete: "set null",
    }), // AI task reference
    referencedTaskType: text("referenced_task_type"), // video, image, etc
    referencedTaskUrl: text("referenced_task_url"), // Direct URL to content
    status: text("status").notNull().default("visible"), // visible, hidden, deleted
    visibility: text("visibility").notNull().default("public"), // public, private
    likes: integer("likes").notNull().default(0),
    replies: integer("replies").notNull().default(0), // Reply count cache
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    // Query comments by status and creation time
    index("idx_comment_status_created").on(table.status, table.createdAt),
    // Query comments by page scope
    index("idx_comment_page_status_created").on(
      table.pageId,
      table.status,
      table.createdAt,
    ),
    // Query comments by user
    index("idx_comment_user_id").on(table.userId),
    // Query by visibility
    index("idx_comment_visibility").on(table.visibility, table.status),
  ],
);

export const commentReply: any = table(
  "comment_reply",
  {
    id: text("id").primaryKey(),
    commentId: text("comment_id")
      .notNull()
      .references(() => comment.id, { onDelete: "cascade" }),
    parentReplyId: text("parent_reply_id").references(
      (): any => commentReply.id,
      {
        onDelete: "cascade",
      },
    ), // For nested replies
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    userName: text("user_name").notNull(),
    userEmail: text("user_email").notNull(),
    userAvatar: text("user_avatar"),
    content: text("content").notNull(),
    status: text("status").notNull().default("visible"),
    likes: integer("likes").notNull().default(0),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    // Query replies by comment
    index("idx_reply_comment_id").on(table.commentId, table.status),
    // Query replies by parent
    index("idx_reply_parent_id").on(table.parentReplyId),
    // Query by user
    index("idx_reply_user_id").on(table.userId),
  ],
);

export const commentLike = table(
  "comment_like",
  {
    id: text("id").primaryKey(),
    commentId: text("comment_id").references(() => comment.id, {
      onDelete: "cascade",
    }),
    replyId: text("reply_id").references(() => commentReply.id, {
      onDelete: "cascade",
    }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    ipAddress: text("ip_address"), // For anonymous likes
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // Prevent duplicate likes
    index("idx_like_comment_user").on(table.commentId, table.userId),
    index("idx_like_reply_user").on(table.replyId, table.userId),
  ],
);

export const refundRequest = table(
  "refund_request",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    userEmail: text("user_email").notNull(),
    userName: text("user_name"),
    reason: text("reason").notNull(), // refund reason
    account: text("account").notNull(), // account information for refund
    requestedCreditsAmount: integer("requested_credits_amount").notNull(), // requested credits amount
    approvedCreditsAmount: integer("approved_credits_amount"), // approved credits amount (can be modified by admin)
    deductedCreditsAmount: integer("deducted_credits_amount"), // credits deducted from user when refund is approved
    description: text("description"), // additional description
    status: text("status").notNull().default("pending"), // pending, completed, rejected
    remainingCredits: integer("remaining_credits"), // user's remaining credits at request time
    adminNotes: text("admin_notes"), // admin notes
    processedAt: timestamp("processed_at"), // processed at
    processedBy: text("processed_by"), // admin user id who processed
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    // Query user's refund requests
    index("idx_refund_request_user_id").on(table.userId),
    // Query refund requests by status
    index("idx_refund_request_status").on(table.status),
    // Order refund requests by creation time
    index("idx_refund_request_created_at").on(table.createdAt),
  ],
);

export const videoMerge = table(
  "video_merge",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    sourceVideoUrls: text("source_video_urls").notNull(), // JSON string array of source video URLs
    mergedVideoUrl: text("merged_video_url").notNull(), // URL of the merged video
    videoCount: integer("video_count").notNull().default(0), // Number of videos merged
    status: text("status").notNull().default("success"), // success, failed, processing
    error: text("error"), // Error message if merge failed
    metadata: text("metadata"), // Additional metadata (JSON string)
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    // Query merge history by user
    index("idx_video_merge_user_id").on(table.userId),
    // Query by status
    index("idx_video_merge_status").on(table.status),
    // Composite: Query user's merge history by creation time
    index("idx_video_merge_user_created").on(table.userId, table.createdAt),
  ],
);

export const showcaseVideo = table(
  "showcase_video",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    categoryId: text("category_id").references(() => taxonomy.id, {
      onDelete: "set null",
    }),
    sourceTaskId: text("source_task_id").references(() => aiTask.id, {
      onDelete: "set null",
    }),
    sourceType: text("source_type").notNull().default("generated"),
    title: text("title").notNull(),
    description: text("description"),
    seoKeywords: text("seo_keywords"),
    videoUrl: text("video_url").notNull(),
    coverUrl: text("cover_url"),
    status: text("status").notNull().default("pending"),
    featured: boolean("featured").notNull().default(false),
    sort: integer("sort").notNull().default(0),
    reviewNote: text("review_note"),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_showcase_video_status").on(table.status),
    index("idx_showcase_video_category_status").on(
      table.categoryId,
      table.status,
    ),
    index("idx_showcase_video_user_created").on(table.userId, table.createdAt),
  ],
);

export const mediaAsset = table(
  "media_asset",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("r2"),
    mediaType: text("media_type").notNull(),
    name: text("name").notNull(),
    key: text("key").notNull().unique(),
    url: text("url").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_media_asset_media_type_created").on(
      table.mediaType,
      table.createdAt,
    ),
    index("idx_media_asset_user_created").on(table.userId, table.createdAt),
  ],
);

export const notification = table(
  "notification",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // comment_reply, video_complete, image_complete, etc.
    title: text("title").notNull(),
    content: text("content").notNull(),
    link: text("link"), // Link to the related resource
    isRead: boolean("is_read").notNull().default(false),
    metadata: text("metadata"), // Additional data (JSON string)
    createdAt: timestamp("created_at").defaultNow().notNull(),
    readAt: timestamp("read_at"),
  },
  (table) => [
    // Query user's notifications ordered by creation time
    index("idx_notification_user_created").on(table.userId, table.createdAt),
    // Query unread notifications
    index("idx_notification_user_unread").on(table.userId, table.isRead),
    // Query by type
    index("idx_notification_type").on(table.type),
  ],
);

export const fitnessObject = table(
  "fitness_object",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    nameZh: text("name_zh"),
    aliases: text("aliases"),
    category: text("category").notNull(),
    description: text("description"),
    image: text("image"),
    status: text("status").notNull().default("active"),
    priority: integer("priority").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_fitness_object_name").on(table.name),
    index("idx_fitness_object_category").on(table.category),
    index("idx_fitness_object_status").on(table.status),
    index("idx_fitness_object_priority").on(table.priority),
  ],
);

export const bodyPart = table(
  "body_part",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    nameZh: text("name_zh"),
    icon: text("icon"),
    description: text("description"),
    status: text("status").notNull().default("active"),
    sort: integer("sort").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_body_part_name").on(table.name),
    index("idx_body_part_status").on(table.status),
  ],
);

export const fitnessVideoGroup = table(
  "fitness_video_group",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    titleZh: text("title_zh"),
    description: text("description"),
    descriptionZh: text("description_zh"),
    thumbnailUrl: text("thumbnail_url"),
    difficulty: text("difficulty").notNull().default("beginner"),
    gender: text("gender").notNull().default("unisex"),
    accessType: text("access_type").notNull().default("free"),
    ageGroup: text("age_group").notNull().default("all"),
    instructions: text("instructions"),
    instructionsZh: text("instructions_zh"),
    tags: text("tags"),
    status: text("status").notNull().default("active"),
    viewCount: integer("view_count").default(0).notNull(),
    sort: integer("sort").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("idx_fitness_video_group_status").on(table.status),
    index("idx_fitness_video_group_difficulty").on(table.difficulty),
    index("idx_fitness_video_group_gender").on(table.gender),
    index("idx_fitness_video_group_created").on(table.createdAt),
  ],
);

export const fitnessVideo = table(
  "fitness_video",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => fitnessVideoGroup.id, { onDelete: "cascade" }),
    viewAngle: text("view_angle").notNull(),
    viewAngleZh: text("view_angle_zh"),
    videoUrl: text("video_url").notNull(),
    duration: integer("duration"),
    sort: integer("sort").default(0).notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_fitness_video_group").on(table.groupId),
    index("idx_fitness_video_status").on(table.status),
  ],
);

export const objectVideoMapping = table(
  "object_video_mapping",
  {
    id: text("id").primaryKey(),
    objectId: text("object_id")
      .notNull()
      .references(() => fitnessObject.id, { onDelete: "cascade" }),
    videoGroupId: text("video_group_id")
      .notNull()
      .references(() => fitnessVideoGroup.id, { onDelete: "cascade" }),
    bodyPartId: text("body_part_id")
      .notNull()
      .references(() => bodyPart.id, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_object_video_object").on(table.objectId),
    index("idx_object_video_group").on(table.videoGroupId),
    index("idx_object_video_body_part").on(table.bodyPartId),
    index("idx_object_video_composite").on(table.objectId, table.bodyPartId),
  ],
);

export const userWizardProgress = table(
  "user_wizard_progress",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    voiceGender: text("voice_gender"),
    ageGroup: text("age_group"),
    difficulty: text("difficulty"),
    referenceImages: text("reference_images"),
    selectedBodyParts: text("selected_body_parts"),
    currentStep: integer("current_step").default(1).notNull(),
    aspectRatio: text("aspect_ratio").default("adaptive"),
    duration: integer("duration").default(12),
    generateAudio: boolean("generate_audio").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_wizard_progress_user").on(table.userId),
    index("idx_wizard_progress_updated").on(table.updatedAt),
  ],
);

export const supportChatMessage = table(
  "support_chat_message",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    type: text("type").notNull(), // user, admin
    status: text("status").notNull().default("active"), // active, deleted
    read: boolean("read").notNull().default(false), // For admin to track unread user messages
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    // Query messages by user ordered by time
    index("idx_support_chat_user_created").on(table.userId, table.createdAt),
    // Query unread messages for admin
    index("idx_support_chat_unread").on(table.type, table.read),
    // Query by status
    index("idx_support_chat_status").on(table.status),
  ],
);
