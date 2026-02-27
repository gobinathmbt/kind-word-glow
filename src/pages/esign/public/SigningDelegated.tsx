import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, UserPlus } from "lucide-react";

const SigningDelegated = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="w-6 h-6" />
            Signing Delegated
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center py-6">
            <UserPlus className="w-24 h-24 text-green-600" />
          </div>
          <p className="text-center text-muted-foreground">
            You have successfully delegated this signing responsibility. The delegate will receive a notification with their signing link.
          </p>
          <Button
            onClick={() => navigate('/')}
            className="w-full"
          >
            Close
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SigningDelegated;
