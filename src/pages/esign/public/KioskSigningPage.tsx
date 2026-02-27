import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, AlertCircle, CheckCircle2, Camera, Lock } from "lucide-react";
import { toast } from "sonner";
import SignatureCapture from "@/components/esign/SignatureCapture";
import axios from "axios";

interface DocumentData {
  id: string;
  html_content: string;
  status: string;
  expires_at: string;
}

interface RecipientData {
  id: string;
  email: string;
  name: string;
  signature_order: number;
  status: string;
}

interface TemplateData {
  name: string;
  require_scroll_completion: boolean;
  delimiters: Array<{
    key: string;
    type: string;
    required: boolean;
    assigned_to: number;
  }>;
}

interface KioskConfig {
  session_timeout: number;
  require_photo: boolean;
}

interface KioskPageData {
  document: DocumentData;
  recipient: RecipientData;
  template: TemplateData;
  kiosk_config: KioskConfig;
}

const KioskSigningPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [hostAuthenticated, setHostAuthenticated] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [hostEmail, setHostEmail] = useState('');
  const [hostPassword, setHostPassword] = useState('');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signatureType, setSignatureType] = useState<'draw' | 'type' | 'upload' | null>(null);
  const [fieldData, setFieldData] = useState<Record<string, string>>({});
  const [kioskLocation, setKioskLocation] = useState('');
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  
  // Session timeout timer
  useEffect(() => {
    if (hostAuthenticated && sessionToken) {
      const timeout = setTimeout(() => {
        setSessionExpired(true);
        setHostAuthenticated(false);
        setSessionToken(null);
        toast.error('Session expired. Please re-authenticate.');
      }, 5 * 60 * 1000); // 5 minutes
      
      return () => clearTimeout(timeout);
    }
  }, [hostAuthenticated, sessionToken]);

  // Fetch document data
  const { data, isLoading, error } = useQuery<KioskPageData>({
    queryKey: ['kiosk-page', token],
    queryFn: async () => {
      const response = await axios.get(`/api/esign/kiosk/${token}`);
      return response.data;
    },
    retry: false,
  });

  // Authenticate host mutation
  const authenticateHostMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(`/api/esign/kiosk/${token}/authenticate-host`, {
        host_email: hostEmail,
        host_password: hostPassword,
      });
      return response.data;
    },
    onSuccess: (data) => {
      setHostAuthenticated(true);
      setSessionToken(data.session_token);
      setShowAuthDialog(false);
      toast.success(`Authenticated as ${data.host.name}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to authenticate host');
    },
  });

  // Capture photo mutation
  const capturePhotoMutation = useMutation({
    mutationFn: async (photoData: string) => {
      const response = await axios.post(`/api/esign/kiosk/${sessionToken}/capture-photo`, {
        photo_data: photoData,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Photo captured successfully');
    },
    onError: (error: any) => {
      if (error.response?.data?.code === 'SESSION_EXPIRED') {
        setSessionExpired(true);
        setHostAuthenticated(false);
        setShowAuthDialog(true);
      }
      toast.error(error.response?.data?.error || 'Failed to capture photo');
    },
  });

  // Submit signature mutation
  const submitSignatureMutation = useMutation({
    mutationFn: async () => {
      if (!signatureData || !signatureType) {
        throw new Error('Signature is required');
      }

      const response = await axios.post(`/api/esign/kiosk/${sessionToken}/submit`, {
        signature_image: signatureData,
        signature_type: signatureType,
        kiosk_location: kioskLocation,
        field_data: fieldData,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Document signed successfully');
      navigate(`/esign/public/complete/${token}`);
    },
    onError: (error: any) => {
      if (error.response?.data?.code === 'SESSION_EXPIRED') {
        setSessionExpired(true);
        setHostAuthenticated(false);
        setShowAuthDialog(true);
      }
      toast.error(error.response?.data?.error || 'Failed to submit signature');
    },
  });

  // Handle field data change
  const handleFieldChange = (key: string, value: string) => {
    setFieldData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Handle signature capture
  const handleSignatureCapture = (signature: string, type: 'draw' | 'type' | 'upload') => {
    setSignatureData(signature);
    setSignatureType(type);
  };

  // Handle photo capture
  const handlePhotoCapture = () => {
    // In a real implementation, this would use the device camera
    // For now, we'll use a file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'user';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const photoDataUrl = event.target?.result as string;
          setPhotoData(photoDataUrl);
          capturePhotoMutation.mutate(photoDataUrl);
        };
        reader.readAsDataURL(file);
      }
    };
    
    input.click();
  };

  // Handle submit
  const handleSubmit = () => {
    if (!signatureData) {
      toast.error('Please provide signature');
      return;
    }

    if (data?.kiosk_config.require_photo && !photoData) {
      toast.error('Please capture signer photo');
      return;
    }

    // Validate required fields
    const requiredFields = data?.template.delimiters.filter(d => d.required) || [];
    for (const field of requiredFields) {
      if (!fieldData[field.key]) {
        toast.error(`Please fill in the required field: ${field.key}`);
        return;
      }
    }

    submitSignatureMutation.mutate();
  };

  // Handle host authentication
  const handleAuthenticate = () => {
    if (!hostEmail || !hostPassword) {
      toast.error('Please provide host credentials');
      return;
    }

    authenticateHostMutation.mutate();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading kiosk...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    const errorMessage = (error as any)?.response?.data?.error || 'Failed to load kiosk';
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{errorMessage}</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Host authentication dialog
  if (!hostAuthenticated || showAuthDialog) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Host Authentication Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessionExpired && (
              <Alert variant="destructive">
                <AlertDescription>
                  Your session has expired. Please re-authenticate to continue.
                </AlertDescription>
              </Alert>
            )}
            <p className="text-sm text-muted-foreground">
              Please authenticate as a company host to facilitate in-person signing.
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="host-email">Host Email</Label>
                <Input
                  id="host-email"
                  type="email"
                  placeholder="host@company.com"
                  value={hostEmail}
                  onChange={(e) => setHostEmail(e.target.value)}
                  disabled={authenticateHostMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="host-password">Host Password</Label>
                <Input
                  id="host-password"
                  type="password"
                  placeholder="••••••••"
                  value={hostPassword}
                  onChange={(e) => setHostPassword(e.target.value)}
                  disabled={authenticateHostMutation.isPending}
                />
              </div>
              <Button
                onClick={handleAuthenticate}
                disabled={!hostEmail || !hostPassword || authenticateHostMutation.isPending}
                className="w-full"
              >
                {authenticateHostMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Authenticate
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main kiosk signing page
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-5xl mx-auto px-4 space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle>{data.template.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              In-Person Signing for: {data.recipient.name} ({data.recipient.email})
            </p>
          </CardHeader>
        </Card>

        {/* Document content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Document</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] border rounded-md p-6 bg-white">
              <div dangerouslySetInnerHTML={{ __html: data.document.html_content }} />
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Kiosk location */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Kiosk Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kiosk-location">Kiosk Location</Label>
              <Input
                id="kiosk-location"
                type="text"
                placeholder="e.g., Main Office, Branch 1"
                value={kioskLocation}
                onChange={(e) => setKioskLocation(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Signer photo */}
        {data.kiosk_config.require_photo && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Signer Photo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {photoData ? (
                <div className="space-y-2">
                  <img src={photoData} alt="Signer" className="max-w-xs rounded-md border" />
                  <Button
                    variant="outline"
                    onClick={handlePhotoCapture}
                    disabled={capturePhotoMutation.isPending}
                  >
                    Retake Photo
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handlePhotoCapture}
                  disabled={capturePhotoMutation.isPending}
                >
                  {capturePhotoMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  <Camera className="w-4 h-4 mr-2" />
                  Capture Photo
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recipient fields */}
        {data.template.delimiters.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Signer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.template.delimiters.map((delimiter) => (
                <div key={delimiter.key} className="space-y-2">
                  <Label htmlFor={delimiter.key}>
                    {delimiter.key}
                    {delimiter.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  <Input
                    id={delimiter.key}
                    type={delimiter.type === 'email' ? 'email' : delimiter.type === 'phone' ? 'tel' : delimiter.type === 'date' ? 'date' : 'text'}
                    value={fieldData[delimiter.key] || ''}
                    onChange={(e) => handleFieldChange(delimiter.key, e.target.value)}
                    required={delimiter.required}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Signature capture */}
        <SignatureCapture
          onSignatureCapture={handleSignatureCapture}
          disabled={submitSignatureMutation.isPending}
        />

        {/* Submit button */}
        <div className="flex gap-4">
          <Button
            onClick={handleSubmit}
            disabled={
              !signatureData ||
              (data.kiosk_config.require_photo && !photoData) ||
              submitSignatureMutation.isPending
            }
            className="flex-1"
          >
            {submitSignatureMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Complete In-Person Signing
          </Button>
        </div>
      </div>
    </div>
  );
};

export default KioskSigningPage;
