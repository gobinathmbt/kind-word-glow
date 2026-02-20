import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Package } from "lucide-react";

const TenderModule = () => {
  return (
    <DashboardLayout title="Tender Module">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              <CardTitle>Tender Module</CardTitle>
            </div>
            <CardDescription>
              Manage tenders, bids, and procurement processes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <Package className="h-16 w-16 mx-auto text-muted-foreground" />
                <h3 className="text-lg font-semibold">Tender Module</h3>
                <p className="text-muted-foreground max-w-md">
                  This is a placeholder for the Tender Module. Create, manage, and track tenders, 
                  handle bid submissions, and monitor procurement activities.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TenderModule;
