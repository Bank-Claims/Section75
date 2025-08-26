export interface EvidenceFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  uploadProgress?: number;
}

export interface ClaimFormData {
  customerName: string;
  accountNumber: string;
  transactionAmount: string;
  transactionDate: string;
  merchantName: string;
  description: string;
  reason: string;
}

export interface EligibilityStatus {
  checks: {
    transactionType: {
      isPurchaseOfGoodsOrServices: boolean;
      isNotRestrictedTransaction: boolean;
    };
    purchaseMethod: {
      wasCreditCardUsed: boolean;
      wasNotCashOrTransfer: boolean;
    };
    transactionValue: {
      overHundredPounds: boolean;
      underThirtyThousandPounds: boolean;
    };
    timePeriod: {
      withinSixYears: boolean;
    };
    reasonForClaim: {
      isValidReason: boolean;
      isNotChangeOfMind: boolean;
    };
  };
  isEligible: boolean;
  claimClass: string;
}
