const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const { GoogleGenAI } = require("@google/genai");
const { knowledgeBase } = require('./knowledgeBase');

const app = express();
const PORT = 3001;
const PROJECTS_DIR = path.join(__dirname, 'projects');

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for potentially large GLB data

// --- Gemini AI Initialization ---
let ai;
try {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set for Gemini.");
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    console.log('[MyOS Server] GoogleGenAI client initialized successfully.');
} catch(e) {
    console.error('[MyOS Server] Failed to initialize GoogleGenAI client:', e.message);
    ai = null;
}


// --- Vector DB Implementation ---
let vectorDB = [];
// NOTE: As per user request for vector DB, using a standard embedding model.
// This assumes 'text-embedding-004' is available for use with the Gemini API.
const EMBEDDING_MODEL_NAME = 'text-embedding-004'; 
const SIMILARITY_THRESHOLD = 0.7; // Minimum similarity score to be considered relevant
const TOP_K_RESULTS = 3; // Number of top results to retrieve

/**
 * Calculates the cosine similarity between two vectors.
 * @param {number[]} vecA The first vector.
 * @param {number[]} vecB The second vector.
 * @returns {number} The cosine similarity score between 0 and 1.
 */
function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Initializes the in-memory vector database by generating embeddings for the knowledge base.
 */
async function initializeVectorDB() {
    if (!ai) {
        console.warn('[VectorDB] AI client not initialized, skipping vector DB creation.');
        return;
    }
    console.log('[VectorDB] Initializing in-memory vector database...');
    try {
        const contentsToEmbed = knowledgeBase.map(item => ({ text: item.content }));
        
        // Use the batch embedding feature for efficiency
        const response = await ai.models.embedContent({
            model: EMBEDDING_MODEL_NAME,
            contents: contentsToEmbed.map(c => c.text),
        });
        
        vectorDB = response.embeddings.map((embedding, index) => ({
            ...knowledgeBase[index],
            embedding: embedding.values
        }));
        
        console.log(`[VectorDB] Successfully created ${vectorDB.length} embeddings. Database is ready.`);
    } catch (error) {
        console.error('[VectorDB] Failed to initialize vector database:', error.message);
        // The server can still run, but AI queries will be degraded.
    }
}


// --- Helper Functions ---
const ensureProjectsDir = async () => {
    try {
        await fs.mkdir(PROJECTS_DIR, { recursive: true });
        console.log(`[MyOS Server] Projects directory is ready at: ${PROJECTS_DIR}`);
    } catch (error) {
        console.error('[MyOS Server] Could not create projects directory:', error);
        process.exit(1);
    }
};

console.log('[MyOS Server] Initializing a clean, functional backend...');

// --- API Endpoints ---

/**
 * POST /api/ai-query
 * Handles natural language queries using a Retrieval-Augmented Generation (RAG) pipeline.
 * It streams a newline-delimited JSON (NDJSON) response. First, it sends a 'source' object
 * with the retrieved context, then streams 'chunk' objects with the generated text.
 */
app.post('/api/ai-query', async (req, res) => {
    if (!ai) {
        return res.status(503).send("AI service is not available. Check server logs for details.");
    }
    
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
        return res.status(400).send("Invalid 'query' provided.");
    }

    try {
        let context = "No specific context was retrieved for this query. The knowledge base may not contain relevant information.";
        res.setHeader('Content-Type', 'application/x-ndjson');
        res.setHeader('Transfer-Encoding', 'chunked');
        
        // --- 1. Retrieval Step (Vector Search) ---
        if (vectorDB.length > 0) {
            console.log('[AI Query] RAG Step 1: Performing vector search for query:', query);
            
            const queryEmbeddingResponse = await ai.models.embedContent({
                model: EMBEDDING_MODEL_NAME,
                content: query,
            });
            const queryEmbedding = queryEmbeddingResponse.embedding.values;

            const scoredItems = vectorDB.map(item => ({
                ...item,
                similarity: cosineSimilarity(queryEmbedding, item.embedding)
            }));

            const relevantItems = scoredItems
                .sort((a, b) => b.similarity - a.similarity)
                .filter(item => item.similarity > SIMILARITY_THRESHOLD)
                .slice(0, TOP_K_RESULTS);

            if (relevantItems.length > 0) {
                context = relevantItems.map(item => `Concept: ${item.concept}\nContent:\n${item.content}`).join('\n\n---\n\n');
                console.log(`[AI Query] RAG Step 1: Retrieved ${relevantItems.length} context sections.`);
                
                // Stream the sources back to the client
                const sourcesPayload = relevantItems.map(item => ({ concept: item.concept, similarity: item.similarity }));
                res.write(JSON.stringify({ type: 'source', payload: sourcesPayload }) + '\n');
            } else {
                console.log('[AI Query] RAG Step 1: No relevant context found above similarity threshold.');
            }
        } else {
            console.warn('[AI Query] Vector DB not initialized. Cannot perform semantic search.');
        }

        // --- 2. Generation Step (Streaming) ---
        console.log('[AI Query] RAG Step 2: Generating streaming response.');
        
        const generationPrompt = `
You are MyOS, an expert AI assistant integrated into a 3D IDE. Your purpose is to provide deep, insightful explanations about the user's ontological knowledge graph.
Your task is to synthesize the provided context from the knowledge graph to generate a comprehensive and thoughtful answer to the user's question.
You should primarily ground your answer in the provided context, but you may elaborate slightly to connect concepts in a more meaningful way, acting as an expert guide to this specific ontology. Refer to the concepts by name (e.g., 'Self', 'Thought') where appropriate.
If the context is entirely irrelevant to the question, gracefully state that the knowledge base doesn't seem to contain the answer.
Format your response in clear, readable markdown. Use lists, bolding, and paragraphs to structure your explanation effectively.

--- CONTEXT START ---
${context}
--- CONTEXT END ---

User's Question: "${query}"

Your Expert Answer:
`;
        
        const stream = await ai.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents: generationPrompt,
        });

        for await (const chunk of stream) {
            if (chunk.text) {
                res.write(JSON.stringify({ type: 'chunk', payload: chunk.text }) + '\n');
            }
        }
        
        console.log('[AI Query] RAG Step 2: Stream finished.');
        res.end();

    } catch (error) {
        console.error('[AI Query] Error processing AI query:', error);
        // Ensure the response stream is properly ended on error
        if (!res.headersSent) {
            res.status(500).send(`An error occurred while processing the AI query: ${error.message}`);
        } else {
            res.end();
        }
    }
});

/**
 * POST /api/analyze-code
 * Receives a code snippet and streams back an AI-powered analysis.
 */
app.post('/api/analyze-code', async (req, res) => {
    if (!ai) {
        return res.status(503).send("AI service is not available.");
    }

    const { code } = req.body;
    if (!code || typeof code !== 'string') {
        return res.status(400).send("Invalid 'code' snippet provided.");
    }

    try {
        res.setHeader('Content-Type', 'application/x-ndjson');
        res.setHeader('Transfer-Encoding', 'chunked');

        console.log('[Code Analysis] Starting analysis stream.');

        const generationPrompt = `
You are an expert code reviewer AI integrated into a 3D IDE. The user is writing custom JavaScript functions to manipulate 3D objects.
Your task is to analyze the provided script and provide feedback in three sections:
1.  **Functionality Explanation:** A clear, high-level summary of what the code does.
2.  **Suggestions for Improvement:** Actionable advice on how to enhance readability, performance, and adhere to modern best practices. Mention specific lines if possible.
3.  **Potential Issues & Bugs:** Identification of possible errors, unhandled edge cases, and logical flaws.

The script has access to a 'target' object (the selected 3D object) and a 'sceneApi' for safe interactions. Key API functions are:
- \`sceneApi.log(message)\`
- \`sceneApi.updateTransform(target.id, updaterFn)\`
- \`sceneApi.updatePrimitiveParameters(target.id, updaterFn)\`

Analyze the following code snippet:

--- CODE START ---
${code}
--- CODE END ---

Provide your analysis in clear, readable markdown. Start each section with a heading (e.g., \`### Functionality Explanation\`).
`;
        const stream = await ai.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents: generationPrompt,
        });

        for await (const chunk of stream) {
            if (chunk.text) {
                res.write(JSON.stringify({ type: 'chunk', payload: chunk.text }) + '\n');
            }
        }
        
        console.log('[Code Analysis] Stream finished.');
        res.end();
        
    } catch (error) {
        console.error('[Code Analysis] Error processing code analysis:', error);
        if (!res.headersSent) {
            res.status(500).send(`An error occurred during code analysis: ${error.message}`);
        } else {
            res.end();
        }
    }
});


// --- Project Save/Load Endpoints ---

/**
 * POST /api/projects
 * Saves the entire frontend state to a new JSON file on the server.
 */
app.post('/api/projects', async (req, res) => {
    try {
        const projectState = req.body;
        if (!projectState || typeof projectState !== 'object' || Object.keys(projectState).length === 0) {
            return res.status(400).json({ status: 'error', message: 'Invalid or empty project state received.' });
        }
        
        const projectId = `project-${Date.now()}.json`;
        const filePath = path.join(PROJECTS_DIR, projectId);

        await fs.writeFile(filePath, JSON.stringify(projectState, null, 2));

        console.log(`[MyOS Server] Saved project ${projectId}`);
        res.status(201).json({ success: true, projectId });

    } catch (error) {
        console.error('[MyOS Server] Error saving project:', error);
        res.status(500).json({ status: 'error', message: 'Failed to save project on the server.' });
    }
});

/**
 * GET /api/projects/:id
 * Loads a project state from a JSON file on the server.
 */
app.get('/api/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Basic security check to prevent path traversal
        if (!id || id.includes('..') || id.includes('/')) {
            return res.status(400).json({ status: 'error', message: 'Invalid project ID format.' });
        }
        
        const filePath = path.join(PROJECTS_DIR, id);

        const data = await fs.readFile(filePath, 'utf8');

        console.log(`[MyOS Server] Loaded project ${id}`);
        res.setHeader('Content-Type', 'application/json');
        res.send(data);

    } catch (error) {
        if (error.code === 'ENOENT') {
             console.error(`[MyOS Server] Project not found: ${req.params.id}`);
             return res.status(404).json({ status: 'error', message: 'Project not found.' });
        }
        console.error(`[MyOS Server] Error loading project ${req.params.id}:`, error);
        res.status(500).json({ status: 'error', message: 'Failed to load project from the server.' });
    }
});


// --- Start Server ---
app.listen(PORT, async () => {
    await ensureProjectsDir(); // Make sure the directory exists before starting
    await initializeVectorDB(); // Initialize the in-memory vector DB on startup
    console.log(`[MyOS Server] Backend server is live and listening on http://localhost:${PORT}`);
    console.log('[MyOS Server] Project Save/Load endpoints are active.');
    if (ai) {
        console.log('[MyOS Server] AI Query endpoint is active.');
    } else {
        console.warn('[MyOS Server] AI Query endpoint is INACTIVE due to initialization failure.');
    }
});
