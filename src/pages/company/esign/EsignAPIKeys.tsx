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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Key,
  Plus,
  Trash2,
  Copy,
  CheckCircle,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { esignServices } from "@/api/services";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface APIKey {
  _id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  last_used_at?: string;
  usage_count: number;
  created_at: string;
  revoked_at?: string;
}

interface GeneratedKey {
  id: string;
  name: string;
  api_key: string;
  api_secret: string;
  key_prefix: string;
  scopes: string[];
}

const EsignAPIKeys = () => {
  const queryClient = useQueryClient();
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showSecretDialog, setShowSecretDialog] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<GeneratedKey | null>(null);
  const [keyToRevoke, setKeyToRevoke] = useState<APIKey | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    "esign:create",
    "esign:status",
  ]);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);

  const availableScopes = [
    { value: "esign:create", label: "Create Documents", description: "Initiate e-sign workflows" },
    { value: "esign:status", label: "View Status", description: "Get document status" },
    { value: "esign:download", label: "Download PDFs", description: "Download signed documents" },
    { value: "esign:cancel", label: "Cancel Documents", description: "Cancel pending documents" },
    { value: "template:read", label: "Read Templates", description: "View template schemas" },
  ];

  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ["esign-api-keys"],
    queryFn: async () => {
      const response = await esignServices.getAPIKeys();
      return response.data.data;
    },
  });

  const generateMutation = useMutation({
    mutationFn: (data: any) => esignServices.generateAPIKey(data),
    onSuccess: (response) => {
      setGeneratedKey(response.data.data);
      setShowGenerateDialog(false);
      setShowSecretDialog(true);
      setNewKeyName("");
      setSelectedScopes(["esign:create", "esign:status"]);
      queryClient.invalidateQueries({ queryKey: ["esign-api-keys"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to generate API key");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => esignServices.revokeAPIKey(id),
    onSuccess: () => {
      toast.success("API key revoked successfully");
      setKeyToRevoke(null);
      queryClient.invalidateQueries({ queryKey: ["esign-api-keys"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to revoke API key");
    },
  });

  const handleGenerate = () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the API key");
      return;
    }

    if (selectedScopes.length === 0) {
      toast.error("Please select at least one scope");
      return;
    }

    generateMutation.mutate({
      name: newKeyName,
      scopes: selectedScopes,
    });
  };

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success(`${field} copied to clipboard`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleScopeToggle = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope)
        ? prev.filter((s) => s !== scope)
        : [...prev, scope]
    );
  };

  const handleCloseSecretDialog = () => {
    setShowSecretDialog(false);
    setGeneratedKey(null);
    setShowApiKey(false);
    setShowApiSecret(false);
  };

  return (
    <DashboardLayout title="API Keys">
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">API Keys</h1>
            <p className="text-muted-foreground">
              Manage API keys for external system integration
            </p>
          </div>
          <Button onClick={() => setShowGenerateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Generate API Key
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active API Keys</CardTitle>
            <CardDescription>
              API keys allow external systems to authenticate and interact with the e-sign platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : apiKeys && apiKeys.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Key Prefix</TableHead>
                    <TableHead>Scopes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((key: APIKey) => (
                    <TableRow key={key._id}>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {key.key_prefix}...
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {key.scopes.map((scope) => (
                            <Badge key={scope} variant="secondary" className="text-xs">
                              {scope}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {key.is_active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="destructive">Revoked</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {key.last_used_at
                          ? new Date(key.last_used_at).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        {new Date(key.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {key.is_active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setKeyToRevoke(key)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No API keys found</p>
                <p className="text-sm">Generate your first API key to get started</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generate API Key Dialog */}
        <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Generate New API Key</DialogTitle>
              <DialogDescription>
                Create a new API key for external system integration. The API secret will only be shown once.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="keyName">API Key Name</Label>
                <Input
                  id="keyName"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Production CRM Integration"
                />
              </div>

              <div className="space-y-2">
                <Label>Scopes</Label>
                <p className="text-sm text-muted-foreground">
                  Select the permissions this API key will have
                </p>
                <div className="space-y-3 border rounded-lg p-4">
                  {availableScopes.map((scope) => (
                    <div key={scope.value} className="flex items-start space-x-3">
                      <Checkbox
                        id={scope.value}
                        checked={selectedScopes.includes(scope.value)}
                        onCheckedChange={() => handleScopeToggle(scope.value)}
                      />
                      <div className="flex-1">
                        <label
                          htmlFor={scope.value}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {scope.label}
                        </label>
                        <p className="text-sm text-muted-foreground">
                          {scope.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowGenerateDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
              >
                {generateMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Generate API Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Show Generated Secret Dialog */}
        <Dialog open={showSecretDialog} onOpenChange={handleCloseSecretDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                API Key Generated Successfully
              </DialogTitle>
              <DialogDescription>
                Save these credentials securely. The API secret will not be shown again.
              </DialogDescription>
            </DialogHeader>

            {generatedKey && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showApiKey ? "text" : "password"}
                        value={generatedKey.api_key}
                        readOnly
                        className="font-mono text-sm pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => handleCopy(generatedKey.api_key, "API Key")}
                    >
                      {copiedField === "API Key" ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>API Secret</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showApiSecret ? "text" : "password"}
                        value={generatedKey.api_secret}
                        readOnly
                        className="font-mono text-sm pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowApiSecret(!showApiSecret)}
                      >
                        {showApiSecret ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => handleCopy(generatedKey.api_secret, "API Secret")}
                    >
                      {copiedField === "API Secret" ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Important:</strong> Store these credentials securely. The API secret cannot be retrieved again. If you lose it, you'll need to generate a new API key.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Scopes</Label>
                  <div className="flex flex-wrap gap-2">
                    {generatedKey.scopes.map((scope) => (
                      <Badge key={scope} variant="secondary">
                        {scope}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button onClick={handleCloseSecretDialog}>
                I've Saved the Credentials
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Revoke Confirmation Dialog */}
        <AlertDialog
          open={!!keyToRevoke}
          onOpenChange={() => setKeyToRevoke(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
              <AlertDialogDescription>
                This will immediately revoke the API key "{keyToRevoke?.name}". All requests using this key will be rejected. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => keyToRevoke && revokeMutation.mutate(keyToRevoke._id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {revokeMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Revoke API Key
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default EsignAPIKeys;
