import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { esignServices } from "@/api/services";
import { toast } from "sonner";

interface Delimiter {
  key: string;
  type: string;
  required: boolean;
  default_value?: string;
}

interface TemplatePreviewDialogProps {
  templateId: string;
  delimiters: Delimiter[];
}

const TemplatePreviewDialog = ({
  templateId,
  delimiters,
}: TemplatePreviewDialogProps) => {
  const [open, setOpen] = useState(false);
  const [sampleValues, setSampleValues] = useState<Record<string, string>>({});

  const { data: preview, isLoading, refetch } = useQuery({
    queryKey: ["template-preview", templateId, sampleValues],
    queryFn: async () => {
      const response = await esignServices.previewTemplate(templateId, sampleValues);
      return response.data.data;
    },
    enabled: open,
  });

  const handleSampleValueChange = (key: string, value: string) => {
    setSampleValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handlePreview = () => {
    refetch();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Eye className="mr-2 h-4 w-4" />
          Preview Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Template Preview</DialogTitle>
          <DialogDescription>
            Preview your template with sample data
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-12 gap-4 h-[70vh]">
          {/* Sample Values Panel */}
          <div className="col-span-3">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Sample Values</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Enter sample values to preview. Leave empty to use defaults.
                </p>
              </div>

              <ScrollArea className="h-[calc(70vh-100px)]">
                <div className="space-y-3 pr-4">
                  {delimiters.map((delimiter) => (
                    <div key={delimiter.key} className="space-y-1">
                      <Label htmlFor={delimiter.key} className="text-xs">
                        {delimiter.key}
                        {delimiter.required && (
                          <span className="text-destructive ml-1">*</span>
                        )}
                      </Label>
                      <Input
                        id={delimiter.key}
                        type={delimiter.type === "email" ? "email" : delimiter.type === "phone" ? "tel" : "text"}
                        placeholder={delimiter.default_value || `[${delimiter.key}]`}
                        value={sampleValues[delimiter.key] || ""}
                        onChange={(e) =>
                          handleSampleValueChange(delimiter.key, e.target.value)
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <Button
                onClick={handlePreview}
                disabled={isLoading}
                className="w-full"
                size="sm"
              >
                {isLoading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Update Preview
              </Button>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="col-span-9">
            <div className="border rounded-md h-full overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : preview ? (
                <ScrollArea className="h-full">
                  <div
                    className="p-6 bg-white"
                    dangerouslySetInnerHTML={{ __html: preview.html }}
                  />
                </ScrollArea>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>Click "Update Preview" to see the template</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TemplatePreviewDialog;
