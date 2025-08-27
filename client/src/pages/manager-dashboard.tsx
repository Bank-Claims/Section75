import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  PoundSterling, 
  Filter, 
  Eye, 
  Check,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import type { Claim } from "@shared/schema";

export default function ManagerDashboard() {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { toast } = useToast();

  // Fetch all claims
  const { data: claims = [], isLoading } = useQuery<Claim[]>({
    queryKey: ["/api/claims"],
    enabled: true,
  });

  // Update claim status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ claimId, status }: { claimId: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/claims/${claimId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Claim updated",
        description: "Claim status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/claims"] });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update claim status.",
        variant: "destructive",
      });
    },
  });

  // Filter claims based on status
  const filteredClaims = claims.filter((claim) => {
    if (filterStatus === "all") return true;
    return claim.status === filterStatus;
  });

  // Calculate statistics
  const stats = {
    total: claims.length,
    pending: claims.filter((c) => c.status === "pending").length,
    approved: claims.filter((c) => c.status === "approved").length,
    totalValue: claims.reduce((sum, claim) => sum + parseFloat(claim.transactionAmount), 0),
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending Review</Badge>;
      case "reviewing":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Under Review</Badge>;
      case "approved":
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Approved</Badge>;
      case "rejected":
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getClaimClassBadge = (claimClass: string) => {
    const colors = {
      "Class 1": "bg-green-100 text-green-800",
      "Class 2": "bg-blue-100 text-blue-800", 
      "Class 3": "bg-yellow-100 text-yellow-800",
      "Class 4": "bg-red-100 text-red-800",
    };
    return (
      <Badge variant="secondary" className={colors[claimClass as keyof typeof colors] || "bg-gray-100 text-gray-800"}>
        {claimClass}
      </Badge>
    );
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const claimDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - claimDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Less than an hour ago";
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    return claimDate.toLocaleDateString();
  };

  const handleApprove = (claimId: string) => {
    updateStatusMutation.mutate({ claimId, status: "approved" });
  };

  const handleReview = (claimId: string) => {
    updateStatusMutation.mutate({ claimId, status: "reviewing" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading claims...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <Card className="mb-8" data-testid="card-dashboard-header">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">Claims Manager Dashboard</h2>
                <p className="text-muted-foreground mt-1">Review and manage submitted claims</p>
              </div>
              <div className="flex items-center space-x-4 mt-4 sm:mt-0">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={filterStatus} onValueChange={setFilterStatus} data-testid="select-filter-status">
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Claims</SelectItem>
                      <SelectItem value="pending">Pending Review</SelectItem>
                      <SelectItem value="reviewing">Under Investigation</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-secondary rounded-lg" data-testid="stat-total-claims">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-white mb-1">Total Claims</p>
                    <p className="text-2xl font-semibold text-white">{stats.total}</p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-secondary rounded-lg" data-testid="stat-pending-claims">
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-yellow-400" />
                  <div>
                    <p className="text-sm font-medium text-white mb-1">Pending Review</p>
                    <p className="text-2xl font-semibold text-white">{stats.pending}</p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-secondary rounded-lg" data-testid="stat-approved-claims">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <div>
                    <p className="text-sm font-medium text-white mb-1">Approved</p>
                    <p className="text-2xl font-semibold text-white">{stats.approved}</p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-secondary rounded-lg" data-testid="stat-total-value">
                <div className="flex items-center space-x-3">
                  <PoundSterling className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-white mb-1">Total Value</p>
                    <p className="text-2xl font-semibold text-white">
                      £{stats.totalValue.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Claims List */}
        <Card data-testid="card-claims-list">
          <CardHeader>
            <CardTitle>Recent Claims</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredClaims.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No claims found matching the selected filter.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredClaims.map((claim: Claim) => (
                  <div key={claim.id} className="p-6 hover:bg-secondary/50 transition-colors" data-testid={`claim-row-${claim.id}`}>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <h4 className="text-lg font-semibold text-foreground" data-testid={`text-claim-number-${claim.id}`}>
                            {claim.claimNumber}
                          </h4>
                          {getStatusBadge(claim.status)}
                          {getClaimClassBadge(claim.claimClass)}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Customer</p>
                            <p className="font-medium text-foreground" data-testid={`text-customer-${claim.id}`}>
                              {claim.customerName}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Amount</p>
                            <p className="font-medium text-foreground" data-testid={`text-amount-${claim.id}`}>
                              £{parseFloat(claim.transactionAmount).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Merchant</p>
                            <p className="font-medium text-foreground" data-testid={`text-merchant-${claim.id}`}>
                              {claim.merchantName}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Submitted</p>
                            <p className="font-medium text-foreground" data-testid={`text-submitted-${claim.id}`}>
                              {formatTimeAgo(claim.createdAt ? claim.createdAt.toString() : "")}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2" data-testid={`text-description-${claim.id}`}>
                          {claim.description}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        {claim.status === "pending" && (
                          <>
                            <Button
                              variant="outline"
                              onClick={() => handleReview(claim.id)}
                              disabled={updateStatusMutation.isPending}
                              data-testid={`button-review-${claim.id}`}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Review
                            </Button>
                            <Button
                              onClick={() => handleApprove(claim.id)}
                              disabled={updateStatusMutation.isPending}
                              data-testid={`button-approve-${claim.id}`}
                            >
                              <Check className="mr-2 h-4 w-4" />
                              Approve
                            </Button>
                          </>
                        )}
                        {claim.status === "reviewing" && (
                          <>
                            <Button
                              variant="outline"
                              data-testid={`button-view-details-${claim.id}`}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Button>
                            <Button
                              onClick={() => handleApprove(claim.id)}
                              disabled={updateStatusMutation.isPending}
                              data-testid={`button-approve-reviewing-${claim.id}`}
                            >
                              <Check className="mr-2 h-4 w-4" />
                              Approve
                            </Button>
                          </>
                        )}
                        {claim.status === "approved" && (
                          <div className="flex items-center space-x-3">
                            <Button
                              variant="outline"
                              data-testid={`button-view-approved-${claim.id}`}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Button>
                            <span className="text-sm text-green-600 font-medium">
                              <CheckCircle className="inline mr-1 h-4 w-4" />
                              Processed
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {filteredClaims.length > 0 && (
              <div className="p-6 border-t border-border">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                    Showing 1 to {filteredClaims.length} of {filteredClaims.length} results
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      data-testid="button-page-1"
                    >
                      1
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      data-testid="button-next-page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
