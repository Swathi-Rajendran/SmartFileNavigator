import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { storage } from './storage';
import { generateFileEmbeddings } from './embedding';
import type { InsertFile, File } from '@shared/schema';

// Define base directory for uploads
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create upload directory:', error);
    throw error;
  }
}

// Initialize directory on module load
ensureUploadDir().catch(console.error);

// Helper to determine file type from mime type
function getFileTypeFromMime(mimeType: string): 'document' | 'image' | 'video' | undefined {
  if (mimeType.startsWith('image/')) {
    return 'image';
  } else if (mimeType.startsWith('video/')) {
    return 'video';
  } else if (
    mimeType === 'application/pdf' ||
    mimeType === 'text/plain' ||
    mimeType === 'text/markdown' ||
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'document';
  }
  return undefined;
}

// Extract text content from PDF using a Python script
async function extractTextFromPDF(filePath: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const pythonScript = `
import sys
import json
import fitz  # PyMuPDF

def extract_text_from_pdf(pdf_path):
    chunks = []
    try:
        # Open the PDF
        doc = fitz.open(pdf_path)
        
        # Extract text from each page
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text = page.get_text("text")
            if text.strip():  # Only add non-empty pages
                chunks.append(text)
        
        return chunks
    except Exception as e:
        print(f"Error extracting text: {str(e)}", file=sys.stderr)
        return []

if __name__ == "__main__":
    pdf_path = sys.argv[1]
    chunks = extract_text_from_pdf(pdf_path)
    print(json.dumps(chunks))
`;

    const process = spawn('python3', ['-c', pythonScript, filePath]);
    
    let output = '';
    let errorOutput = '';
    
    process.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error(`PDF extraction error: ${data}`);
    });
    
    process.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`PDF extraction failed with code ${code}: ${errorOutput}`));
      }
      
      try {
        const chunks = JSON.parse(output);
        resolve(chunks);
      } catch (error) {
        reject(new Error(`Failed to parse PDF extraction output: ${error}`));
      }
    });
  });
}

// Extract text from plain text file
async function extractTextFromTxt(filePath: string): Promise<string[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Split the content into chunks of roughly 1000 characters
    const chunkSize = 1000;
    const chunks: string[] = [];
    
    for (let i = 0; i < content.length; i += chunkSize) {
      chunks.push(content.slice(i, i + chunkSize));
    }
    
    // Make sure we have at least one chunk
    if (chunks.length === 0) {
      chunks.push(content);
    }
    
    return chunks;
  } catch (error) {
    console.error('Error reading text file:', error);
    throw error;
  }
}

// Save uploaded file and process it
export async function saveAndProcessFile(
  fileName: string,
  mimeType: string,
  tempFilePath: string
): Promise<File> {
  try {
    // Ensure upload directory exists
    await ensureUploadDir();
    
    // Determine file type
    const fileType = getFileTypeFromMime(mimeType);
    
    if (!fileType) {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }
    
    // Generate a unique file name to avoid conflicts
    const uniqueFileName = `${Date.now()}-${fileName}`;
    const filePath = path.join(UPLOAD_DIR, uniqueFileName);
    
    // Copy the temp file to the uploads directory
    await fs.copyFile(tempFilePath, filePath);
    
    // Get file size
    const stats = await fs.stat(filePath);
    
    // Create file record
    const fileData: InsertFile = {
      filename: fileName,
      fileType,
      mimeType,
      filePath,
      fileSize: stats.size,
      metadata: {}
    };
    
    const file = await storage.createFile(fileData);
    
    // Process file based on type
    try {
      if (fileType === 'document') {
        // Extract text content from document
        let textChunks: string[] = [];
        
        if (mimeType === 'application/pdf') {
          textChunks = await extractTextFromPDF(filePath);
        } else if (mimeType === 'text/plain') {
          textChunks = await extractTextFromTxt(filePath);
        }
        
        // Generate embeddings for the text chunks
        await generateFileEmbeddings(file.id, fileType, filePath, textChunks);
      } else if (fileType === 'image') {
        // Generate embeddings for image
        await generateFileEmbeddings(file.id, fileType, filePath);
      } else if (fileType === 'video') {
        // Generate embeddings for video (placeholder)
        await generateFileEmbeddings(file.id, fileType, filePath);
      }
    } catch (error) {
      console.error(`Error processing file ${file.id}:`, error);
      // Still return the file, even if embedding generation failed
    }
    
    return file;
  } catch (error) {
    console.error('Error saving file:', error);
    throw error;
  }
}

// Create file stream to serve file
export async function getFileStream(filePath: string) {
  return fs.readFile(filePath);
}

// Delete file from disk
export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}
