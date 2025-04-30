import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { saveAndProcessFile, getFileStream, deleteFile } from "./fileSystem";
import { embedText, generateFileEmbeddings } from "./embedding";
import multer from "multer";
import path from "path";
import { searchQuerySchema } from "@shared/schema";
import { z } from "zod";

// Setup multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
      cb(null, 'temp-uploads/');
    },
    filename: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB limit
  }
});

// Create temp uploads directory
import fs from 'fs';
import fsPromises from 'fs/promises';
import { promisify } from 'util';
const mkdir = promisify(fs.mkdir);
mkdir('temp-uploads', { recursive: true }).catch(console.error);

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  
  // Fix embeddings endpoint - regenerates embeddings for all files
  app.post('/api/fix-embeddings', async (req, res) => {
    try {
      const files = await storage.getFiles();
      
      for (const file of files) {
        try {
          console.log(`Regenerating embeddings for file ${file.id}: ${file.filename}`);
          
          // First delete any existing embeddings
          await storage.deleteEmbeddingsByFileId(file.id);
          
          if (file.fileType === 'document') {
            // Extract text content
            let content = [""];
            try {
              if (file.mimeType === 'text/plain') {
                const fileContent = await fsPromises.readFile(file.filePath, 'utf-8');
                content = [fileContent];
              }
              // Add more document types here as needed
            } catch (error) {
              console.error(`Error reading file content: ${error}`);
              content = [`[Failed to extract content from ${file.filename}]`];
            }
            
            // Generate embeddings
            await generateFileEmbeddings(file.id, file.fileType, file.filePath, content);
          } else {
            // For images and videos
            await generateFileEmbeddings(file.id, file.fileType, file.filePath);
          }
        } catch (error) {
          console.error(`Error regenerating embeddings for file ${file.id}:`, error);
        }
      }
      
      res.json({ success: true, message: `Regenerated embeddings for ${files.length} files` });
    } catch (error) {
      console.error('Error fixing embeddings:', error);
      res.status(500).json({ message: 'Failed to fix embeddings' });
    }
  });

  // Count files by type for sidebar
  app.get('/api/files/counts', async (req, res) => {
    try {
      const allFiles = await storage.getFiles();
      const counts = {
        document: allFiles.filter(f => f.fileType === 'document').length,
        image: allFiles.filter(f => f.fileType === 'image').length,
        video: allFiles.filter(f => f.fileType === 'video').length,
        total: allFiles.length,
      };
      
      res.json(counts);
    } catch (error) {
      console.error('Error counting files:', error);
      res.status(500).json({ message: 'Failed to count files' });
    }
  });

  // Get all files
  app.get('/api/files', async (req, res) => {
    try {
      const fileType = req.query.type as string | undefined;
      const files = await storage.getFiles(fileType);
      res.json(files);
    } catch (error) {
      console.error('Error fetching files:', error);
      res.status(500).json({ message: 'Failed to fetch files' });
    }
  });

  // Get file by ID
  app.get('/api/files/:id([0-9]+)', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid file ID' });
      }

      const file = await storage.getFile(id);
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }

      res.json(file);
    } catch (error) {
      console.error('Error fetching file:', error);
      res.status(500).json({ message: 'Failed to fetch file' });
    }
  });

  // Upload file
  app.post('/api/files/upload', upload.single('file'), async (req: Request & { file?: Express.Multer.File }, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const savedFile = await saveAndProcessFile(
        file.originalname,
        file.mimetype,
        file.path
      );

      // Remove temporary file
      fs.unlink(file.path, (err) => {
        if (err) console.error('Error removing temp file:', err);
      });

      res.status(201).json(savedFile);
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ message: `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });

  // Delete file
  app.delete('/api/files/:id([0-9]+)', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid file ID' });
      }

      const file = await storage.getFile(id);
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }

      // Delete the file from disk
      await deleteFile(file.filePath);

      // Delete the file from storage
      const deleted = await storage.deleteFile(id);
      if (!deleted) {
        return res.status(500).json({ message: 'Failed to delete file record' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ message: 'Failed to delete file' });
    }
  });

  // Search files
  app.post('/api/search', async (req, res) => {
    try {
      // Validate search query
      const parsedQuery = searchQuerySchema.safeParse(req.body);
      if (!parsedQuery.success) {
        return res.status(400).json({ 
          message: 'Invalid search query',
          errors: parsedQuery.error.flatten()
        });
      }

      const { query, fileTypes, limit } = parsedQuery.data;

      // Generate embedding for query
      const queryVector = await embedText(query);

      // Search for similar embeddings
      const results = await storage.searchSimilar(
        queryVector,
        fileTypes,
        limit
      );

      res.json(results);
    } catch (error) {
      console.error('Error searching files:', error);
      res.status(500).json({ 
        message: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });

  // Serve file content
  app.get('/api/files/:id([0-9]+)/content', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid file ID' });
      }

      const file = await storage.getFile(id);
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }

      // Read file and stream it back
      const fileContent = await getFileStream(file.filePath);
      
      // Set content type based on mimetype
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);
      
      res.send(fileContent);
    } catch (error) {
      console.error('Error serving file:', error);
      res.status(500).json({ message: 'Failed to serve file' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
