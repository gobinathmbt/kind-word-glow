import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { tenderService } from "@/api/services";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Package,
  XCircle,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DealershipStatusListProps {
  tenderId: string;
  onSelectDealership?: (dealershipId: string) => void;
}

export const DealershipStatusList: React.FC<DealershipStatusListProps> = ({
  tenderId,
  onSelectDealership,
}) => {
  const { data: statusData, isLoading, error } = useQuery({
    queryKey: ["tender-dealership-status", tenderId],
    queryFn: async () => {
      const response = await tenderService.getTenderDealershipStatusSummary(
        tenderId
      );
      return response.data.data;
    },
    enabled: !!tenderId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dealership Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dealership Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">Failed to load dealership status</div>
        </CardContent>
      </Card>
    );
  }

  if (!statusData) {
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "Responded":
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case "Approved":
        return <Package className="h-4 w-4 text-green-500" />;
      case "Withdrawn":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "Not Selected":
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-50 border-yellow-200";
      case "Responded":
        return "bg-blue-50 border-blue-200";
      case "Approved":
        return "bg-green-50 border-green-200";
      case "Withdrawn":
        return "bg-red-50 border-red-200";
      case "Not Selected":
        return "bg-gray-50 border-gray-200";
      default:
        return "bg-white";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Pending":
        return "default";
      case "Responded":
        return "secondary";
      case "Approved":
        return "default";
      case "Withdrawn":
        return "destructive";
      case "Not Selected":
        return "outline";
      default:
        return "default";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Dealership Status Tracking</CardTitle>
            <CardDescription>
              Response status for each dealership
            </CardDescription>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                {statusData.response_rate_percentage}%
              </span>
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-muted-foreground">Response Rate</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Statistics Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-3 bg-gray-50 rounded-lg border">
            <div className="text-sm text-muted-foreground">Total</div>
            <div className="text-2xl font-bold">
              {statusData.total_dealerships}
            </div>
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="text-sm text-yellow-700">Pending Response</div>
            <div className="text-2xl font-bold text-yellow-700">
              {statusData.dealerships_pending}
            </div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-700">Responded</div>
            <div className="text-2xl font-bold text-blue-700">
              {statusData.dealerships_responded}
            </div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="text-sm text-green-700">Approved</div>
            <div className="text-2xl font-bold text-green-700">
              {statusData.dealerships_approved}
            </div>
          </div>
        </div>

        {/* Dealership List Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Dealership</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Quote Price</TableHead>
                <TableHead>Response Time</TableHead>
                <TableHead>Sent Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statusData.summary.map(
                (dealership: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(dealership.status)}
                        <span>{dealership.dealership_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {dealership.dealership_email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(dealership.status)}>
                        {dealership.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {dealership.quote_price ? (
                        <span className="font-semibold">
                          ${dealership.quote_price.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {dealership.response_time_hours ? (
                        <span className="text-sm">
                          {dealership.response_time_hours}h
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          Pending
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(dealership.sent_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {onSelectDealership && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            onSelectDealership(dealership.dealership_id)
                          }
                        >
                          View Details
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </div>

        {/* Average Response Time */}
        {statusData.average_response_time_hours && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <span className="font-semibold">Average Response Time:</span>{" "}
              {statusData.average_response_time_hours} hours
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DealershipStatusList;
