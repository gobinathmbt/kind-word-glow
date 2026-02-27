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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Code, Copy, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { esignServices } from "@/api/services";
import { toast } from "sonner";

interface TemplateSchemaViewerProps {
  templateId: string;
}

const TemplateSchemaViewer = ({ templateId }: TemplateSchemaViewerProps) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: schema, isLoading } = useQuery({
    queryKey: ["template-schema", templateId],
    queryFn: async () => {
      const response = await esignServices.getTemplateSchema(templateId);
      return response.data.data;
    },
    enabled: open,
  });

  const handleCopy = () => {
    if (schema) {
      navigator.clipboard.writeText(JSON.stringify(schema, null, 2));
      setCopied(true);
      toast.success("Schema copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Code className="mr-2 h-4 w-4" />
          View API Schema
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Template API Schema</DialogTitle>
          <DialogDescription>
            Use this schema to integrate with the E-Sign API
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              This JSON schema defines the payload structure for creating documents from this template.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={!schema}
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-3 w-3" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-3 w-3" />
                  Copy Schema
                </>
              )}
            </Button>
          </div>

          <ScrollArea className="h-[60vh] border rounded-md">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Loading schema...</p>
              </div>
            ) : schema ? (
              <pre className="p-4 text-xs font-mono">
                {JSON.stringify(schema, null, 2)}
              </pre>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No schema available</p>
              </div>
            )}
          </ScrollArea>

          {schema && (
            <div className="space-y-2 text-sm">
              <h4 className="font-medium">Quick Reference:</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  <strong>Template ID:</strong> {schema.template_id}
                </li>
                <li>
                  <strong>Signature Type:</strong> {schema.signature_type}
                </li>
                <li>
                  <strong>Required Fields:</strong> {schema.required_fields?.length || 0}
                </li>
                <li>
                  <strong>Total Fields:</strong> {Object.keys(schema.fields || {}).length}
                </li>
                <li>
                  <strong>Recipients:</strong> {schema.recipients?.length || 0}
                </li>
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateSchemaViewer;
