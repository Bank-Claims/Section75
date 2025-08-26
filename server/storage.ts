import { type User, type InsertUser, type Claim, type InsertClaim, users, claims } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Claims methods
  createClaim(claim: InsertClaim): Promise<Claim>;
  getClaimById(id: string): Promise<Claim | undefined>;
  getClaimByNumber(claimNumber: string): Promise<Claim | undefined>;
  getAllClaims(): Promise<Claim[]>;
  updateClaimStatus(id: string, status: string): Promise<Claim | undefined>;
  updateClaimEvidenceFiles(id: string, files: any[]): Promise<Claim | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createClaim(insertClaim: InsertClaim): Promise<Claim> {
    // Generate unique claim number
    const claimNumber = `CLM-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    
    const [claim] = await db
      .insert(claims)
      .values({
        ...insertClaim,
        claimNumber,
      })
      .returning();
    return claim;
  }

  async getClaimById(id: string): Promise<Claim | undefined> {
    const [claim] = await db.select().from(claims).where(eq(claims.id, id));
    return claim || undefined;
  }

  async getClaimByNumber(claimNumber: string): Promise<Claim | undefined> {
    const [claim] = await db.select().from(claims).where(eq(claims.claimNumber, claimNumber));
    return claim || undefined;
  }

  async getAllClaims(): Promise<Claim[]> {
    return await db.select().from(claims).orderBy(desc(claims.createdAt));
  }

  async updateClaimStatus(id: string, status: string): Promise<Claim | undefined> {
    const [claim] = await db
      .update(claims)
      .set({ status, updatedAt: new Date() })
      .where(eq(claims.id, id))
      .returning();
    return claim || undefined;
  }

  async updateClaimEvidenceFiles(id: string, files: any[]): Promise<Claim | undefined> {
    const [claim] = await db
      .update(claims)
      .set({ evidenceFiles: files, updatedAt: new Date() })
      .where(eq(claims.id, id))
      .returning();
    return claim || undefined;
  }
}

export const storage = new DatabaseStorage();
