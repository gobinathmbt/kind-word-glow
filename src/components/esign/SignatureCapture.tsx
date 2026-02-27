import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Pen, Type, Upload, Trash2, Check } from "lucide-react";

interface SignatureCaptureProps {
  onSignatureCapture: (signatureData: string, signatureType: 'draw' | 'type' | 'upload') => void;
  disabled?: boolean;
}

const SignatureCapture = ({ onSignatureCapture, disabled = false }: SignatureCaptureProps) => {
  const [activeTab, setActiveTab] = useState<'draw' | 'type' | 'upload'>('draw');
  const [isDrawing, setIsDrawing] = useState(false);
  const [typedSignature, setTypedSignature] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [capturedSignature, setCapturedSignature] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 600;
    canvas.height = 200;

    // Set drawing styles
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setCapturedSignature(null);
  };

  const captureDrawnSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check if canvas is empty
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let isEmpty = true;

    for (let i = 0; i < pixels.length; i += 4) {
      // Check if pixel is not white
      if (pixels[i] !== 255 || pixels[i + 1] !== 255 || pixels[i + 2] !== 255) {
        isEmpty = false;
        break;
      }
    }

    if (isEmpty) {
      toast.error('Please draw your signature first');
      return;
    }

    // Convert canvas to base64 PNG
    const signatureData = canvas.toDataURL('image/png');
    setCapturedSignature(signatureData);
    onSignatureCapture(signatureData, 'draw');
    toast.success('Signature captured successfully');
  };

  // Typed signature handlers
  const renderTypedSignature = async () => {
    if (!typedSignature.trim()) {
      toast.error('Please enter your name');
      return;
    }

    // Create a temporary canvas to render typed signature
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 600;
    tempCanvas.height = 200;
    const ctx = tempCanvas.getContext('2d');
    
    if (!ctx) return;

    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Set signature font
    ctx.font = '48px "Brush Script MT", cursive';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw text
    ctx.fillText(typedSignature, tempCanvas.width / 2, tempCanvas.height / 2);

    // Convert to base64 PNG
    const signatureData = tempCanvas.toDataURL('image/png');
    setCapturedSignature(signatureData);
    onSignatureCapture(signatureData, 'type');
    toast.success('Signature created successfully');
  };

  // Upload signature handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PNG, JPG, or JPEG file');
      return;
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size > maxSize) {
      toast.error('Signature image must be less than 2MB');
      return;
    }

    // Read file and resize
    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas to resize image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Calculate new dimensions (max width 400px, maintain aspect ratio)
        const maxWidth = 400;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        // Set canvas size
        canvas.width = width;
        canvas.height = height;

        // Draw image
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64 PNG
        const signatureData = canvas.toDataURL('image/png');
        setUploadedImage(signatureData);
        setCapturedSignature(signatureData);
        onSignatureCapture(signatureData, 'upload');
        toast.success('Signature uploaded successfully');
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  };

  const clearUpload = () => {
    setUploadedImage(null);
    setCapturedSignature(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="draw" disabled={disabled}>
              <Pen className="w-4 h-4 mr-2" />
              Draw
            </TabsTrigger>
            <TabsTrigger value="type" disabled={disabled}>
              <Type className="w-4 h-4 mr-2" />
              Type
            </TabsTrigger>
            <TabsTrigger value="upload" disabled={disabled}>
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </TabsTrigger>
          </TabsList>

          {/* Draw Signature Tab */}
          <TabsContent value="draw" className="space-y-4">
            <div className="space-y-2">
              <Label>Draw your signature below</Label>
              <div className="border-2 border-dashed rounded-md overflow-hidden">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full cursor-crosshair touch-none"
                  style={{ maxWidth: '600px', height: '200px' }}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={clearCanvas}
                disabled={disabled}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear
              </Button>
              <Button
                type="button"
                onClick={captureDrawnSignature}
                disabled={disabled}
              >
                <Check className="w-4 h-4 mr-2" />
                Use This Signature
              </Button>
            </div>
          </TabsContent>

          {/* Type Signature Tab */}
          <TabsContent value="type" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="typed-signature">Type your full name</Label>
              <Input
                id="typed-signature"
                type="text"
                placeholder="John Doe"
                value={typedSignature}
                onChange={(e) => setTypedSignature(e.target.value)}
                disabled={disabled}
                className="text-lg"
              />
            </div>

            {typedSignature && (
              <div className="border-2 border-dashed rounded-md p-8 bg-white">
                <p
                  className="text-center text-5xl"
                  style={{ fontFamily: '"Brush Script MT", cursive' }}
                >
                  {typedSignature}
                </p>
              </div>
            )}

            <Button
              type="button"
              onClick={renderTypedSignature}
              disabled={disabled || !typedSignature.trim()}
              className="w-full"
            >
              <Check className="w-4 h-4 mr-2" />
              Use This Signature
            </Button>
          </TabsContent>

          {/* Upload Signature Tab */}
          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="upload-signature">Upload signature image</Label>
              <p className="text-sm text-muted-foreground">
                Accepted formats: PNG, JPG, JPEG (max 2MB)
              </p>
              <Input
                ref={fileInputRef}
                id="upload-signature"
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleFileUpload}
                disabled={disabled}
              />
            </div>

            {uploadedImage && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="border-2 border-dashed rounded-md p-4 bg-white flex items-center justify-center">
                  <img
                    src={uploadedImage}
                    alt="Uploaded signature"
                    className="max-w-full max-h-[200px]"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearUpload}
                  disabled={disabled}
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {capturedSignature && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-2 text-green-700">
              <Check className="w-5 h-5" />
              <span className="font-medium">Signature ready to submit</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SignatureCapture;
