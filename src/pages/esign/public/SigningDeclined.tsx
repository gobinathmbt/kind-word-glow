import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

const SigningDeclined = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-600">
            <XCircle className="w-6 h-6" />
            Document Declined
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            You have declined to sign this document. The document sender has been notified of your decision.
          </p>
          <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
            <p className="text-sm text-orange-700">
              If you declined by mistake, please contact the document sender to request a new signing link.
            </p>
          </div>
          <Button
            onClick={() => window.close()}
            variant="outline"
            className="w-full"
          >
            Close Window
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SigningDeclined;
