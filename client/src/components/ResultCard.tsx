import { useState } from 'react';
import { FileText, Image as ImageIcon, Film, PlayCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { SearchResult } from '@/lib/types';

interface ResultCardProps {
  result: SearchResult;
  onClick: () => void;
}

export default function ResultCard({ result, onClick }: ResultCardProps) {
  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  // Format date
  const formatDate = (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // If it's within the last week, show relative time
    const now = new Date();
    const diff = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diff < 1) return 'Today';
    if (diff < 2) return 'Yesterday';
    if (diff < 7) return `${diff} days ago`;
    
    return format(dateObj, 'MMM d, yyyy');
  };

  // Highlight search terms in text
  const highlightText = (text: string): JSX.Element => {
    if (!text) return <></>;
    
    // This is a simple implementation - in a production app, you'd want to match
    // the actual query terms used in the search
    const terms = ['neural', 'networks', 'embedding'];
    let highlighted = text;
    
    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark class="bg-yellow-100 px-0.5">$1</mark>');
    });
    
    return <div dangerouslySetInnerHTML={{ __html: highlighted }} />;
  };

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
  
  // Calculate relevance score as percentage
  const relevancePercentage = Math.round(result.relevanceScore * 100);

  return (
    <div 
      className="result-card bg-white rounded-xl shadow-sm hover:shadow border border-neutral-200 overflow-hidden cursor-pointer transition-all"
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className={`p-2 ${bgColor} rounded-lg mr-3`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-neutral-900 truncate">
              {result.filename}
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              {result.mimeType.split('/')[1].toUpperCase()} • {formatFileSize(result.fileSize)} • Last modified {formatDate(result.modifiedAt)}
            </p>
          </div>
          <div className="ml-2">
            <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
              {relevancePercentage}%
            </div>
          </div>
        </div>
        
        {/* Show different content based on file type */}
        <div className="mt-3">
          {result.fileType === 'document' && result.snippet && (
            <p className="text-sm text-neutral-700 line-clamp-3">
              {highlightText(result.snippet)}
            </p>
          )}
          
          {result.fileType === 'image' && (
            <div className="relative">
              <img 
                src={`/api/files/${result.fileId}/content`}
                alt={result.filename}
                className="w-full h-40 object-cover rounded-lg"
                loading="lazy"
              />
            </div>
          )}
          
          {result.fileType === 'video' && (
            <div className="mt-3 relative">
              {/* For videos, we would ideally show a thumbnail frame */}
              <div className="w-full h-40 bg-neutral-200 rounded-lg flex items-center justify-center relative">
                <PlayCircle className="h-12 w-12 text-neutral-500" />
                
                {/* Video duration if available */}
                {result.metadata?.duration && (
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-1.5 py-0.5 rounded flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {result.metadata.duration}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
