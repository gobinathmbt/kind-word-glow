
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, File, Image, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  accept: 'images' | 'files';
  multiple?: boolean;
  maxSize?: number;
  disabled?: boolean;
  className?: string;
}

const ACCEPTED_IMAGE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
};

const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'application/xml': ['.xml'],
  'text/xml': ['.xml'],
};

export const FileUpload: React.FC<FileUploadProps> = ({
  onFilesSelected,
  accept,
  multiple = false,
  maxSize = 10 * 1024 * 1024, // 10MB default
  disabled = false,
  className,
}) => {
  const [dragActive, setDragActive] = useState(false);

  const acceptedTypes = accept === 'images' ? ACCEPTED_IMAGE_TYPES : ACCEPTED_FILE_TYPES;

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      if (rejectedFiles.length > 0) {
        console.warn('Some files were rejected:', rejectedFiles);
      }
      
      if (acceptedFiles.length > 0) {
        onFilesSelected(acceptedFiles);
      }
    },
    [onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: acceptedTypes,
    multiple,
    maxSize,
    disabled,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
  });

  const getAcceptedExtensions = () => {
    return Object.values(acceptedTypes).flat().join(', ');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
        {
          'border-primary bg-primary/10': isDragActive && !isDragReject,
          'border-destructive bg-destructive/10': isDragReject,
          'border-muted-foreground/25 hover:border-muted-foreground/50': !isDragActive && !disabled,
          'opacity-50 cursor-not-allowed': disabled,
        },
        className
      )}
    >
      <input {...getInputProps()} />
      
      <div className="flex flex-col items-center space-y-4">
        {accept === 'images' ? (
          <Image className="h-12 w-12 text-muted-foreground" />
        ) : (
          <File className="h-12 w-12 text-muted-foreground" />
        )}
        
        <div className="space-y-2">
          <p className="text-lg font-medium">
            {isDragActive
              ? isDragReject
                ? 'Invalid file type'
                : `Drop your ${accept} here`
              : `Upload ${accept}`}
          </p>
          
          <p className="text-sm text-muted-foreground">
            Drag and drop {multiple ? 'files' : 'a file'} here, or click to browse
          </p>
          
          <div className="flex flex-col items-center space-y-1 text-xs text-muted-foreground">
            <p>Accepted formats: {getAcceptedExtensions()}</p>
            <p>Max size: {formatFileSize(maxSize)}</p>
            {multiple && <p>Multiple files supported</p>}
          </div>
        </div>
        
        <Button variant="outline" size="sm" disabled={disabled}>
          <Upload className="h-4 w-4 mr-2" />
          Select {accept === 'images' ? 'Images' : 'Files'}
        </Button>
      </div>
    </div>
  );
};

export interface FilePreviewProps {
  files: File[];
  onRemove: (index: number) => void;
  progress?: Record<string, number>;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  files,
  onRemove,
  progress = {},
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImage = (file: File) => file.type.startsWith('image/');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {files.map((file, index) => (
        <Card key={index} className="relative">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {isImage(file) ? (
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                    <File className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" title={file.name}>
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
                
                {progress[file.name] !== undefined && (
                  <div className="mt-2">
                    <Progress value={progress[file.name]} className="h-1" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {progress[file.name]}% uploaded
                    </p>
                  </div>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(index)}
                className="flex-shrink-0 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
