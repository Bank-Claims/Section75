import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FileUpload } from "@/components/ui/file-upload";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Edit, CloudUpload, CheckCircle, Layers, Send } from "lucide-react";
import type { ClaimFormData, EligibilityStatus, EvidenceFile } from "@/lib/types";
import type { UploadResult } from "@uppy/core";

const claimFormSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  transactionAmount: z.string().min(1, "Transaction amount is required"),
  transactionDate: z.string().min(1, "Transaction date is required"),
  merchantName: z.string().min(1, "Merchant name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  reason: z.string().min(1, "Reason is required"),
});

export default function ClaimsIntake() {
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [eligibilityStatus, setEligibilityStatus] = useState<EligibilityStatus | null>(null);
  const [manualChecks, setManualChecks] = useState({
    transactionType: {
      isPurchaseOfGoodsOrServices: false,
      isNotRestrictedTransaction: false,
    },
    purchaseMethod: {
      wasCreditCardUsed: false,
      wasNotCashOrTransfer: false,
    },
    transactionValue: {
      overHundredPounds: false,
      underThirtyThousandPounds: false,
    },
    timePeriod: {
      withinSixYears: false,
    },
    reasonForClaim: {
      isValidReason: false,
      isNotChangeOfMind: false,
    },
  });
  const { toast } = useToast();

  const form = useForm<ClaimFormData>({
    resolver: zodResolver(claimFormSchema),
    defaultValues: {
      customerName: "",
      accountNumber: "",
      transactionAmount: "",
      transactionDate: "",
      merchantName: "",
      description: "",
      reason: "",
    },
  });

  const watchedValues = form.watch();

  // Eligibility check mutation
  const eligibilityMutation = useMutation({
    mutationFn: async (data: { transactionAmount: string; transactionDate: string; reason: string }) => {
      const response = await apiRequest("POST", "/api/eligibility-check", data);
      return response.json();
    },
    onSuccess: (data) => {
      setEligibilityStatus(data);
    },
  });

  // Submit claim mutation
  const submitClaimMutation = useMutation({
    mutationFn: async (data: ClaimFormData & { evidenceFiles: any[] }) => {
      const response = await apiRequest("POST", "/api/claims", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Claim submitted successfully",
        description: `Claim ${data.claimNumber} has been created and is under review.`,
      });
      form.reset();
      setEvidenceFiles([]);
      setEligibilityStatus(null);
      queryClient.invalidateQueries({ queryKey: ["/api/claims"] });
    },
    onError: () => {
      toast({
        title: "Error submitting claim",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    },
  });

  // Calculate overall eligibility based on manual checks
  const calculateEligibility = () => {
    const isEligible = 
      manualChecks.transactionType.isPurchaseOfGoodsOrServices &&
      manualChecks.transactionType.isNotRestrictedTransaction &&
      manualChecks.purchaseMethod.wasCreditCardUsed &&
      manualChecks.purchaseMethod.wasNotCashOrTransfer &&
      manualChecks.transactionValue.overHundredPounds &&
      manualChecks.transactionValue.underThirtyThousandPounds &&
      manualChecks.timePeriod.withinSixYears &&
      manualChecks.reasonForClaim.isValidReason &&
      manualChecks.reasonForClaim.isNotChangeOfMind;

    const transactionAmount = parseFloat(watchedValues.transactionAmount || "0");
    const claimClass = transactionAmount >= 100 && transactionAmount < 1000 ? "Class 1" :
                      transactionAmount >= 1000 && transactionAmount < 5000 ? "Class 2" :
                      transactionAmount >= 5000 && transactionAmount < 10000 ? "Class 3" :
                      transactionAmount >= 10000 && transactionAmount <= 30000 ? "Class 4" : "Unclassified";

    return {
      checks: manualChecks,
      isEligible,
      claimClass,
    };
  };

  const currentEligibility = calculateEligibility();

  const handleCheckboxChange = (category: string, field: string, value: boolean) => {
    setManualChecks(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [field]: value,
      },
    }));
  };

  const onSubmit = (data: ClaimFormData) => {
    const eligibilityData = calculateEligibility();
    submitClaimMutation.mutate({
      ...data,
      eligibilityChecks: eligibilityData.checks,
      isEligible: eligibilityData.isEligible,
      claimClass: eligibilityData.claimClass,
      evidenceFiles: evidenceFiles.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        url: file.url,
      })),
    });
  };

  const handleFileUpload = async () => {
    try {
      const response = await apiRequest("POST", "/api/objects/upload", {});
      const { uploadURL } = await response.json();
      return {
        method: "PUT" as const,
        url: uploadURL,
      };
    } catch (error) {
      toast({
        title: "Upload error",
        description: "Failed to get upload URL",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    const uploadedFiles = result.successful?.map((file) => ({
      id: Math.random().toString(36).substring(7),
      name: file.name || "Unknown file",
      size: file.size || 0,
      type: file.type || "application/octet-stream",
      url: file.uploadURL,
    }));

    if (uploadedFiles) {
      setEvidenceFiles(prev => [...prev, ...uploadedFiles]);
      
      toast({
        title: "Files uploaded successfully",
        description: `${uploadedFiles.length} file(s) uploaded`,
      });
    }
  };

  const getClaimClassColor = (claimClass: string) => {
    switch (claimClass) {
      case "Class 1": return "bg-green-100 text-green-800";
      case "Class 2": return "bg-blue-100 text-blue-800";
      case "Class 3": return "bg-yellow-100 text-yellow-800";
      case "Class 4": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Claims Form Column */}
          <div className="xl:col-span-2 space-y-8">
            {/* Claim Summary Card */}
            <Card data-testid="card-claim-summary">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Edit className="mr-3 h-5 w-5 text-primary" />
                  Claim Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="customerName">Customer Name *</Label>
                      <Input
                        id="customerName"
                        {...form.register("customerName")}
                        placeholder="Enter customer name"
                        data-testid="input-customer-name"
                      />
                      {form.formState.errors.customerName && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.customerName.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="accountNumber">Account Number *</Label>
                      <Input
                        id="accountNumber"
                        {...form.register("accountNumber")}
                        placeholder="1234-5678-9012"
                        data-testid="input-account-number"
                      />
                      {form.formState.errors.accountNumber && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.accountNumber.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="transactionAmount">Transaction Amount (£) *</Label>
                      <Input
                        id="transactionAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        {...form.register("transactionAmount")}
                        placeholder="0.00"
                        data-testid="input-transaction-amount"
                      />
                      {form.formState.errors.transactionAmount && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.transactionAmount.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="transactionDate">Transaction Date *</Label>
                      <Input
                        id="transactionDate"
                        type="date"
                        {...form.register("transactionDate")}
                        data-testid="input-transaction-date"
                      />
                      {form.formState.errors.transactionDate && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.transactionDate.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="merchantName">Merchant/Supplier Name *</Label>
                    <Input
                      id="merchantName"
                      {...form.register("merchantName")}
                      placeholder="Enter merchant name"
                      data-testid="input-merchant-name"
                    />
                    {form.formState.errors.merchantName && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.merchantName.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="description">Claim Description *</Label>
                    <Textarea
                      id="description"
                      rows={4}
                      {...form.register("description")}
                      placeholder="Please provide detailed description of the issue..."
                      data-testid="textarea-description"
                    />
                    {form.formState.errors.description && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.description.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="reason">Reason for Claim *</Label>
                    <Select onValueChange={(value) => form.setValue("reason", value)} data-testid="select-reason">
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="faulty-goods">Faulty goods or services</SelectItem>
                        <SelectItem value="misrepresentation">Misrepresentation (item not as described)</SelectItem>
                        <SelectItem value="non-delivery">Non-delivery</SelectItem>
                        <SelectItem value="supplier-failure">Supplier failure (company went out of business)</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.reason && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.reason.message}
                      </p>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* File Upload Card */}
            <Card data-testid="card-file-upload">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CloudUpload className="mr-3 h-5 w-5 text-primary" />
                  Supporting Evidence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ObjectUploader
                  maxNumberOfFiles={10}
                  maxFileSize={10485760}
                  onGetUploadParameters={handleFileUpload}
                  onComplete={handleUploadComplete}
                  data-testid="object-uploader"
                >
                  <div className="flex items-center gap-2">
                    <CloudUpload className="h-4 w-4" />
                    <span>Upload Evidence Files</span>
                  </div>
                </ObjectUploader>

                {evidenceFiles.length > 0 && (
                  <div className="mt-6 space-y-3" data-testid="evidence-file-list">
                    {evidenceFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-secondary rounded-md">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                            <CloudUpload className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground" data-testid={`text-evidence-filename-${file.id}`}>
                              {file.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {(file.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Eligibility Check Column */}
          <div className="space-y-8">
            {/* Eligibility Check Card */}
            <Card data-testid="card-eligibility-check">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="mr-3 h-5 w-5 text-primary" />
                  Section 75 Eligibility Check
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <>
                  {/* Transaction Type */}
                  <div className="border border-border rounded-lg p-4">
                    <h3 className="font-medium text-foreground mb-3">Transaction Type</h3>
                    <div className="space-y-2">
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <Checkbox 
                          checked={manualChecks.transactionType.isPurchaseOfGoodsOrServices}
                          onCheckedChange={(checked) => handleCheckboxChange('transactionType', 'isPurchaseOfGoodsOrServices', !!checked)}
                          data-testid="checkbox-purchase-goods-services"
                        />
                        <span className="text-sm text-foreground">
                          Is the transaction a purchase of goods or services?
                        </span>
                      </label>
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <Checkbox 
                          checked={manualChecks.transactionType.isNotRestrictedTransaction}
                          onCheckedChange={(checked) => handleCheckboxChange('transactionType', 'isNotRestrictedTransaction', !!checked)}
                          data-testid="checkbox-not-restricted"
                        />
                        <span className="text-sm text-foreground">
                          Is it NOT a cash withdrawal, gambling transaction, foreign currency purchase, money order, or fine payment?
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Purchase Method */}
                  <div className="border border-border rounded-lg p-4">
                    <h3 className="font-medium text-foreground mb-3">Purchase Method</h3>
                    <div className="space-y-2">
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <Checkbox 
                          checked={manualChecks.purchaseMethod.wasCreditCardUsed}
                          onCheckedChange={(checked) => handleCheckboxChange('purchaseMethod', 'wasCreditCardUsed', !!checked)}
                          data-testid="checkbox-credit-card"
                        />
                        <span className="text-sm text-foreground">
                          Was the purchase made using a credit card?
                        </span>
                      </label>
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <Checkbox 
                          checked={manualChecks.purchaseMethod.wasNotCashOrTransfer}
                          onCheckedChange={(checked) => handleCheckboxChange('purchaseMethod', 'wasNotCashOrTransfer', !!checked)}
                          data-testid="checkbox-not-cash-transfer"
                        />
                        <span className="text-sm text-foreground">
                          Was it NOT bought with cash or a money transfer from the credit card?
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Transaction Value */}
                  <div className="border border-border rounded-lg p-4">
                    <h3 className="font-medium text-foreground mb-3">Transaction Value</h3>
                    <div className="space-y-2">
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <Checkbox 
                          checked={manualChecks.transactionValue.overHundredPounds}
                          onCheckedChange={(checked) => handleCheckboxChange('transactionValue', 'overHundredPounds', !!checked)}
                          data-testid="checkbox-over-hundred"
                        />
                        <span className="text-sm text-foreground">
                          Did the single item purchased cost over £100?
                        </span>
                      </label>
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <Checkbox 
                          checked={manualChecks.transactionValue.underThirtyThousandPounds}
                          onCheckedChange={(checked) => handleCheckboxChange('transactionValue', 'underThirtyThousandPounds', !!checked)}
                          data-testid="checkbox-under-thirty-thousand"
                        />
                        <span className="text-sm text-foreground">
                          Did the total cost of the item(s) purchased cost less than £30,000?
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Time Period */}
                  <div className="border border-border rounded-lg p-4">
                    <h3 className="font-medium text-foreground mb-3">Time Period</h3>
                    <div className="space-y-2">
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <Checkbox 
                          checked={manualChecks.timePeriod.withinSixYears}
                          onCheckedChange={(checked) => handleCheckboxChange('timePeriod', 'withinSixYears', !!checked)}
                          data-testid="checkbox-within-six-years"
                        />
                        <span className="text-sm text-foreground">
                          Was the claim made within six years of the purchase date?
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Reason for Claim */}
                  <div className="border border-border rounded-lg p-4">
                    <h3 className="font-medium text-foreground mb-3">Reason for Claim</h3>
                    <div className="space-y-2">
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <Checkbox 
                          checked={manualChecks.reasonForClaim.isValidReason}
                          onCheckedChange={(checked) => handleCheckboxChange('reasonForClaim', 'isValidReason', !!checked)}
                          data-testid="checkbox-valid-reason"
                        />
                        <span className="text-sm text-foreground">
                          Is the reason for the claim one of: faulty goods, misrepresentation, non-delivery, or supplier failure?
                        </span>
                      </label>
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <Checkbox 
                          checked={manualChecks.reasonForClaim.isNotChangeOfMind}
                          onCheckedChange={(checked) => handleCheckboxChange('reasonForClaim', 'isNotChangeOfMind', !!checked)}
                          data-testid="checkbox-not-change-of-mind"
                        />
                        <span className="text-sm text-foreground">
                          Is the reason for the claim NOT simply "change of mind"?
                        </span>
                      </label>
                    </div>
                  </div>

                </>
              </CardContent>
            </Card>

            {/* Classification Card */}
            <Card data-testid="card-classification">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Layers className="mr-3 h-5 w-5 text-primary" />
                  Claim Classification
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 border border-border rounded-md">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-foreground">Class 1</span>
                      <span className="text-sm text-muted-foreground">£100 - £1,000</span>
                    </div>
                  </div>
                  <div className="p-3 border border-border rounded-md">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-foreground">Class 2</span>
                      <span className="text-sm text-muted-foreground">£1,000 - £5,000</span>
                    </div>
                  </div>
                  <div className="p-3 border border-border rounded-md">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-foreground">Class 3</span>
                      <span className="text-sm text-muted-foreground">£5,000 - £10,000</span>
                    </div>
                  </div>
                  <div className="p-3 border border-border rounded-md">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-foreground">Class 4</span>
                      <span className="text-sm text-muted-foreground">£10,000 - £30,000</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-primary/10 rounded-md">
                  <p className="text-sm font-medium text-primary" data-testid="text-calculated-class">
                    Calculated Class: {" "}
                    <span className={`px-2 py-1 rounded text-xs ${getClaimClassColor(currentEligibility.claimClass)}`}>
                      {currentEligibility.claimClass}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <Button
              type="submit"
              onClick={form.handleSubmit(onSubmit)}
              className="w-full"
              disabled={submitClaimMutation.isPending}
              data-testid="button-submit-claim"
            >
              {submitClaimMutation.isPending ? (
                "Submitting..."
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Claim
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
