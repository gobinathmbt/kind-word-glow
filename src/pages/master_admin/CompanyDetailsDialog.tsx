import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Plan {
  display_name: string;
}

export interface Company {
  _id: string;
  company_name: string;
  email: string;
  address: string;
  contact_person: string;
  plan_id?: Plan;
  current_user_count: number;
  phone: number;
  user_limit: number;
  is_active: boolean;
  created_at: string;
  subscription_status: string;
}

interface CompanyDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  company: Company | null;
}

export const CompanyDetailsDialog: React.FC<CompanyDetailsDialogProps> = ({ open, onClose, company }) => {
  if (!company) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{company.company_name}</DialogTitle>
          <DialogDescription>Company Details</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <p className="font-medium">Email:</p>
            <p>{company.email}</p>
          </div>
          <div>
            <p className="font-medium">Contact Person:</p>
            <p>{company.contact_person}</p>
          </div>
          <div>
            <p className="font-medium">Plan:</p>
            <Badge>{company.plan_id?.display_name ?? "N/A"}</Badge>
          </div>
          <div>
            <p className="font-medium">Users:</p>
            <p>{company.current_user_count}/{company.user_limit}</p>
          </div>
          <div>
            <p className="font-medium">Status:</p>
            <Badge variant={company.is_active ? "default" : "secondary"}>
              {company.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div>
            <p className="font-medium">Created:</p>
            <p>{new Date(company.created_at).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="font-medium">Subscription Status:</p>
            <Badge variant={
                company.subscription_status === "active"
                    ? "default"
                    : company.subscription_status === "trial"
                    ? "secondary"
                    : "destructive"
            }>
                {company.subscription_status}
            </Badge>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
