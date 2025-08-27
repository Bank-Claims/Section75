import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClaimSchema, eligibilityCheckSchema, type EligibilityCheck, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcrypt";
import session from "express-session";
import connectPg from "connect-pg-simple";
import multer, { type Multer } from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

// Extend session data type to include user info
declare module "express-session" {
  interface SessionData {
    userId: string;
    username: string;
    role: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up multer for file uploads
  const storage_multer = multer.diskStorage({
    destination: (req: any, file: any, cb: any) => {
      const evidencesDir = path.join(process.cwd(), 'evidences');
      if (!fs.existsSync(evidencesDir)) {
        fs.mkdirSync(evidencesDir, { recursive: true });
      }
      cb(null, evidencesDir);
    },
    filename: (req: any, file: any, cb: any) => {
      const uniqueName = `${randomUUID()}-${file.originalname}`;
      cb(null, uniqueName);
    }
  });

  const upload = multer({ 
    storage: storage_multer,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
      files: 10 // Max 10 files
    },
    fileFilter: (req: any, file: any, cb: any) => {
      const allowedTypes = /pdf|jpg|jpeg|png|gif|doc|docx/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      
      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only PDF, image, and document files are allowed'));
      }
    }
  });

  // Set up session middleware
  const pgStore = connectPg(session);
  app.use(
    session({
      store: new pgStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "default-secret-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  // Authentication middleware
  function requireAuth(req: any, res: any, next: any) {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  }

  function requireRole(roles: string[]) {
    return (req: any, res: any, next: any) => {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (!roles.includes(req.session.role)) {
        return res.status(403).json({ message: "Access denied" });
      }
      next();
    };
  }

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (password !== user.password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set session data
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;

      // Force session save
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Session save failed" });
        }

        res.json({
          message: "Login successful",
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
          },
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    res.json({
      id: req.session.userId,
      username: req.session.username,
      role: req.session.role,
    });
  });

  // Helper function to calculate claim classification
  function calculateClaimClass(amount: number): string {
    if (amount >= 100 && amount < 1000) return "Class 1";
    if (amount >= 1000 && amount < 5000) return "Class 2";
    if (amount >= 5000 && amount < 10000) return "Class 3";
    if (amount >= 10000 && amount <= 30000) return "Class 4";
    return "Unclassified";
  }

  // Helper function to perform Section 75 eligibility check
  function performEligibilityCheck(
    transactionAmount: number,
    transactionDate: Date,
    reason: string
  ): { checks: EligibilityCheck; isEligible: boolean } {
    const now = new Date();
    const sixYearsAgo = new Date(now.getTime() - (6 * 365 * 24 * 60 * 60 * 1000));
    const validReasons = ["faulty-goods", "misrepresentation", "non-delivery", "supplier-failure"];

    const checks: EligibilityCheck = {
      transactionType: {
        isPurchaseOfGoodsOrServices: true, // Assumed from form
        isNotRestrictedTransaction: true, // Assumed from form
      },
      purchaseMethod: {
        wasCreditCardUsed: true, // Assumed for Section 75
        wasNotCashOrTransfer: true, // Assumed for Section 75
      },
      transactionValue: {
        overHundredPounds: transactionAmount >= 100,
        underThirtyThousandPounds: transactionAmount <= 30000,
      },
      timePeriod: {
        withinSixYears: transactionDate >= sixYearsAgo,
      },
      reasonForClaim: {
        isValidReason: validReasons.includes(reason),
        isNotChangeOfMind: reason !== "change-of-mind",
      },
    };

    // Calculate if eligible based on all checks
    const isEligible = 
      checks.transactionType.isPurchaseOfGoodsOrServices &&
      checks.transactionType.isNotRestrictedTransaction &&
      checks.purchaseMethod.wasCreditCardUsed &&
      checks.purchaseMethod.wasNotCashOrTransfer &&
      checks.transactionValue.overHundredPounds &&
      checks.transactionValue.underThirtyThousandPounds &&
      checks.timePeriod.withinSixYears &&
      checks.reasonForClaim.isValidReason &&
      checks.reasonForClaim.isNotChangeOfMind;

    return { checks, isEligible };
  }

  // Local file upload endpoints
  app.post("/api/upload-evidence", upload.array('files', 10), async (req: any, res: any) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const uploadedFiles = req.files.map((file: any) => ({
        id: file.filename,
        name: file.originalname,
        url: `/api/evidence/${file.filename}`,
        size: file.size,
        type: file.mimetype
      }));

      res.json({ files: uploadedFiles });
    } catch (error) {
      console.error("Error uploading files:", error);
      res.status(500).json({ error: "Failed to upload files" });
    }
  });

  // Serve evidence files
  app.get("/api/evidence/:filename", (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(process.cwd(), 'evidences', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    res.sendFile(filePath);
  });

  // Claims API endpoints (Customer role can create claims)
  app.post("/api/claims", requireRole(["Customer"]), async (req, res) => {
    try {
      const validatedData = insertClaimSchema.parse(req.body);
      
      // Perform eligibility check
      const { checks, isEligible } = performEligibilityCheck(
        parseFloat(validatedData.transactionAmount),
        new Date(validatedData.transactionDate),
        validatedData.reason
      );

      // Calculate claim class
      const claimClass = calculateClaimClass(parseFloat(validatedData.transactionAmount));

      const claimData = {
        ...validatedData,
        claimClass,
        eligibilityChecks: checks,
        isEligible,
        status: "pending",
      };

      const claim = await storage.createClaim(claimData);
      res.json(claim);
    } catch (error) {
      console.error("Error creating claim:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid claim data", details: error.errors });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  app.get("/api/claims", requireRole(["Claim Processor"]), async (req, res) => {
    try {
      const claims = await storage.getAllClaims();
      res.json(claims);
    } catch (error) {
      console.error("Error fetching claims:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/claims/:id", async (req, res) => {
    try {
      const claim = await storage.getClaimById(req.params.id);
      if (!claim) {
        return res.status(404).json({ error: "Claim not found" });
      }
      res.json(claim);
    } catch (error) {
      console.error("Error fetching claim:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/claims/:id/status", requireRole(["Claim Processor"]), async (req, res) => {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      const claim = await storage.updateClaimStatus(req.params.id, status);
      if (!claim) {
        return res.status(404).json({ error: "Claim not found" });
      }

      res.json(claim);
    } catch (error) {
      console.error("Error updating claim status:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/claims/:id/evidence", async (req, res) => {
    try {
      const { files } = req.body;
      if (!Array.isArray(files)) {
        return res.status(400).json({ error: "Files must be an array" });
      }

      const claim = await storage.updateClaimEvidenceFiles(req.params.id, files);
      if (!claim) {
        return res.status(404).json({ error: "Claim not found" });
      }

      res.json(claim);
    } catch (error) {
      console.error("Error updating claim evidence:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Eligibility check endpoint
  app.post("/api/eligibility-check", async (req, res) => {
    try {
      const { transactionAmount, transactionDate, reason } = req.body;
      
      if (!transactionAmount || !transactionDate || !reason) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const { checks, isEligible } = performEligibilityCheck(
        parseFloat(transactionAmount),
        new Date(transactionDate),
        reason
      );

      const claimClass = calculateClaimClass(parseFloat(transactionAmount));

      res.json({
        checks,
        isEligible,
        claimClass,
      });
    } catch (error) {
      console.error("Error performing eligibility check:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
