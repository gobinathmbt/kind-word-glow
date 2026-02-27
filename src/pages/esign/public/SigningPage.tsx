import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, AlertCircle, CheckCircle2, X, UserPlus } from "lucide-react";
import { toast } from "sonner";
import SignatureCapture from "@/components/esign/SignatureCapture";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
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
  mfa_config: {
    enabled: boolean;
    channel: 'email' | 'sms' | 'both';
    otp_expiry_min: number;
  };
  require_scroll_completion: boolean;
  delimiters: Array<{
    key: string;
    type: string;
    required: boolean;
    assigned_to: number;
  }>;
}

interface SigningPageData {
  document: DocumentData;
  recipient: RecipientData;
  template: TemplateData;
  grace_period?: {
    active: boolean;
    message: string;
  } | null;
}

const SigningPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [mfaVerified, setMfaVerified] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signatureType, setSignatureType] = useState<'draw' | 'type' | 'upload' | null>(null);
  const [intentConfirmed, setIntentConfirmed] = useState(false);
  const [fieldData, setFieldData] = useState<Record<string, string>>({});
  const [scrollCompleted, setScrollCompleted] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showDelegateDialog, setShowDelegateDialog] = useState(false);
  const [delegateEmail, setDelegateEmail] = useState('');
  const [delegateName, setDelegateName] = useState('');
  const [delegatePhone, setDelegatePhone] = useState('');
  const [delegateReason, setDelegateReason] = useState('');
  
  const scrollAreaRef = useState<HTMLDivElement | null>(null);

  // Fetch document data
  const { data, isLoading, error } = useQuery<SigningPageData>({
    queryKey: ['signing-page', token],
    queryFn: async () => {
      const response = await axios.get(`/api/esign/public/sign/${token}`);
      return response.data;
    },
    retry: false,
  });

  // Check if MFA is required and not yet verified
  const requiresMFA = data?.template.mfa_config.enabled && !mfaVerified;

  // Send OTP mutation
  const sendOTPMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(`/api/esign/public/sign/${token}/send-otp`);
      return response.data;
    },
    onSuccess: () => {
      setOtpSent(true);
      toast.success('OTP sent successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to send OTP');
    },
  });

  // Verify OTP mutation
  const verifyOTPMutation = useMutation({
    mutationFn: async (otpCode: string) => {
      const response = await axios.post(`/api/esign/public/sign/${token}/verify-otp`, {
        otp: otpCode,
      });
      return response.data;
    },
    onSuccess: (data) => {
      setMfaVerified(true);
      toast.success('OTP verified successfully');
      // Update token if rotated
      if (data.token) {
        // Token rotation handled by backend
      }
    },
    onError: (error: any) => {
      const errorData = error.response?.data;
      if (errorData?.code === 'OTP_LOCKED') {
        toast.error(`Too many attempts. Try again in 30 minutes.`);
      } else if (errorData?.attempts_remaining !== undefined) {
        toast.error(`Invalid OTP. ${errorData.attempts_remaining} attempts remaining.`);
      } else {
        toast.error(errorData?.error || 'Failed to verify OTP');
      }
      setOtp('');
    },
  });

  // Submit signature mutation
  const submitSignatureMutation = useMutation({
    mutationFn: async () => {
      if (!signatureData || !signatureType) {
        throw new Error('Signature is required');
      }

      const response = await axios.post(`/api/esign/public/sign/${token}/submit`, {
        signature_image: signatureData,
        signature_type: signatureType,
        intent_confirmation: "I agree that this is my legal signature and I am bound by the terms of this document",
        field_data: fieldData,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Document signed successfully');
      navigate(`/esign/public/complete/${token}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to submit signature');
    },
  });

  // Decline signature mutation
  const declineSignatureMutation = useMutation({
    mutationFn: async (reason?: string) => {
      const response = await axios.post(`/api/esign/public/sign/${token}/decline`, {
        reason,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Document declined successfully');
      navigate(`/esign/public/declined/${token}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to decline document');
    },
  });

  // Delegate signing mutation
  const delegateSigningMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(`/api/esign/public/sign/${token}/delegate`, {
        delegate_email: delegateEmail,
        delegate_name: delegateName,
        delegate_phone: delegatePhone || undefined,
        reason: delegateReason || undefined,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Signing delegated successfully');
      setShowDelegateDialog(false);
      navigate(`/esign/public/delegated/${token}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delegate signing');
    },
  });

  // Mark scroll completion mutation
  const markScrollCompleteMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.get(`/api/esign/public/sign/${token}/scroll-complete`);
      return response.data;
    },
    onSuccess: () => {
      setScrollCompleted(true);
    },
  });

  // Handle scroll tracking
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!data?.template.require_scroll_completion) return;

    const target = e.target as HTMLDivElement;
    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;

    const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
    setScrollProgress(Math.min(progress, 100));

    // Check if scrolled to within 50 pixels of bottom
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    if (distanceFromBottom <= 50 && !scrollCompleted) {
      markScrollCompleteMutation.mutate();
    }
  };

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

  // Handle submit
  const handleSubmit = () => {
    if (!signatureData) {
      toast.error('Please provide your signature');
      return;
    }

    if (!intentConfirmed) {
      toast.error('Please confirm your intent to sign');
      return;
    }

    if (data?.template.require_scroll_completion && !scrollCompleted) {
      toast.error('Please scroll through the entire document before signing');
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

  // Handle decline
  const handleDecline = () => {
    if (window.confirm('Are you sure you want to decline this document?')) {
      declineSignatureMutation.mutate(undefined);
    }
  };

  // Handle delegate
  const handleDelegate = () => {
    if (!delegateEmail || !delegateName) {
      toast.error('Please provide delegate email and name');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(delegateEmail)) {
      toast.error('Please provide a valid email address');
      return;
    }

    delegateSigningMutation.mutate();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    const errorMessage = (error as any)?.response?.data?.error || 'Failed to load document';
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

  // MFA verification screen
  if (requiresMFA) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Verify Your Identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              For security purposes, please verify your identity before accessing this document.
            </p>

            {!otpSent ? (
              <Button
                onClick={() => sendOTPMutation.mutate()}
                disabled={sendOTPMutation.isPending}
                className="w-full"
              >
                {sendOTPMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Send Verification Code
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Enter Verification Code</Label>
                  <p className="text-xs text-muted-foreground">
                    A code has been sent to your {data.template.mfa_config.channel === 'both' ? 'email and phone' : data.template.mfa_config.channel}
                  </p>
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button
                  onClick={() => verifyOTPMutation.mutate(otp)}
                  disabled={otp.length !== 6 || verifyOTPMutation.isPending}
                  className="w-full"
                >
                  {verifyOTPMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Verify Code
                </Button>

                <Button
                  variant="outline"
                  onClick={() => sendOTPMutation.mutate()}
                  disabled={sendOTPMutation.isPending}
                  className="w-full"
                >
                  Resend Code
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main signing page
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-5xl mx-auto px-4 space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle>{data.template.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Recipient: {data.recipient.name} ({data.recipient.email})
            </p>
          </CardHeader>
        </Card>

        {/* Grace period warning */}
        {data.grace_period?.active && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {data.grace_period.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Scroll progress indicator */}
        {data.template.require_scroll_completion && !scrollCompleted && (
          <Alert>
            <AlertDescription>
              Please scroll through the entire document before signing. Progress: {Math.round(scrollProgress)}%
            </AlertDescription>
          </Alert>
        )}

        {/* Document content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Document</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea
              className="h-[500px] border rounded-md p-6 bg-white"
              onScroll={handleScroll}
            >
              <div dangerouslySetInnerHTML={{ __html: data.document.html_content }} />
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Recipient fields */}
        {data.template.delimiters.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Information</CardTitle>
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

        {/* Intent confirmation */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="intent-confirmation"
                checked={intentConfirmed}
                onCheckedChange={(checked) => setIntentConfirmed(checked as boolean)}
                disabled={submitSignatureMutation.isPending}
              />
              <div className="space-y-1">
                <Label
                  htmlFor="intent-confirmation"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  I agree that this is my legal signature and I am bound by the terms of this document
                </Label>
                <p className="text-xs text-muted-foreground">
                  By checking this box, you confirm that you have read and agree to the terms of this document.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="flex gap-4">
          <Button
            onClick={handleSubmit}
            disabled={
              !signatureData ||
              !intentConfirmed ||
              (data.template.require_scroll_completion && !scrollCompleted) ||
              submitSignatureMutation.isPending
            }
            className="flex-1"
          >
            {submitSignatureMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Sign Document
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowDelegateDialog(true)}
            disabled={delegateSigningMutation.isPending}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Delegate
          </Button>
          <Button
            variant="outline"
            onClick={handleDecline}
            disabled={declineSignatureMutation.isPending}
          >
            {declineSignatureMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            <X className="w-4 h-4 mr-2" />
            Decline
          </Button>
        </div>

        {/* Delegate Dialog */}
        <Dialog open={showDelegateDialog} onOpenChange={setShowDelegateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delegate Signing</DialogTitle>
              <DialogDescription>
                Transfer this signing responsibility to another person. They will receive a new signing link.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="delegate-email">
                  Delegate Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="delegate-email"
                  type="email"
                  placeholder="delegate@example.com"
                  value={delegateEmail}
                  onChange={(e) => setDelegateEmail(e.target.value)}
                  disabled={delegateSigningMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delegate-name">
                  Delegate Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="delegate-name"
                  type="text"
                  placeholder="John Doe"
                  value={delegateName}
                  onChange={(e) => setDelegateName(e.target.value)}
                  disabled={delegateSigningMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delegate-phone">Delegate Phone (Optional)</Label>
                <Input
                  id="delegate-phone"
                  type="tel"
                  placeholder="+1234567890"
                  value={delegatePhone}
                  onChange={(e) => setDelegatePhone(e.target.value)}
                  disabled={delegateSigningMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delegate-reason">Reason (Optional)</Label>
                <Input
                  id="delegate-reason"
                  type="text"
                  placeholder="Out of office"
                  value={delegateReason}
                  onChange={(e) => setDelegateReason(e.target.value)}
                  disabled={delegateSigningMutation.isPending}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDelegateDialog(false)}
                disabled={delegateSigningMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelegate}
                disabled={!delegateEmail || !delegateName || delegateSigningMutation.isPending}
              >
                {delegateSigningMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Delegate Signing
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default SigningPage;
