import { spawn, exec } from "child_process";
import path from "path";
import fs from "fs/promises";
import os from "os";
import { storage } from "./storage";
import { InsertEmbedding } from "@shared/schema";

const PYTHON_SCRIPT = `
import sys
import json
import numpy as np
from sentence_transformers import SentenceTransformer
from PIL import Image
import torch
from transformers import CLIPProcessor, CLIPModel
import torch.nn.functional as F

# Load text embedding model
text_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

# We'll use a small CLIP model for images/videos
# In production, we'd use MobileCLIP or a more efficient model
clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

def embed_text(text):
    # Get embeddings from the model
    embedding = text_model.encode(text)
    return embedding.tolist()

def embed_image(image_path):
    try:
        # Load and process the image
        image = Image.open(image_path)
        inputs = clip_processor(images=image, return_tensors="pt")
        
        # Generate embeddings
        with torch.no_grad():
            image_features = clip_model.get_image_features(**inputs)
            image_features = F.normalize(image_features, p=2, dim=-1)
            
        # Normalize and convert to list
        image_embedding = image_features[0].cpu().numpy()
        return image_embedding.tolist()
    except Exception as e:
        print(f"Error embedding image: {str(e)}", file=sys.stderr)
        return None

def process_input():
    input_data = json.loads(sys.stdin.read())
    
    content_type = input_data.get("type")
    result = {"success": False}
    
    if content_type == "text":
        text = input_data.get("content")
        if text:
            embedding = embed_text(text)
            result = {"success": True, "embedding": embedding}
    
    elif content_type == "image":
        image_path = input_data.get("path")
        if image_path:
            embedding = embed_image(image_path)
            if embedding:
                result = {"success": True, "embedding": embedding}
            else:
                result = {"success": False, "error": "Failed to embed image"}
    
    elif content_type == "batch":
        items = input_data.get("items", [])
        embeddings = []
        
        for item in items:
            item_type = item.get("type")
            if item_type == "text":
                text = item.get("content")
                embedding = embed_text(text) if text else None
            elif item_type == "image":
                image_path = item.get("path")
                embedding = embed_image(image_path) if image_path else None
            else:
                embedding = None
                
            embeddings.append({
                "index": item.get("index"),
                "embedding": embedding,
                "success": embedding is not None
            })
            
        result = {"success": True, "embeddings": embeddings}
    
    else:
        result = {"success": False, "error": "Unsupported content type"}
    
    print(json.dumps(result))

if __name__ == "__main__":
    process_input()
`;

// Initialize the Python subprocess once
let pythonProcess: ReturnType<typeof spawn> | null = null;
let pythonScriptPath: string | null = null;

async function initPythonProcess() {
  if (pythonProcess) return;

  try {
    // Create a temporary script file
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "embedding-"));
    pythonScriptPath = path.join(tmpDir, "embedding.py");
    await fs.writeFile(pythonScriptPath, PYTHON_SCRIPT);

    // Start Python process
    pythonProcess = spawn("python3", [pythonScriptPath]);

    pythonProcess.stderr?.on("data", (data) => {
      console.error(`Python error: ${data}`);
    });

    pythonProcess.on("close", (code) => {
      console.log(`Python process exited with code ${code}`);
      pythonProcess = null;
    });

    console.log("Python embedding process started successfully");
  } catch (error) {
    console.error("Failed to initialize Python process:", error);
    pythonProcess = null;
  }
}

// Helper function to run the embedding script
async function runEmbeddingRequest(input: any): Promise<any> {
  return new Promise((resolve, reject) => {
    // Create a new process for each request
    const process = spawn("python3", ["-c", PYTHON_SCRIPT]);

    let output = "";
    let errorOutput = "";

    process.stdout.on("data", (data) => {
      output += data.toString();
    });

    process.stderr.on("data", (data) => {
      errorOutput += data.toString();
      console.error(`Python stderr: ${data}`);
    });

    process.on("close", (code) => {
      if (code !== 0) {
        return reject(
          new Error(`Python process exited with code ${code}: ${errorOutput}`)
        );
      }

      try {
        const result = JSON.parse(output);
        resolve(result);
      } catch (error) {
        reject(new Error(`Failed to parse Python output: ${error}`));
      }
    });

    // Send input to the Python process
    process.stdin.write(JSON.stringify(input));
    process.stdin.end();
  });
}

// Utility to enforce 384-dimension vectors
function enforceVectorDimension(vec: number[], dim = 384): number[] {
  if (!Array.isArray(vec)) return new Array(dim).fill(0);
  if (vec.length === dim) return vec;
  if (vec.length > dim) return vec.slice(0, dim);
  // pad with zeros
  return vec.concat(new Array(dim - vec.length).fill(0));
}

// Replace fallback embedding logic with real implementation
export async function embedText(text: string): Promise<number[]> {
  console.log(`Embedding text: ${text}`);
  try {
    const result = await runEmbeddingRequest({
      type: "text",
      content: text,
    });
    if (!result.success) {
      throw new Error("Failed to embed text with Python");
    }
    console.log(`Generated text embedding`);
    return enforceVectorDimension(result.embedding);
  } catch (error) {
    console.error("Error in Python embedding:", error);
    throw error;
  }
}

// Replace fallback embedding logic with real implementation
export async function embedImage(imagePath: string): Promise<number[]> {
  console.log(`Embedding image: ${imagePath}`);
  try {
    const result = await runEmbeddingRequest({
      type: "image",
      path: imagePath,
    });
    if (!result.success) {
      throw new Error("Failed to embed image with Python");
    }
    console.log(`Generated image embedding`);
    return enforceVectorDimension(result.embedding);
  } catch (error) {
    console.error("Error in Python image embedding:", error);
    throw error;
  }
}

export async function embedBatch(
  items: Array<{
    type: "text" | "image";
    content?: string;
    path?: string;
    index: number;
  }>
): Promise<
  Array<{
    index: number;
    embedding: number[] | null;
    success: boolean;
  }>
> {
  try {
    const result = await runEmbeddingRequest({
      type: "batch",
      items,
    });
    if (!result.success) {
      console.warn(
        "Failed to process batch embedding with Python, using fallback"
      );
      return createFallbackBatchEmbedding(items);
    }
    // Enforce dimension for each embedding
    return result.embeddings.map((e: any) => ({
      ...e,
      embedding: e.embedding ? enforceVectorDimension(e.embedding) : null,
    }));
  } catch (error) {
    console.warn("Error in Python batch embedding, using fallback:", error);
    return createFallbackBatchEmbedding(items);
  }
}

// Create fallback embeddings for a batch of items
function createFallbackBatchEmbedding(
  items: Array<{
    type: "text" | "image";
    content?: string;
    path?: string;
    index: number;
  }>
): Array<{
  index: number;
  embedding: number[] | null;
  success: boolean;
}> {
  return items.map((item) => {
    let embedding: number[] | null = null;

    try {
      if (item.type === "text" && item.content) {
        embedding = createFallbackEmbedding(item.content);
      } else if (item.type === "image" && item.path) {
        embedding = createFallbackImageEmbedding(item.path);
      }

      return {
        index: item.index,
        embedding,
        success: embedding !== null,
      };
    } catch (error) {
      console.error("Error creating fallback embedding:", error);
      return {
        index: item.index,
        embedding: null,
        success: false,
      };
    }
  });
}

// Helper to extract key frames from a video using ffmpeg
async function extractKeyFrames(
  videoPath: string,
  outputDir: string,
  maxFrames = 5
): Promise<string[]> {
  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });
  // Extract up to maxFrames key frames as JPEGs
  // -vf "select=eq(pict_type\,I)" selects I-frames (key frames)
  // -vsync vfr keeps variable frame rate
  // -q:v 2 gives good quality
  // -frames:v limits the number of frames
  const framePattern = path.join(outputDir, "frame-%03d.jpg");
  const cmd = `ffmpeg -hide_banner -loglevel error -i "${videoPath}" -vf "select=eq(pict_type\\,I)" -vsync vfr -q:v 2 -frames:v ${maxFrames} "${framePattern}"`;
  await new Promise((resolve, reject) => {
    exec(cmd, (err) => (err ? reject(err) : resolve(null)));
  });
  // List the extracted frames
  const files = await fs.readdir(outputDir);
  return files
    .filter((f) => f.endsWith(".jpg"))
    .map((f) => path.join(outputDir, f));
}

export async function generateFileEmbeddings(
  fileId: number,
  fileType: string,
  filePath: string,
  content?: string[]
): Promise<void> {
  try {
    // First, delete any existing embeddings for this file
    await storage.deleteEmbeddingsByFileId(fileId);

    if (fileType === "document" && content) {
      // For documents, embed each content chunk separately
      for (let i = 0; i < content.length; i++) {
        const vector = await embedText(content[i]);

        const embedding: InsertEmbedding = {
          fileId,
          vector: JSON.stringify(vector),
          chunkText: content[i],
          chunkOffset: i,
          model: "all-MiniLM-L6-v2",
        };

        await storage.createEmbedding(embedding);
      }
    } else if (fileType === "image") {
      // For images, embed the entire image
      const vector = await embedImage(filePath);

      const embedding: InsertEmbedding = {
        fileId,
        vector: JSON.stringify(vector),
        model: "clip-vit-base",
      };

      await storage.createEmbedding(embedding);
    } else if (fileType === "video") {
      // Extract key frames and embed each frame
      const tempDir = path.join(
        os.tmpdir(),
        `video-frames-${fileId}-${Date.now()}`
      );
      let framePaths: string[] = [];
      try {
        framePaths = await extractKeyFrames(filePath, tempDir, 5); // up to 5 key frames
      } catch (err) {
        console.error("Failed to extract video frames:", err);
      }
      if (framePaths.length === 0) {
        // fallback: store a zero vector
        const embedding: InsertEmbedding = {
          fileId,
          vector: JSON.stringify(new Array(384).fill(0)),
          model: "clip-vit-base",
        };
        await storage.createEmbedding(embedding);
      } else {
        for (let i = 0; i < framePaths.length; i++) {
          const vector = await embedImage(framePaths[i]);
          const embedding: InsertEmbedding = {
            fileId,
            vector: JSON.stringify(vector),
            model: "clip-vit-base",
            chunkOffset: i,
            chunkText: framePaths[i], // store frame path for debug
          };
          await storage.createEmbedding(embedding);
        }
      }
      // Clean up temp frames
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {}
    }
  } catch (error) {
    console.error(`Error generating embeddings for file ${fileId}:`, error);
    throw error;
  }
}

// Initialize Python process on module load
initPythonProcess().catch(console.error);
