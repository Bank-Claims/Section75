import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const claims = pgTable("claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  claimNumber: text("claim_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  accountNumber: text("account_number").notNull(),
  transactionAmount: decimal("transaction_amount", { precision: 10, scale: 2 }).notNull(),
  transactionDate: timestamp("transaction_date").notNull(),
  merchantName: text("merchant_name").notNull(),
  description: text("description").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"),
  claimClass: text("claim_class").notNull(),
  eligibilityChecks: jsonb("eligibility_checks").notNull(),
  isEligible: boolean("is_eligible").notNull().default(false),
  evidenceFiles: jsonb("evidence_files").default([]),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertClaimSchema = createInsertSchema(claims).omit({
  id: true,
  claimNumber: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Claim = typeof claims.$inferSelect;
export type InsertClaim = z.infer<typeof insertClaimSchema>;

// Section 75 eligibility check schema
export const eligibilityCheckSchema = z.object({
  transactionType: z.object({
    isPurchaseOfGoodsOrServices: z.boolean(),
    isNotRestrictedTransaction: z.boolean(),
  }),
  purchaseMethod: z.object({
    wasCreditCardUsed: z.boolean(),
    wasNotCashOrTransfer: z.boolean(),
  }),
  transactionValue: z.object({
    overHundredPounds: z.boolean(),
    underThirtyThousandPounds: z.boolean(),
  }),
  timePeriod: z.object({
    withinSixYears: z.boolean(),
  }),
  reasonForClaim: z.object({
    isValidReason: z.boolean(),
    isNotChangeOfMind: z.boolean(),
  }),
});

export type EligibilityCheck = z.infer<typeof eligibilityCheckSchema>;
