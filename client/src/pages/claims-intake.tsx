import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Edit, CloudUpload, Send } from "lucide-react";
import type { ClaimFormData, EvidenceFile } from "@/lib/types";
// Removed @uppy/core dependency for local uploads

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

  // Submit claim mutation
  const submitClaimMutation = useMutation({
    mutationFn: async (data: ClaimFormData & { evidenceFiles: any[] }) => {
      console.log("Mutation started for claim submission");
      const response = await apiRequest("POST", "/api/claims", data);
      const result = await response.json();
      console.log("Claim submission response:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("Claim submission successful:", data);
      
      // Clear any existing toasts first to avoid confusion
      setTimeout(() => {
        toast({
          title: "✅ Claim submitted successfully",
          description: `Claim ${data.claimNumber} has been created and is under review.`,
        });
      }, 100);
      
      form.reset();
      setEvidenceFiles([]);
      queryClient.invalidateQueries({ queryKey: ["/api/claims"] });
    },
    onError: (error) => {
      console.error("Claim submission failed:", error);
      toast({
        title: "Error submitting claim",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = useCallback((data: ClaimFormData) => {
    // Ensure we only submit when the form is explicitly submitted
    console.log("Form submitted with data:", data);
    
    submitClaimMutation.mutate({
      ...data,
      evidenceFiles: evidenceFiles.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        url: file.url,
      })),
    });
  }, [submitClaimMutation, evidenceFiles]);

  const handleFileUpload = useCallback(async () => {
    // This function is no longer needed for local uploads
    // But keeping for compatibility with ObjectUploader interface
    return {
      method: "PUT" as const,
      url: "/api/upload-evidence",
    };
  }, []);

  const handleUploadComplete = useCallback((result: any) => {
    console.log("File upload completed:", result);
    
    const uploadedFiles = result.successful?.map((file: any) => ({
      id: file.id || Math.random().toString(36).substring(7),
      name: file.name || "Unknown file",
      size: file.size || 0,
      type: file.type || "application/octet-stream",
      url: file.uploadURL || file.url,
    }));

    if (uploadedFiles && uploadedFiles.length > 0) {
      // Immediately add files to evidence list
      setEvidenceFiles(prev => {
        const newFiles = [...prev, ...uploadedFiles];
        console.log("Updated evidence files:", newFiles);
        return newFiles;
      });
      
      // Show immediate file upload success notification (distinct from claim submission)
      toast({
        title: "📁 Evidence files uploaded",
        description: `${uploadedFiles.length} file(s) uploaded successfully`,
      });
    }
  }, [toast]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-8">
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
                    <Select 
                      value={form.watch("reason")} 
                      onValueChange={(value) => form.setValue("reason", value)} 
                      data-testid="select-reason"
                    >
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

                  {/* Supporting Evidence Section */}
                  <div className="border-t border-border pt-6">
                    <div className="flex items-center mb-4">
                      <CloudUpload className="mr-3 h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Supporting Evidence</h3>
                    </div>
                    
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
                          <div key={file.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-md">
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
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setEvidenceFiles(files => files.filter(f => f.id !== file.id))}
                              data-testid={`button-remove-file-${file.id}`}
                              className="text-foreground hover:text-destructive"
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={submitClaimMutation.isPending}
                    data-testid="button-submit-claim"
                  >
                    {submitClaimMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Submit Claim
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}