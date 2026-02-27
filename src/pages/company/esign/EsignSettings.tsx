import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Cloud,
  Mail,
  MessageSquare,
  Save,
  TestTube,
  Loader2,
  CheckCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { esignServices } from "@/api/services";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Provider {
  _id: string;
  provider_type: string;
  provider: string;
  is_active: boolean;
  last_tested_at?: string;
  last_test_status?: string;
  credentials: any;
  settings: any;
}

const EsignSettings = () => {
  return (
    <DashboardLayout title="E-Sign Settings">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">E-Sign Settings</h1>
          <p className="text-muted-foreground">
            Configure storage, email, and SMS providers for e-signature workflows
          </p>
        </div>

        <Tabs defaultValue="storage" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="storage">
              <Cloud className="w-4 h-4 mr-2" />
              Storage
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="w-4 h-4 mr-2" />
              Email
            </TabsTrigger>
            <TabsTrigger value="sms">
              <MessageSquare className="w-4 h-4 mr-2" />
              SMS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="storage">
            <StorageProviderConfig />
          </TabsContent>

          <TabsContent value="email">
            <EmailProviderConfig />
          </TabsContent>

          <TabsContent value="sms">
            <SmsProviderConfig />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

// Storage Provider Configuration Component
const StorageProviderConfig = () => {
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [credentials, setCredentials] = useState<any>({});
  const [testing, setTesting] = useState(false);

  const { data: providers } = useQuery({
    queryKey: ["esign-providers", "storage"],
    queryFn: async () => {
      const response = await esignServices.getProviders({ provider_type: "storage" });
      return response.data.data;
    },
  });

  const activeProvider = providers?.find((p: Provider) => p.is_active);


  const saveMutation = useMutation({
    mutationFn: (data: any) => esignServices.createProvider(data),
    onSuccess: () => {
      toast.success("Storage provider configured successfully");
      queryClient.invalidateQueries({ queryKey: ["esign-providers"] });
      setCredentials({});
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to save configuration");
    },
  });

  const handleTest = async () => {
    if (!activeProvider) {
      toast.error("Please save configuration first");
      return;
    }

    setTesting(true);
    try {
      const response = await esignServices.testProvider(activeProvider._id);
      if (response.data.success && response.data.data.success) {
        toast.success("Connection test successful!");
      } else {
        toast.error(response.data.data.error || "Connection test failed");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    if (!selectedProvider) {
      toast.error("Please select a provider");
      return;
    }

    saveMutation.mutate({
      provider_type: "storage",
      provider: selectedProvider,
      credentials,
      settings: {},
    });
  };

  const renderCredentialFields = () => {
    switch (selectedProvider) {
      case "aws_s3":
        return (
          <>
            <div className="space-y-2">
              <Label>Bucket Name</Label>
              <Input
                value={credentials.bucket || ""}
                onChange={(e) => setCredentials({ ...credentials, bucket: e.target.value })}
                placeholder="my-esign-bucket"
              />
            </div>
            <div className="space-y-2">
              <Label>Access Key ID</Label>
              <Input
                value={credentials.access_key_id || ""}
                onChange={(e) => setCredentials({ ...credentials, access_key_id: e.target.value })}
                placeholder="AKIAIOSFODNN7EXAMPLE"
              />
            </div>
            <div className="space-y-2">
              <Label>Secret Access Key</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={credentials.secret_access_key || ""}
                  onChange={(e) => setCredentials({ ...credentials, secret_access_key: e.target.value })}
                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Region</Label>
              <Input
                value={credentials.region || "us-east-1"}
                onChange={(e) => setCredentials({ ...credentials, region: e.target.value })}
                placeholder="us-east-1"
              />
            </div>
          </>
        );


      case "azure_blob":
        return (
          <>
            <div className="space-y-2">
              <Label>Account Name</Label>
              <Input
                value={credentials.account_name || ""}
                onChange={(e) => setCredentials({ ...credentials, account_name: e.target.value })}
                placeholder="mystorageaccount"
              />
            </div>
            <div className="space-y-2">
              <Label>Account Key</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={credentials.account_key || ""}
                  onChange={(e) => setCredentials({ ...credentials, account_key: e.target.value })}
                  placeholder="Storage account key"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Container Name</Label>
              <Input
                value={credentials.container_name || ""}
                onChange={(e) => setCredentials({ ...credentials, container_name: e.target.value })}
                placeholder="esign-documents"
              />
            </div>
          </>
        );

      case "dropbox":
        return (
          <div className="space-y-2">
            <Label>Access Token</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={credentials.access_token || ""}
                onChange={(e) => setCredentials({ ...credentials, access_token: e.target.value })}
                placeholder="Dropbox access token"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Storage Provider Configuration</CardTitle>
        <CardDescription>
          Configure where signed PDFs will be stored
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeProvider && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Active provider: <strong>{activeProvider.provider}</strong>
              {activeProvider.last_tested_at && (
                <span className="ml-2">
                  (Last tested: {new Date(activeProvider.last_tested_at).toLocaleString()})
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label>Storage Provider</Label>
          <Select value={selectedProvider} onValueChange={setSelectedProvider}>
            <SelectTrigger>
              <SelectValue placeholder="Select storage provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aws_s3">AWS S3</SelectItem>
              <SelectItem value="azure_blob">Azure Blob Storage</SelectItem>
              <SelectItem value="google_drive">Google Drive</SelectItem>
              <SelectItem value="dropbox">Dropbox</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedProvider && renderCredentialFields()}

        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending || !selectedProvider}
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save Configuration
          </Button>

          {activeProvider && (
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={testing}
            >
              {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <TestTube className="mr-2 h-4 w-4" />
              Test Connection
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};


// Email Provider Configuration Component
const EmailProviderConfig = () => {
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [credentials, setCredentials] = useState<any>({});
  const [testing, setTesting] = useState(false);

  const { data: providers } = useQuery({
    queryKey: ["esign-providers", "email"],
    queryFn: async () => {
      const response = await esignServices.getProviders({ provider_type: "email" });
      return response.data.data;
    },
  });

  const activeProvider = providers?.find((p: Provider) => p.is_active);

  const saveMutation = useMutation({
    mutationFn: (data: any) => esignServices.createProvider(data),
    onSuccess: () => {
      toast.success("Email provider configured successfully");
      queryClient.invalidateQueries({ queryKey: ["esign-providers"] });
      setCredentials({});
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to save configuration");
    },
  });

  const handleTest = async () => {
    if (!activeProvider) {
      toast.error("Please save configuration first");
      return;
    }

    setTesting(true);
    try {
      const response = await esignServices.testProvider(activeProvider._id);
      if (response.data.success && response.data.data.success) {
        toast.success("Test email sent successfully!");
      } else {
        toast.error(response.data.data.error || "Email test failed");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Email test failed");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    if (!selectedProvider) {
      toast.error("Please select a provider");
      return;
    }

    saveMutation.mutate({
      provider_type: "email",
      provider: selectedProvider,
      credentials,
      settings: {},
    });
  };

  const renderCredentialFields = () => {
    switch (selectedProvider) {
      case "smtp":
        return (
          <>
            <div className="space-y-2">
              <Label>SMTP Host</Label>
              <Input
                value={credentials.host || ""}
                onChange={(e) => setCredentials({ ...credentials, host: e.target.value })}
                placeholder="smtp.gmail.com"
              />
            </div>
            <div className="space-y-2">
              <Label>SMTP Port</Label>
              <Input
                type="number"
                value={credentials.port || "587"}
                onChange={(e) => setCredentials({ ...credentials, port: e.target.value })}
                placeholder="587"
              />
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={credentials.username || ""}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                placeholder="your-email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={credentials.password || ""}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  placeholder="Your password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>From Email</Label>
              <Input
                value={credentials.from_email || ""}
                onChange={(e) => setCredentials({ ...credentials, from_email: e.target.value })}
                placeholder="noreply@example.com"
              />
            </div>
          </>
        );

      case "sendgrid":
        return (
          <>
            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={credentials.api_key || ""}
                  onChange={(e) => setCredentials({ ...credentials, api_key: e.target.value })}
                  placeholder="SG.xxxxxxxxxxxxx"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>From Email</Label>
              <Input
                value={credentials.from_email || ""}
                onChange={(e) => setCredentials({ ...credentials, from_email: e.target.value })}
                placeholder="noreply@example.com"
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Provider Configuration</CardTitle>
        <CardDescription>
          Configure email provider for sending notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeProvider && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Active provider: <strong>{activeProvider.provider}</strong>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label>Email Provider</Label>
          <Select value={selectedProvider} onValueChange={setSelectedProvider}>
            <SelectTrigger>
              <SelectValue placeholder="Select email provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="smtp">SMTP</SelectItem>
              <SelectItem value="sendgrid">SendGrid</SelectItem>
              <SelectItem value="mailgun">Mailgun</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedProvider && renderCredentialFields()}

        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending || !selectedProvider}
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save Configuration
          </Button>

          {activeProvider && (
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={testing}
            >
              {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <TestTube className="mr-2 h-4 w-4" />
              Test Connection
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};


// SMS Provider Configuration Component
const SmsProviderConfig = () => {
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [credentials, setCredentials] = useState<any>({});
  const [testing, setTesting] = useState(false);
  const [testPhone, setTestPhone] = useState("");

  const { data: providers } = useQuery({
    queryKey: ["esign-providers", "sms"],
    queryFn: async () => {
      const response = await esignServices.getProviders({ provider_type: "sms" });
      return response.data.data;
    },
  });

  const activeProvider = providers?.find((p: Provider) => p.is_active);

  const saveMutation = useMutation({
    mutationFn: (data: any) => esignServices.createProvider(data),
    onSuccess: () => {
      toast.success("SMS provider configured successfully");
      queryClient.invalidateQueries({ queryKey: ["esign-providers"] });
      setCredentials({});
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to save configuration");
    },
  });

  const handleTest = async () => {
    if (!activeProvider) {
      toast.error("Please save configuration first");
      return;
    }

    if (!testPhone) {
      toast.error("Please enter a phone number to test");
      return;
    }

    setTesting(true);
    try {
      const response = await esignServices.testProvider(activeProvider._id, {
        phone_number: testPhone,
      });
      if (response.data.success && response.data.data.success) {
        toast.success("Test SMS sent successfully!");
      } else {
        toast.error(response.data.data.error || "SMS test failed");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "SMS test failed");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    if (!selectedProvider) {
      toast.error("Please select a provider");
      return;
    }

    saveMutation.mutate({
      provider_type: "sms",
      provider: selectedProvider,
      credentials,
      settings: {},
    });
  };

  const renderCredentialFields = () => {
    switch (selectedProvider) {
      case "twilio":
        return (
          <>
            <div className="space-y-2">
              <Label>Account SID</Label>
              <Input
                value={credentials.account_sid || ""}
                onChange={(e) => setCredentials({ ...credentials, account_sid: e.target.value })}
                placeholder="ACxxxxxxxxxxxxx"
              />
            </div>
            <div className="space-y-2">
              <Label>Auth Token</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={credentials.auth_token || ""}
                  onChange={(e) => setCredentials({ ...credentials, auth_token: e.target.value })}
                  placeholder="Your auth token"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>From Number</Label>
              <Input
                value={credentials.from_number || ""}
                onChange={(e) => setCredentials({ ...credentials, from_number: e.target.value })}
                placeholder="+1234567890"
              />
            </div>
          </>
        );

      case "aws_sns":
        return (
          <>
            <div className="space-y-2">
              <Label>Access Key ID</Label>
              <Input
                value={credentials.access_key_id || ""}
                onChange={(e) => setCredentials({ ...credentials, access_key_id: e.target.value })}
                placeholder="AKIAIOSFODNN7EXAMPLE"
              />
            </div>
            <div className="space-y-2">
              <Label>Secret Access Key</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={credentials.secret_access_key || ""}
                  onChange={(e) => setCredentials({ ...credentials, secret_access_key: e.target.value })}
                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Region</Label>
              <Input
                value={credentials.region || "us-east-1"}
                onChange={(e) => setCredentials({ ...credentials, region: e.target.value })}
                placeholder="us-east-1"
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>SMS Provider Configuration</CardTitle>
        <CardDescription>
          Configure SMS provider for sending OTP and notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeProvider && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Active provider: <strong>{activeProvider.provider}</strong>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label>SMS Provider</Label>
          <Select value={selectedProvider} onValueChange={setSelectedProvider}>
            <SelectTrigger>
              <SelectValue placeholder="Select SMS provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="twilio">Twilio</SelectItem>
              <SelectItem value="aws_sns">AWS SNS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedProvider && renderCredentialFields()}

        {activeProvider && (
          <div className="space-y-2">
            <Label>Test Phone Number</Label>
            <Input
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="+1234567890"
            />
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending || !selectedProvider}
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save Configuration
          </Button>

          {activeProvider && (
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={testing || !testPhone}
            >
              {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <TestTube className="mr-2 h-4 w-4" />
              Test Connection
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EsignSettings;
