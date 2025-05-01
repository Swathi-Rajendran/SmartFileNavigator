import {
  users,
  files,
  embeddings,
  type User,
  type InsertUser,
  type File,
  type InsertFile,
  type Embedding,
  type InsertEmbedding,
  type SearchResult,
} from "@shared/schema";
import faiss from "faiss-node";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // File methods
  getFile(id: number): Promise<File | undefined>;
  getFiles(fileType?: string): Promise<File[]>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(
    id: number,
    updates: Partial<InsertFile>
  ): Promise<File | undefined>;
  deleteFile(id: number): Promise<boolean>;

  // Embedding methods
  createEmbedding(embedding: InsertEmbedding): Promise<Embedding>;
  getEmbeddingsByFileId(fileId: number): Promise<Embedding[]>;
  searchSimilar(
    vector: number[],
    fileTypes?: string[],
    limit?: number
  ): Promise<SearchResult[]>;
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
      (user) => user.username === username
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
      return allFiles.filter((file) => file.fileType === fileType);
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
      modifiedAt: now,
      metadata: insertFile.metadata ?? {}, // ensure metadata is always present
    };
    this.files.set(id, file);
    return file;
  }

  async updateFile(
    id: number,
    updates: Partial<InsertFile>
  ): Promise<File | undefined> {
    const file = this.files.get(id);
    if (!file) return undefined;

    const updatedFile: File = {
      ...file,
      ...updates,
      id, // ensure id doesn't change
      modifiedAt: new Date(),
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
    const embedding: Embedding = {
      chunkText: insertEmbedding.chunkText ?? null,
      chunkOffset: insertEmbedding.chunkOffset ?? null,
      frameTime: insertEmbedding.frameTime ?? null,
      ...insertEmbedding,
      id,
    };
    this.embeddings.set(id, embedding);
    return embedding;
  }

  async getEmbeddingsByFileId(fileId: number): Promise<Embedding[]> {
    return Array.from(this.embeddings.values()).filter(
      (embed) => embed.fileId === fileId
    );
  }

  async searchSimilar(
    vector: number[],
    fileTypes?: string[],
    limit: number = 20
  ): Promise<SearchResult[]> {
    console.log(`Searching similar embeddings for vector`);

    if (!Array.isArray(vector)) {
      throw new TypeError("Input vector must be an Array");
    }

    console.log("Input vector dimension:", vector.length);

    // Prepare embedding data with proper vector parsing
    const validEmbeddings = Array.from(this.embeddings.values())
      .map((e) => {
        try {
          // Parse vector if it's a string
          const parsedVector =
            typeof e.vector === "string" ? JSON.parse(e.vector) : e.vector;

          if (
            !Array.isArray(parsedVector) ||
            parsedVector.length !== vector.length
          ) {
            console.warn(
              `Invalid vector format or dimension mismatch for embedding ${e.id}`
            );
            return null;
          }

          return {
            embedding: e,
            vector: parsedVector,
          };
        } catch (err) {
          console.warn(`Failed to parse vector for embedding ${e.id}:`, err);
          return null;
        }
      })
      .filter(
        (item): item is { embedding: Embedding; vector: number[] } =>
          item !== null
      );

    if (validEmbeddings.length === 0) {
      console.log("No valid embeddings found for search");
      return [];
    }

    // Create a filtered list considering fileTypes if provided
    let filteredEmbeddings = validEmbeddings;
    if (fileTypes && fileTypes.length > 0) {
      filteredEmbeddings = validEmbeddings.filter((item) => {
        const file = this.files.get(item.embedding.fileId);
        return file && fileTypes.includes(file.fileType);
      });

      if (filteredEmbeddings.length === 0) {
        console.log(
          `No embeddings match the requested file types: ${fileTypes.join(
            ", "
          )}`
        );
        return [];
      }
    }

    // Initialize the FAISS index with correct dimensions
    const dimension = vector.length;
    const index = new faiss.IndexFlatL2(dimension);

    console.log(
      `Creating FAISS index with dimension ${dimension} for ${filteredEmbeddings.length} vectors`
    );

    // Create a mapping of FAISS index position to our embeddings for result lookup
    const indexToEmbeddingMap: { embedding: Embedding; vector: number[] }[] =
      [];

    // Prepare vectors for FAISS
    const vectors = new Float32Array(filteredEmbeddings.length * dimension);

    filteredEmbeddings.forEach((item, i) => {
      // Copy vector values to the correct position in the flat array
      for (let j = 0; j < dimension; j++) {
        vectors[i * dimension + j] = item.vector[j];
      }
      indexToEmbeddingMap.push(item);
    });

    // Add vectors to FAISS index
    // Convert Float32Array to the format expected by the FAISS binding
    const vectorsArray = Array.from(vectors);
    index.add(vectorsArray);
    console.log("FAISS index populated successfully");

    // Search for similar vectors
    try {
      // Convert query vector to the format expected by FAISS
      const queryVectorArray = Array.from(vector);
      const searchLimit = Math.min(limit, filteredEmbeddings.length);

      // Perform search
      const searchResult = index.search(queryVectorArray, searchLimit);

      // Extract distances and indices (labels)
      const distances = searchResult.distances as number[];
      const indices = searchResult.labels as number[];

      console.log("Search results:", {
        distances: distances.slice(0, 5),
        indices: indices.slice(0, 5),
      });

      if (!indices || indices.length === 0) {
        console.log("Search returned no results");
        return [];
      }

      // Map results to SearchResult objects
      const results: SearchResult[] = [];

      for (let i = 0; i < indices.length; i++) {
        const idx = indices[i];
        if (idx < 0 || idx >= indexToEmbeddingMap.length) continue;

        const item = indexToEmbeddingMap[idx];
        const file = this.files.get(item.embedding.fileId);

        if (!file) continue;

        results.push({
          fileId: file.id,
          filename: file.filename,
          fileType: file.fileType as "document" | "image" | "video",
          mimeType: file.mimeType,
          filePath: file.filePath,
          fileSize: file.fileSize,
          createdAt: file.createdAt,
          modifiedAt: file.modifiedAt,
          relevanceScore: distances[i],
          snippet: item.embedding.chunkText ?? undefined,
          metadata: (file.metadata ?? {}) as Record<string, any>,
        });
      }

      console.log(`Found ${results.length} search results`);
      return results;
    } catch (err) {
      console.error("FAISS search error:", err);
      return [];
    }
  }

  async deleteEmbeddingsByFileId(fileId: number): Promise<boolean> {
    // Find all embeddings for this file
    const toDelete = Array.from(this.embeddings.values()).filter(
      (embedding) => embedding.fileId === fileId
    );

    // Delete them
    for (const embedding of toDelete) {
      this.embeddings.delete(embedding.id);
    }

    return true;
  }
}

export const storage = new MemStorage();
