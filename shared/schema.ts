import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  fileType: text("file_type").notNull(), // "document", "image", "video"
  mimeType: text("mime_type").notNull(), // e.g. "application/pdf", "image/jpeg"
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  modifiedAt: timestamp("modified_at").defaultNow().notNull(),
  metadata: jsonb("metadata"), // Additional file metadata
});

export const embeddings = pgTable("embeddings", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").notNull().references(() => files.id),
  vector: text("vector").notNull(), // Store vector as serialized string
  chunkText: text("chunk_text"), // For text chunks to provide context
  chunkOffset: integer("chunk_offset"), // Position in document for text files
  frameTime: integer("frame_time"), // Timestamp for video frames in milliseconds
  model: text("model").notNull(), // Which embedding model was used
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true, 
  createdAt: true,
  modifiedAt: true
});

export const insertEmbeddingSchema = createInsertSchema(embeddings).omit({
  id: true
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;

export type InsertEmbedding = z.infer<typeof insertEmbeddingSchema>;
export type Embedding = typeof embeddings.$inferSelect;

// Custom schemas for application-specific types
export const searchQuerySchema = z.object({
  query: z.string().min(1, "Query must not be empty"),
  fileTypes: z.array(z.enum(["document", "image", "video"])).optional(),
  limit: z.number().optional().default(20),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

export const searchResultSchema = z.object({
  fileId: z.number(),
  filename: z.string(),
  fileType: z.enum(["document", "image", "video"]),
  mimeType: z.string(),
  filePath: z.string(),
  fileSize: z.number(),
  createdAt: z.string().or(z.date()),
  modifiedAt: z.string().or(z.date()),
  relevanceScore: z.number(),
  snippet: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type SearchResult = z.infer<typeof searchResultSchema>;
