import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { esignServices } from "@/api/services";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Upload, FileText, Settings, Users, Layout } from "lucide-react";
import FieldPlacer from "@/components/esign/FieldPlacer";
import TemplatePreviewDialog from "@/components/esign/TemplatePreviewDialog";
import TemplateSchemaViewer from "@/components/esign/TemplateSchemaViewer";

interface TemplateFormData {
  name: string;
  description?: string;
  html_content: string;
  signature_type: string;
  delimiters?: any[];
  recipients?: any[];
}

const TemplateEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = id === "new";

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<TemplateFormData>({
    defaultValues: {
      name: "",
      description: "",
      html_content: "",
      signature_type: "single",
      delimiters: [],
      recipients: [],
    },
  });

  const { data: template, isLoading } = useQuery({
    queryKey: ["esign-template", id],
    queryFn: async () => {
      if (isNew) return null;
      const response = await esignServices.getTemplate(id!);
      return response.data.data;
    },
    enabled: !isNew,
  });

  useEffect(() => {
    if (template) {
      setValue("name", template.name);
      setValue("description", template.description || "");
      setValue("html_content", template.html_content);
      setValue("signature_type", template.signature_type);
      setValue("delimiters", template.delimiters || []);
      setValue("recipients", template.recipients || []);
    }
  }, [template, setValue]);

  const saveMutation = useMutation({
    mutationFn: (data: TemplateFormData) => {
      if (isNew) {
        return esignServices.createTemplate(data);
      } else {
        return esignServices.updateTemplate(id!, data);
      }
    },
    onSuccess: (response) => {
      toast.success(isNew ? "Template created successfully" : "Template updated successfully");
      queryClient.invalidateQueries({ queryKey: ["esign-templates"] });
      queryClient.invalidateQueries({ queryKey: ["esign-template", id] });
      
      if (isNew) {
        navigate(`/company/esign/templates/${response.data.data._id}`);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to save template");
    },
  });

  const handlePdfUpload = async () => {
    if (!pdfFile) {
      toast.error("Please select a PDF file");
      return;
    }

    if (isNew) {
      toast.error("Please save the template first before uploading a PDF");
      return;
    }

    setUploading(true);
    try {
      const response = await esignServices.uploadPDF(id!, pdfFile);
      setValue("html_content", response.data.data.html_content);
      toast.success("PDF uploaded and converted successfully");
      setPdfFile(null);
      
      // Extract delimiters after PDF upload
      await esignServices.extractDelimiters(id!);
      queryClient.invalidateQueries({ queryKey: ["esign-template", id] });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to upload PDF");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = (data: TemplateFormData) => {
    saveMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Loading...">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={isNew ? "Create Template" : "Edit Template"}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {isNew ? "Create Template" : "Edit Template"}
            </h1>
            <p className="text-muted-foreground">
              {isNew
                ? "Create a new e-signature template"
                : `Editing: ${template?.name}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/company/esign/templates")}>
              Cancel
            </Button>
            {!isNew && watch("delimiters")?.length > 0 && (
              <>
                <TemplatePreviewDialog
                  templateId={id!}
                  delimiters={watch("delimiters") || []}
                />
                <TemplateSchemaViewer templateId={id!} />
              </>
            )}
            <Button onClick={handleSubmit(onSubmit)} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save Template
            </Button>
          </div>
        </div>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList>
            <TabsTrigger value="basic">
              <FileText className="w-4 h-4 mr-2" />
              Basic Info
            </TabsTrigger>
            <TabsTrigger value="content">
              <Upload className="w-4 h-4 mr-2" />
              Content
            </TabsTrigger>
            <TabsTrigger value="fields">
              <Layout className="w-4 h-4 mr-2" />
              Field Placement
            </TabsTrigger>
            <TabsTrigger value="workflow">
              <Users className="w-4 h-4 mr-2" />
              Workflow
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Configure the basic details of your template
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    {...register("name", { required: "Template name is required" })}
                    placeholder="Enter template name"
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...register("description")}
                    placeholder="Enter template description"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signature_type">Signature Type *</Label>
                  <Select
                    value={watch("signature_type")}
                    onValueChange={(value) => setValue("signature_type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select signature type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single - One signer</SelectItem>
                      <SelectItem value="multiple">Parallel - Multiple signers (any order)</SelectItem>
                      <SelectItem value="hierarchy">Sequential - Multiple signers (specific order)</SelectItem>
                      <SelectItem value="send_to_all">Broadcast - Send to all independently</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content">
            <Card>
              <CardHeader>
                <CardTitle>Template Content</CardTitle>
                <CardDescription>
                  Upload a PDF or edit HTML content directly
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isNew && (
                  <div className="space-y-2">
                    <Label>Upload PDF</Label>
                    <div className="flex gap-2">
                      <Input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                      />
                      <Button
                        onClick={handlePdfUpload}
                        disabled={!pdfFile || uploading}
                      >
                        {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Upload className="mr-2 h-4 w-4" />
                        Upload
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Upload a PDF file (max 10MB) to convert to HTML
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="html_content">HTML Content *</Label>
                  <Textarea
                    id="html_content"
                    {...register("html_content", { required: "HTML content is required" })}
                    placeholder="Enter HTML content or upload a PDF"
                    rows={15}
                    className="font-mono text-sm"
                  />
                  {errors.html_content && (
                    <p className="text-sm text-destructive">{errors.html_content.message}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Use delimiters like {`{{client_name}}`} for dynamic content
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fields">
            <Card>
              <CardHeader>
                <CardTitle>Field Placement</CardTitle>
                <CardDescription>
                  Drag and drop fields onto the document canvas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!isNew && watch("html_content") && watch("recipients")?.length > 0 ? (
                  <FieldPlacer
                    htmlContent={watch("html_content")}
                    delimiters={watch("delimiters") || []}
                    recipients={watch("recipients") || []}
                    onDelimitersChange={(delimiters) => setValue("delimiters", delimiters)}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {isNew ? (
                      <p>Please save the template first before placing fields</p>
                    ) : !watch("html_content") ? (
                      <p>Please add HTML content or upload a PDF first</p>
                    ) : (
                      <p>Please configure recipients in the Workflow tab first</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workflow">
            <Card>
              <CardHeader>
                <CardTitle>Workflow Configuration</CardTitle>
                <CardDescription>
                  Configure recipients and signing workflow (Coming soon)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Recipient and workflow configuration will be available in the next update.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Template Settings</CardTitle>
                <CardDescription>
                  Configure MFA, notifications, and other settings (Coming soon)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Advanced settings will be available in the next update.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default TemplateEditor;
