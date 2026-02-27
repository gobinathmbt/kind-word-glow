import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  FileSignature,
  Type,
  Calendar,
  Mail,
  Phone,
  Trash2,
  GripVertical,
} from "lucide-react";

interface Delimiter {
  key: string;
  type: "text" | "email" | "phone" | "date" | "number" | "signature" | "initial";
  required: boolean;
  default_value?: string;
  assigned_to?: number;
  position?: {
    x: number;
    y: number;
    page: number;
  };
}

interface RecipientConfig {
  signature_order: number;
  label: string;
}

interface FieldPlacerProps {
  htmlContent: string;
  delimiters: Delimiter[];
  recipients: RecipientConfig[];
  onDelimitersChange: (delimiters: Delimiter[]) => void;
}

interface FieldType {
  type: Delimiter["type"];
  label: string;
  icon: React.ReactNode;
}

const fieldTypes: FieldType[] = [
  { type: "signature", label: "Signature", icon: <FileSignature className="w-4 h-4" /> },
  { type: "text", label: "Text", icon: <Type className="w-4 h-4" /> },
  { type: "date", label: "Date", icon: <Calendar className="w-4 h-4" /> },
  { type: "email", label: "Email", icon: <Mail className="w-4 h-4" /> },
  { type: "phone", label: "Phone", icon: <Phone className="w-4 h-4" /> },
];

const FieldPlacer = ({
  htmlContent,
  delimiters,
  recipients,
  onDelimitersChange,
}: FieldPlacerProps) => {
  const [selectedFieldType, setSelectedFieldType] = useState<Delimiter["type"]>("signature");
  const [selectedRecipient, setSelectedRecipient] = useState<number | undefined>(
    recipients[0]?.signature_order
  );
  const [placedFields, setPlacedFields] = useState<Delimiter[]>(
    delimiters.filter((d) => d.position)
  );
  const [draggedField, setDraggedField] = useState<FieldType | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPlacedFields(delimiters.filter((d) => d.position));
  }, [delimiters]);

  const handleDragStart = (fieldType: FieldType) => {
    setDraggedField(fieldType);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();

    if (!draggedField || !canvasRef.current) return;

    if (!selectedRecipient) {
      toast.error("Please select a recipient first");
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Generate unique key for the field
    const fieldKey = `${draggedField.type}_${Date.now()}`;

    // Check if field is already assigned to another recipient
    const existingField = delimiters.find(
      (d) => d.key === fieldKey && d.assigned_to && d.assigned_to !== selectedRecipient
    );

    if (existingField) {
      toast.error("This field is already assigned to another recipient");
      return;
    }

    // Create new delimiter
    const newDelimiter: Delimiter = {
      key: fieldKey,
      type: draggedField.type,
      required: draggedField.type === "signature",
      assigned_to: selectedRecipient,
      position: {
        x: Math.round(x),
        y: Math.round(y),
        page: 1, // For now, single page support
      },
    };

    // Add to delimiters
    const updatedDelimiters = [...delimiters, newDelimiter];
    onDelimitersChange(updatedDelimiters);
    setPlacedFields([...placedFields, newDelimiter]);

    toast.success(`${draggedField.label} field placed successfully`);
    setDraggedField(null);
  };

  const handleRemoveField = (fieldKey: string) => {
    // Remove from delimiters
    const updatedDelimiters = delimiters.filter((d) => d.key !== fieldKey);
    onDelimitersChange(updatedDelimiters);
    setPlacedFields(placedFields.filter((f) => f.key !== fieldKey));
    toast.success("Field removed successfully");
  };

  const handleRecipientChange = (fieldKey: string, recipientOrder: number) => {
    // Check if field is already assigned to another recipient
    const field = delimiters.find((d) => d.key === fieldKey);
    if (!field) return;

    // Check if any other field with same key is assigned to different recipient
    const conflictingField = delimiters.find(
      (d) => d.key === fieldKey && d.assigned_to && d.assigned_to !== recipientOrder
    );

    if (conflictingField) {
      toast.error("Cannot assign same field to multiple recipients");
      return;
    }

    // Update delimiter
    const updatedDelimiters = delimiters.map((d) =>
      d.key === fieldKey ? { ...d, assigned_to: recipientOrder } : d
    );
    onDelimitersChange(updatedDelimiters);
    setPlacedFields(updatedDelimiters.filter((d) => d.position));
    toast.success("Field recipient updated");
  };

  const getRecipientLabel = (order: number) => {
    const recipient = recipients.find((r) => r.signature_order === order);
    return recipient?.label || `Recipient ${order}`;
  };

  const getFieldIcon = (type: Delimiter["type"]) => {
    const fieldType = fieldTypes.find((f) => f.type === type);
    return fieldType?.icon || <Type className="w-4 h-4" />;
  };

  return (
    <div className="grid grid-cols-12 gap-4 h-[600px]">
      {/* Field Palette */}
      <div className="col-span-3">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-sm">Field Palette</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Recipient</Label>
              <Select
                value={selectedRecipient?.toString()}
                onValueChange={(value) => setSelectedRecipient(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent>
                  {recipients.map((recipient) => (
                    <SelectItem
                      key={recipient.signature_order}
                      value={recipient.signature_order.toString()}
                    >
                      {recipient.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Drag Fields to Canvas</Label>
              <div className="space-y-2">
                {fieldTypes.map((fieldType) => (
                  <div
                    key={fieldType.type}
                    draggable
                    onDragStart={() => handleDragStart(fieldType)}
                    className="flex items-center gap-2 p-3 border rounded-md cursor-move hover:bg-accent transition-colors"
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    {fieldType.icon}
                    <span className="text-sm">{fieldType.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Placed Fields ({placedFields.length})</Label>
              <ScrollArea className="h-[200px] border rounded-md p-2">
                {placedFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No fields placed yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {placedFields.map((field) => (
                      <div
                        key={field.key}
                        className="flex items-center justify-between p-2 border rounded-md text-sm"
                      >
                        <div className="flex items-center gap-2">
                          {getFieldIcon(field.type)}
                          <span className="capitalize">{field.type}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={field.assigned_to?.toString()}
                            onValueChange={(value) =>
                              handleRecipientChange(field.key, parseInt(value))
                            }
                          >
                            <SelectTrigger className="h-7 w-[100px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {recipients.map((recipient) => (
                                <SelectItem
                                  key={recipient.signature_order}
                                  value={recipient.signature_order.toString()}
                                >
                                  R{recipient.signature_order}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveField(field.key)}
                            className="h-7 w-7 p-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Canvas */}
      <div className="col-span-9">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-sm">Document Canvas</CardTitle>
          </CardHeader>
          <CardContent className="h-[calc(100%-60px)]">
            <div
              ref={canvasRef}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="relative w-full h-full border-2 border-dashed rounded-md overflow-auto bg-white"
            >
              {/* Render HTML content */}
              <div
                className="p-4"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />

              {/* Render placed fields */}
              {placedFields.map((field) => (
                <div
                  key={field.key}
                  style={{
                    position: "absolute",
                    left: `${field.position?.x}px`,
                    top: `${field.position?.y}px`,
                  }}
                  className="flex items-center gap-1 px-2 py-1 bg-blue-100 border-2 border-blue-500 rounded text-xs font-medium cursor-pointer hover:bg-blue-200"
                  title={`${field.type} - ${getRecipientLabel(field.assigned_to!)}`}
                >
                  {getFieldIcon(field.type)}
                  <span className="capitalize">{field.type}</span>
                  <span className="text-blue-600">
                    (R{field.assigned_to})
                  </span>
                </div>
              ))}

              {/* Drop zone hint */}
              {draggedField && (
                <div className="absolute inset-0 bg-blue-50 bg-opacity-50 flex items-center justify-center pointer-events-none">
                  <p className="text-lg font-medium text-blue-600">
                    Drop field here to place
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FieldPlacer;
