import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClaimSchema, eligibilityCheckSchema, type EligibilityCheck } from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
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

  // Object storage endpoints for file uploads
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Claims API endpoints
  app.post("/api/claims", async (req, res) => {
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

  app.get("/api/claims", async (req, res) => {
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

  app.patch("/api/claims/:id/status", async (req, res) => {
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
