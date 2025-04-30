import { Wifi } from 'lucide-react';
import { UploadProgressInfo, UploadStatus } from '@/lib/types';

interface IndexingModalProps {
  isVisible: boolean;
  progress: number;
  files: UploadProgressInfo[];
  onCancel: () => void;
  onRunInBackground: () => void;
}

export default function IndexingModal({ 
  isVisible, 
  progress, 
  files, 
  onCancel, 
  onRunInBackground 
}: IndexingModalProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-neutral-900 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 text-primary-600 mb-4">
            <Wifi className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-medium text-neutral-900">Indexing Files</h3>
          <p className="mt-1 text-sm text-neutral-600">
            Your files are being processed and indexed for semantic search
          </p>
        </div>
        
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium text-neutral-700">Progress</span>
            <span className="text-neutral-500">{progress}%</span>
          </div>
          <div className="w-full bg-neutral-200 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
        
        <div className="mb-4 max-h-40 overflow-y-auto border border-neutral-200 rounded-lg divide-y divide-neutral-200">
          {files.map((file, index) => (
            <div key={index} className="flex items-center p-3">
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                {file.status === 'complete' ? (
                  <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : file.status === 'processing' ? (
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                ) : file.status === 'error' ? (
                  <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
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
                {file.status === 'processing' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Processing
                  </span>
                )}
                {file.status === 'error' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Error
                  </span>
                )}
                {file.status === 'waiting' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800">
                    Waiting
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex items-center justify-between">
          <button 
            className="px-4 py-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 focus:outline-none"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button 
            className="px-4 py-2 text-sm font-medium text-primary hover:text-primary-700 focus:outline-none"
            onClick={onRunInBackground}
          >
            Run in Background
          </button>
        </div>
      </div>
    </div>
  );
}
