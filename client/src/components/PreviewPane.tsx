import { useEffect, useState } from 'react';
import { SearchResult } from '@/lib/types';
import { format } from 'date-fns';
import { FileText, Image as ImageIcon, Film, X, Eye, Download } from 'lucide-react';

interface PreviewPaneProps {
  result: SearchResult;
  onClose: () => void;
  isMobile?: boolean;
}

export default function PreviewPane({ result, onClose, isMobile = false }: PreviewPaneProps) {
  const [previewContent, setPreviewContent] = useState<string | null>(null);

  useEffect(() => {
    // For document files, we might want to fetch a preview
    if (result.fileType === 'document') {
      // This could fetch a text preview or first few pages
      // For simplicity, we'll just use the snippet
      setPreviewContent(result.snippet || 'No preview available');
    }
  }, [result]);

  // Determine icon and background color based on file type
  const getFileIcon = () => {
    switch (result.fileType) {
      case 'document':
        return {
          icon: <FileText className="text-blue-500 text-xl" />,
          bgColor: 'bg-blue-50'
        };
      case 'image':
        return {
          icon: <ImageIcon className="text-purple-500 text-xl" />,
          bgColor: 'bg-purple-50'
        };
      case 'video':
        return {
          icon: <Film className="text-red-500 text-xl" />,
          bgColor: 'bg-red-50'
        };
      default:
        return {
          icon: <FileText className="text-neutral-500 text-xl" />,
          bgColor: 'bg-neutral-50'
        };
    }
  };

  const { icon, bgColor } = getFileIcon();
  
  // Format date for display
  const formatDate = (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'MMMM d, yyyy');
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  // Open file in new tab
  const handleOpenFile = () => {
    window.open(`/api/files/${result.fileId}/content`, '_blank');
  };

  // Download file
  const handleDownloadFile = () => {
    const link = document.createElement('a');
    link.href = `/api/files/${result.fileId}/content`;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-neutral-200 p-4 flex items-center justify-between bg-neutral-50">
        <h3 className="font-medium text-neutral-800">Preview</h3>
        <button 
          className="p-1.5 text-neutral-400 hover:text-neutral-600 focus:outline-none"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="mb-4">
          <div className="flex items-start">
            <div className={`p-2 ${bgColor} rounded-lg mr-3`}>
              {icon}
            </div>
            <div>
              <h3 className="text-base font-medium text-neutral-900">
                {result.filename}
              </h3>
              <p className="mt-1 text-xs text-neutral-500">
                {result.mimeType.split('/')[1].toUpperCase()} • {formatFileSize(result.fileSize)} • Last modified {formatDate(result.modifiedAt)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="border border-neutral-200 rounded-lg p-4 mb-4 bg-neutral-50">
          <h4 className="text-sm font-medium text-neutral-700 mb-2">File Information</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-neutral-500">Created</div>
            <div className="text-neutral-700">{formatDate(result.createdAt)}</div>
            <div className="text-neutral-500">Modified</div>
            <div className="text-neutral-700">{formatDate(result.modifiedAt)}</div>
            <div className="text-neutral-500">Size</div>
            <div className="text-neutral-700">{formatFileSize(result.fileSize)}</div>
            <div className="text-neutral-500">Type</div>
            <div className="text-neutral-700">{result.mimeType}</div>
          </div>
        </div>
        
        <div className="mb-4">
          <h4 className="text-sm font-medium text-neutral-700 mb-2">Content Preview</h4>
          
          {result.fileType === 'document' && (
            <div className="bg-white border border-neutral-200 rounded-lg p-4 text-sm text-neutral-700 space-y-3">
              {previewContent ? (
                <p>{previewContent}</p>
              ) : (
                <p className="text-neutral-500">No preview available</p>
              )}
            </div>
          )}
          
          {result.fileType === 'image' && (
            <div className="bg-white border border-neutral-200 rounded-lg p-2">
              <img 
                src={`/api/files/${result.fileId}/content`}
                alt={result.filename}
                className="w-full object-contain rounded max-h-[300px]"
              />
            </div>
          )}
          
          {result.fileType === 'video' && (
            <div className="bg-white border border-neutral-200 rounded-lg p-2">
              <video 
                controls
                className="w-full rounded"
                src={`/api/files/${result.fileId}/content`}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}
        </div>
        
        <div className="flex space-x-2">
          <button 
            className="flex-1 flex items-center justify-center px-4 py-2 border border-neutral-300 rounded-md shadow-sm text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            onClick={handleOpenFile}
          >
            <Eye className="h-4 w-4 mr-1.5" />
            Open
          </button>
          <button 
            className="flex-1 flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            onClick={handleDownloadFile}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
