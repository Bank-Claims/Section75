import { useState, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { X, Upload, File, CheckCircle } from "lucide-react";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (result: any) => void;
  buttonClassName?: string;
  children: ReactNode;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  uploadURL?: string;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    setShowModal(true);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Validate file count
    if (files.length > maxNumberOfFiles) {
      alert(`Maximum ${maxNumberOfFiles} files allowed`);
      return;
    }

    // Validate file sizes
    const oversizedFiles = files.filter(file => file.size > maxFileSize);
    if (oversizedFiles.length > 0) {
      alert(`Files too large. Maximum size: ${(maxFileSize / 1024 / 1024).toFixed(1)}MB`);
      return;
    }

    // Add files to uploading state
    const newFiles: UploadingFile[] = files.map(file => ({
      file,
      progress: 0,
      status: 'pending'
    }));

    setUploadingFiles(newFiles);
    startUploads(newFiles);
  };

  const startUploads = async (files: UploadingFile[]) => {
    for (const uploadingFile of files) {
      try {
        // Set to uploading
        setUploadingFiles(prev => prev.map(f => 
          f.file === uploadingFile.file ? { ...f, status: 'uploading' } : f
        ));

        // Get upload URL
        const { url } = await onGetUploadParameters();
        
        // Upload file
        const response = await fetch(url, {
          method: 'PUT',
          body: uploadingFile.file,
          headers: {
            'Content-Type': uploadingFile.file.type,
          },
        });

        if (response.ok) {
          // Mark as completed
          setUploadingFiles(prev => prev.map(f => 
            f.file === uploadingFile.file ? { ...f, status: 'completed', progress: 100, uploadURL: url } : f
          ));
        } else {
          throw new Error('Upload failed');
        }
      } catch (error) {
        // Mark as error
        setUploadingFiles(prev => prev.map(f => 
          f.file === uploadingFile.file ? { ...f, status: 'error' } : f
        ));
      }
    }

    // Call onComplete when all uploads are done
    setTimeout(() => {
      const completedFiles = files.filter(f => f.status === 'completed');
      if (completedFiles.length > 0) {
        onComplete?.({
          successful: completedFiles.map(f => ({
            name: f.file.name,
            uploadURL: f.uploadURL,
          }))
        });
      }
    }, 500);
  };

  const removeFile = (fileToRemove: File) => {
    setUploadingFiles(prev => prev.filter(f => f.file !== fileToRemove));
  };

  const closeModal = () => {
    setShowModal(false);
    setUploadingFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <Button onClick={handleButtonClick} className={buttonClassName} data-testid="button-object-uploader">
        {children}
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {uploadingFiles.length === 0 ? (
              <div className="text-center py-8">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  Select files to upload (max {maxNumberOfFiles} files, {(maxFileSize / 1024 / 1024).toFixed(1)}MB each)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple={maxNumberOfFiles > 1}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                />
                <Button onClick={() => fileInputRef.current?.click()} data-testid="button-select-files">
                  Select Files
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {uploadingFiles.map((uploadingFile, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 border rounded">
                    <File className="h-4 w-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{uploadingFile.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(uploadingFile.file.size / 1024 / 1024).toFixed(1)}MB
                      </p>
                      {uploadingFile.status === 'uploading' && (
                        <Progress value={uploadingFile.progress} className="h-1 mt-1" />
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {uploadingFile.status === 'completed' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {uploadingFile.status === 'error' && (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                      {uploadingFile.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFile(uploadingFile.file)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                
                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={closeModal}>
                    Done
                  </Button>
                  {uploadingFiles.every(f => f.status === 'completed' || f.status === 'error') && (
                    <Button onClick={() => fileInputRef.current?.click()}>
                      Add More Files
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
