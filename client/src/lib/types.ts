export type FileType = 'document' | 'image' | 'video';

export interface FileData {
  id: number;
  filename: string;
  fileType: FileType;
  mimeType: string;
  filePath: string;
  fileSize: number;
  createdAt: string | Date;
  modifiedAt: string | Date;
  metadata?: Record<string, any>;
}

export interface SearchResult {
  fileId: number;
  filename: string;
  fileType: FileType;
  mimeType: string;
  filePath: string;
  fileSize: number;
  createdAt: string | Date;
  modifiedAt: string | Date;
  relevanceScore: number;
  snippet?: string;
  metadata?: Record<string, any>;
}

export interface FileCounts {
  document: number;
  image: number;
  video: number;
  total: number;
}

export interface SearchQuery {
  query: string;
  fileTypes?: FileType[];
  limit?: number;
}

export interface UploadProgressInfo {
  file: {
    id: number;
    filename: string;
    fileType: FileType;
    mimeType: string;
    filePath: string;
    fileSize: number;
    createdAt: string | Date;
    modifiedAt: string | Date;
  };
  progress: number;
  status: 'waiting' | 'processing' | 'complete' | 'error';
  error?: string;
}

export type UploadStatus = 'idle' | 'indexing' | 'complete' | 'error';
