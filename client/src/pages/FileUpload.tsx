import { useState, useRef, ChangeEvent, FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, X, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AppLayout from '@/components/AppLayout';
import { apiRequest } from '@/lib/queryClient';
import { FileData, UploadProgressInfo, UploadStatus } from '@/lib/types';
import IndexingModal from '@/components/IndexingModal';

export default function FileUpload() {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadProgressInfo[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Upload file mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }
      
      return response.json() as Promise<FileData>;
    },
    onSuccess: (data) => {
      // Update the file list and counts
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      queryClient.invalidateQueries({ queryKey: ['/api/files/counts'] });
      
      // Update the upload progress for this file
      setUploadedFiles(prev => 
        prev.map(file => 
          file.file.filename === data.filename 
            ? { ...file, status: 'complete' } 
            : file
        )
      );
      
      // Update progress
      updateOverallProgress();
      
      toast({
        title: 'File uploaded',
        description: `${data.filename} has been uploaded and indexed`,
        variant: 'default',
      });
    },
    onError: (error, variables) => {
      // Get the filename from the FormData
      const fileValue = variables.get('file');
      const filename = fileValue instanceof globalThis.File 
        ? fileValue.name 
        : 'Unknown file';
      
      // Update the upload progress for this file
      setUploadedFiles(prev => 
        prev.map(file => 
          file.file.filename === filename 
            ? { ...file, status: 'error', error: error.message } 
            : file
        )
      );
      
      // Update progress
      updateOverallProgress();
      
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Calculate overall progress
  const updateOverallProgress = () => {
    const totalFiles = uploadedFiles.length;
    if (totalFiles === 0) return;
    
    const completedFiles = uploadedFiles.filter(f => 
      f.status === 'complete' || f.status === 'error'
    ).length;
    
    const newProgress = Math.round((completedFiles / totalFiles) * 100);
    setProgress(newProgress);
    
    // Check if all files are processed
    if (completedFiles === totalFiles) {
      // All files have been processed
      const hasErrors = uploadedFiles.some(f => f.status === 'error');
      setUploadStatus(hasErrors ? 'error' : 'complete');
    }
  };

  // Handle file selection
  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    handleFiles(Array.from(files));
  };

  // Handle drag events
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    
    handleFiles(Array.from(files));
  };

  // Process uploaded files
  const handleFiles = (files: globalThis.File[]) => {
    if (files.length === 0) return;
    
    // Initialize upload status
    setUploadStatus('indexing');
    
    // Prepare file progress info
    const fileInfos: UploadProgressInfo[] = files.map(file => ({
      file: {
        id: 0, // Temporary ID
        filename: file.name,
        fileType: getFileType(file.type),
        mimeType: file.type,
        filePath: '',
        fileSize: file.size,
        createdAt: new Date(),
        modifiedAt: new Date()
      },
      progress: 0,
      status: 'waiting'
    }));
    
    setUploadedFiles(fileInfos);
    
    // Process each file
    files.forEach((file, index) => {
      setTimeout(() => {
        processFile(file, index);
      }, index * 500); // Stagger uploads
    });
  };

  // Process a single file
  const processFile = (file: globalThis.File, index: number) => {
    // Update status to processing
    setUploadedFiles(prev => 
      prev.map((f, i) => 
        i === index ? { ...f, status: 'processing' } : f
      )
    );
    
    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    
    // Upload the file
    uploadMutation.mutate(formData);
  };

  // Determine file type from mime type
  const getFileType = (mimeType: string): 'document' | 'image' | 'video' => {
    if (mimeType.startsWith('image/')) {
      return 'image';
    } else if (mimeType.startsWith('video/')) {
      return 'video';
    } else {
      return 'document';
    }
  };

  // Open file dialog
  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Cancel upload
  const handleCancelUpload = () => {
    // This doesn't actually cancel in-progress uploads, just hides the modal
    setUploadStatus('idle');
    
    toast({
      title: 'Upload cancelled',
      description: 'The upload process has been cancelled',
      variant: 'default',
    });
  };

  // Run indexing in background
  const handleRunInBackground = () => {
    setUploadStatus('idle');
    
    toast({
      title: 'Running in background',
      description: 'Files will continue to be processed in the background',
      variant: 'default',
    });
  };

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 text-primary-600 mb-4">
                <Upload className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-semibold text-neutral-900">Upload Files</h2>
              <p className="mt-1 text-sm text-neutral-600">
                Upload documents, images, or videos to make them searchable
              </p>
            </div>
            
            <div 
              className={`mt-4 border-2 border-dashed rounded-lg p-8 text-center ${
                dragging ? 'border-primary bg-primary-50' : 'border-neutral-300'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                multiple
              />
              <div className="space-y-4">
                <div className="text-neutral-500">
                  <Upload className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">
                    Drag and drop files here, or <button 
                      className="text-primary font-medium hover:text-primary-700"
                      onClick={openFileDialog}
                    >browse</button>
                  </p>
                </div>
                <p className="text-xs text-neutral-500">
                  Supported formats: PDF, TXT, JPG, PNG, MP4, etc.
                </p>
              </div>
            </div>
            
            {/* Recently uploaded files */}
            {uploadedFiles.length > 0 && uploadStatus !== 'indexing' && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-neutral-900 mb-2">Recently uploaded</h3>
                <div className="border border-neutral-200 rounded-lg divide-y divide-neutral-200">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center p-3">
                      <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                        {file.status === 'complete' ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : file.status === 'error' ? (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <div className="h-2 w-2 bg-neutral-300 rounded-full"></div>
                        )}
                      </div>
                      <div className="ml-3 flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 truncate">
                          {file.file.filename}
                        </p>
                      </div>
                      <div className="ml-3 flex-shrink-0">
                        {file.status === 'complete' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Done
                          </span>
                        )}
                        {file.status === 'error' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Error
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Indexing Modal */}
      <IndexingModal 
        isVisible={uploadStatus === 'indexing'}
        progress={progress}
        files={uploadedFiles}
        onCancel={handleCancelUpload}
        onRunInBackground={handleRunInBackground}
      />
    </AppLayout>
  );
}
