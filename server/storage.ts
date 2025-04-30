import { 
  users, files, embeddings,
  type User, type InsertUser, 
  type File, type InsertFile,
  type Embedding, type InsertEmbedding,
  type SearchResult
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // File methods
  getFile(id: number): Promise<File | undefined>;
  getFiles(fileType?: string): Promise<File[]>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(id: number, updates: Partial<InsertFile>): Promise<File | undefined>;
  deleteFile(id: number): Promise<boolean>;
  
  // Embedding methods
  createEmbedding(embedding: InsertEmbedding): Promise<Embedding>;
  getEmbeddingsByFileId(fileId: number): Promise<Embedding[]>;
  searchSimilar(vector: number[], fileTypes?: string[], limit?: number): Promise<SearchResult[]>;
  deleteEmbeddingsByFileId(fileId: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private files: Map<number, File>;
  private embeddings: Map<number, Embedding>;
  private userIdCounter: number;
  private fileIdCounter: number;
  private embeddingIdCounter: number;

  constructor() {
    this.users = new Map();
    this.files = new Map();
    this.embeddings = new Map();
    this.userIdCounter = 1;
    this.fileIdCounter = 1;
    this.embeddingIdCounter = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // File methods
  async getFile(id: number): Promise<File | undefined> {
    return this.files.get(id);
  }

  async getFiles(fileType?: string): Promise<File[]> {
    const allFiles = Array.from(this.files.values());
    if (fileType) {
      return allFiles.filter(file => file.fileType === fileType);
    }
    return allFiles;
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const id = this.fileIdCounter++;
    const now = new Date();
    const file: File = { 
      ...insertFile, 
      id,
      createdAt: now,
      modifiedAt: now
    };
    this.files.set(id, file);
    return file;
  }

  async updateFile(id: number, updates: Partial<InsertFile>): Promise<File | undefined> {
    const file = this.files.get(id);
    if (!file) return undefined;
    
    const updatedFile: File = {
      ...file,
      ...updates,
      id, // ensure id doesn't change
      modifiedAt: new Date()
    };
    
    this.files.set(id, updatedFile);
    return updatedFile;
  }

  async deleteFile(id: number): Promise<boolean> {
    if (!this.files.has(id)) return false;
    
    // Delete the file
    this.files.delete(id);
    
    // Delete associated embeddings
    await this.deleteEmbeddingsByFileId(id);
    
    return true;
  }

  // Embedding methods
  async createEmbedding(insertEmbedding: InsertEmbedding): Promise<Embedding> {
    const id = this.embeddingIdCounter++;
    const embedding: Embedding = { ...insertEmbedding, id };
    this.embeddings.set(id, embedding);
    return embedding;
  }

  async getEmbeddingsByFileId(fileId: number): Promise<Embedding[]> {
    return Array.from(this.embeddings.values())
      .filter(embed => embed.fileId === fileId);
  }

  async searchSimilar(vector: number[], fileTypes?: string[], limit: number = 20): Promise<SearchResult[]> {
    // This is a naive implementation of vector similarity search
    // In a real implementation, you'd use HNSW, FAISS, or similar
    
    // Convert all stored vector strings to arrays
    const embeddingsWithVectors = Array.from(this.embeddings.values())
      .map(e => ({
        ...e,
        vectorArray: JSON.parse(e.vector) as number[]
      }));
    
    // Calculate cosine similarity for each embedding
    const withScores = embeddingsWithVectors.map(e => {
      const score = this.cosineSimilarity(vector, e.vectorArray);
      return { embedding: e, score };
    });
    
    // Sort by score descending
    withScores.sort((a, b) => b.score - a.score);
    
    // Get the corresponding files, filter by fileType if needed
    const results: SearchResult[] = [];
    const seenFileIds = new Set<number>();
    
    for (const { embedding, score } of withScores) {
      if (results.length >= limit) break;
      
      const file = this.files.get(embedding.fileId);
      if (!file) continue;
      
      // Filter by file type if specified
      if (fileTypes && fileTypes.length > 0 && !fileTypes.includes(file.fileType)) {
        continue;
      }
      
      // Deduplicate results by file ID (keep highest score)
      if (seenFileIds.has(file.id)) continue;
      seenFileIds.add(file.id);
      
      results.push({
        fileId: file.id,
        filename: file.filename,
        fileType: file.fileType as "document" | "image" | "video",
        mimeType: file.mimeType,
        filePath: file.filePath,
        fileSize: file.fileSize,
        createdAt: file.createdAt,
        modifiedAt: file.modifiedAt,
        relevanceScore: score,
        snippet: embedding.chunkText,
        metadata: file.metadata
      });
    }
    
    return results;
  }

  async deleteEmbeddingsByFileId(fileId: number): Promise<boolean> {
    // Find all embeddings for this file
    const toDelete = Array.from(this.embeddings.values())
      .filter(embedding => embedding.fileId === fileId);
    
    // Delete them
    for (const embedding of toDelete) {
      this.embeddings.delete(embedding.id);
    }
    
    return true;
  }

  // Helper methods
  private cosineSimilarity(a: number[], b: number[]): number {
    // Normalize dimensions to the larger vector by zero-padding the smaller one
    let vecA = a;
    let vecB = b;
    
    if (a.length !== b.length) {
      console.warn(`Vector dimension mismatch: ${a.length} vs ${b.length}. Normalizing...`);
      const maxLength = Math.max(a.length, b.length);
      
      if (a.length < maxLength) {
        vecA = [...a, ...new Array(maxLength - a.length).fill(0)];
      }
      
      if (b.length < maxLength) {
        vecB = [...b, ...new Array(maxLength - b.length).fill(0)];
      }
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export const storage = new MemStorage();
