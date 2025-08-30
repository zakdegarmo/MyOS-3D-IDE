const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const fileUpload = require('express-fileupload');
const archiver = require('archiver');
const AdmZip = require('adm-zip');
const { GoogleGenAI } = require("@google/genai");
const { knowledgeBase } = require('./knowledgeBase');
const fetch = require('node-fetch');

const app = express();
const PORT = 3001;
const PROJECTS_DIR = path.join(__dirname, 'projects');
const WORKSPACES_DIR = path.join(__dirname, 'workspaces');


// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(fileUpload());


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
const EMBEDDING_MODEL_NAME = 'text-embedding-004'; 
const SIMILARITY_THRESHOLD = 0.7;
const TOP_K_RESULTS = 3;

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

async function initializeVectorDB() {
    if (!ai) {
        console.warn('[VectorDB] AI client not initialized, skipping vector DB creation.');
        return;
    }
    console.log('[VectorDB] Initializing in-memory vector database...');
    try {
        const contentsToEmbed = knowledgeBase.map(item => ({ text: item.content }));
        
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
    }
}


// --- Helper Functions ---
const ensureDir = async (dir) => {
    try {
        await fs.mkdir(dir, { recursive: true });
    } catch (error) {
        console.error(`[MyOS Server] Could not create directory: ${dir}`, error);
        process.exit(1);
    }
};

console.log('[MyOS Server] Initializing a clean, functional backend...');

// --- API Endpoints ---

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
                
                const sourcesPayload = relevantItems.map(item => ({ concept: item.concept, similarity: item.similarity }));
                res.write(JSON.stringify({ type: 'source', payload: sourcesPayload }) + '\n');
            } else {
                console.log('[AI Query] RAG Step 1: No relevant context found above similarity threshold.');
            }
        } else {
            console.warn('[AI Query] Vector DB not initialized. Cannot perform semantic search.');
        }

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
        if (!res.headersSent) {
            res.status(500).send(`An error occurred while processing the AI query: ${error.message}`);
        } else {
            res.end();
        }
    }
});

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


/**
 * POST /api/execute-bun
 * Executes any `bun` command within a specified project workspace.
 */
app.post('/api/execute-bun', (req, res) => {
    const { command, projectId } = req.body;
    
    if (!command || typeof command !== 'string' || !command.startsWith('bun')) {
        return res.status(400).send('Invalid command provided. Must be a string starting with "bun".');
    }
    if (!projectId || typeof projectId !== 'string' || projectId.includes('..') || projectId.includes('/')) {
        return res.status(400).send('Invalid or missing projectId.');
    }

    const workspacePath = path.join(WORKSPACES_DIR, projectId);
    // Security: Check if workspace exists before proceeding.
    fs.stat(workspacePath).catch(() => {
        return res.status(404).send('Project workspace not found.');
    });

    const parts = command.trim().split(/\s+/);
    const bunCmd = parts[0]; // should be 'bun'
    const args = parts.slice(1);

    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Transfer-Encoding', 'chunked');
    
    // Using spawn with an array of args is safer against command injection.
    const bunProcess = spawn(bunCmd, args, { cwd: workspacePath });
    console.log(`[Bun Command] In [${projectId}]: Executing: ${command}`);

    const streamData = (type, data) => {
        res.write(JSON.stringify({ type, payload: data.toString() }) + '\n');
    };

    bunProcess.stdout.on('data', (data) => streamData('stdout', data));
    bunProcess.stderr.on('data', (data) => streamData('stderr', data));

    bunProcess.on('close', (code) => {
        console.log(`[Bun Command] Process for [${projectId}] exited with code ${code}`);
        streamData('exit', `Process finished with code ${code}.`);
        res.end();
    });

    bunProcess.on('error', (err) => {
        console.error(`[Bun Command] Failed to start subprocess for [${projectId}].`, err);
        if (!res.headersSent) {
            res.status(500).send('Failed to start the bun process.');
        } else {
            streamData('stderr', `Failed to start subprocess: ${err.message}`);
            res.end();
        }
    });
});

/**
 * POST /api/proxy
 * Forwards a request from this backend to another service.
 * This enables backend-to-backend communication initiated by the client console.
 */
app.post('/api/proxy', async (req, res) => {
    const { targetUrl, payload, method = 'GET' } = req.body;

    if (!targetUrl) {
        return res.status(400).json({ status: 'error', message: 'targetUrl is required.' });
    }

    try {
        console.log(`[Proxy Call] Forwarding ${method} request to: ${targetUrl}`);
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                // Forward any other important headers if necessary
            }
        };

        if (payload && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(payload);
        }

        const proxyResponse = await fetch(targetUrl, options);
        
        // Check if the response is JSON or text
        const contentType = proxyResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await proxyResponse.json();
            res.status(proxyResponse.status).json(data);
        } else {
            const text = await proxyResponse.text();
            res.status(proxyResponse.status).send(text);
        }

    } catch (error) {
        console.error('[Proxy Call] Error forwarding request:', error);
        res.status(500).json({ status: 'error', message: `Failed to proxy request: ${error.message}` });
    }
});


// --- Project Workspace Endpoints ---

/**
 * POST /api/workspaces/new
 * Creates a new, empty project workspace on the server.
 */
app.post('/api/workspaces/new', async (req, res) => {
    try {
        const projectId = `proj-${Date.now()}`;
        const workspacePath = path.join(WORKSPACES_DIR, projectId);
        await fs.mkdir(workspacePath, { recursive: true });

        // Create a default package.json
        const defaultPackageJson = {
            name: projectId,
            module: "index.ts",
            type: "module",
            scripts: {
                "dev": "bun run --hot index.ts"
            },
            devDependencies: {
                "bun-types": "latest"
            },
            peerDependencies: {
                "typescript": "^5.0.0"
            }
        };
        await fs.writeFile(path.join(workspacePath, 'package.json'), JSON.stringify(defaultPackageJson, null, 2));
        
        console.log(`[Workspaces] Created new project: ${projectId}`);
        res.status(201).json({ success: true, projectId });

    } catch (error) {
        console.error('[Workspaces] Error creating new workspace:', error);
        res.status(500).json({ status: 'error', message: 'Failed to create new project on the server.' });
    }
});


/**
 * POST /api/workspaces/upload
 * Uploads a .zip file, extracts it into a new workspace.
 */
app.post('/api/workspaces/upload', async (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    try {
        const projectFile = req.files.projectFile; // Assumes input name is 'projectFile'
        const projectId = `proj-upload-${Date.now()}`;
        const workspacePath = path.join(WORKSPACES_DIR, projectId);
        await fs.mkdir(workspacePath, { recursive: true });
        
        // Use adm-zip to extract the uploaded file buffer
        const zip = new AdmZip(projectFile.data);
        zip.extractAllTo(workspacePath, /*overwrite*/ true);

        console.log(`[Workspaces] Uploaded and extracted project to ${projectId}`);
        res.status(201).json({ success: true, projectId });
    } catch (error) {
        console.error('[Workspaces] Error uploading project:', error);
        res.status(500).json({ status: 'error', message: 'Failed to upload and extract project.' });
    }
});

/**
 * GET /api/workspaces/:id/download
 * Zips and downloads an entire project workspace.
 */
app.get('/api/workspaces/:id/download', (req, res) => {
    const { id } = req.params;
    if (!id || id.includes('..') || id.includes('/')) {
        return res.status(400).send('Invalid project ID format.');
    }
    
    const workspacePath = path.join(WORKSPACES_DIR, id);
    const archive = archiver('zip', { zlib: { level: 9 } });

    res.attachment(`${id}.zip`);
    archive.pipe(res);
    archive.directory(workspacePath, false);
    
    archive.on('error', (err) => {
        res.status(500).send({error: err.message});
    });

    archive.finalize();
    console.log(`[Workspaces] Zipping and downloading project: ${id}`);
});

/**
 * POST /api/workspaces/:id/state
 * Saves the IDE's state JSON to the project workspace.
 */
app.post('/api/workspaces/:id/state', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || id.includes('..') || id.includes('/')) {
            return res.status(400).json({ status: 'error', message: 'Invalid project ID format.' });
        }
        const filePath = path.join(WORKSPACES_DIR, id, 'myos-project.json');
        await fs.writeFile(filePath, JSON.stringify(req.body, null, 2));
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('[Workspaces] Error saving project state:', error);
        res.status(500).json({ status: 'error', message: 'Failed to save project state.' });
    }
});

/**
 * GET /api/workspaces/:id/state
 * Loads the IDE's state JSON from the project workspace.
 */
app.get('/api/workspaces/:id/state', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || id.includes('..') || id.includes('/')) {
            return res.status(400).json({ status: 'error', message: 'Invalid project ID format.' });
        }
        const filePath = path.join(WORKSPACES_DIR, id, 'myos-project.json');
        const data = await fs.readFile(filePath, 'utf8');
        res.setHeader('Content-Type', 'application/json');
        res.send(data);
    } catch (error) {
         if (error.code === 'ENOENT') {
             console.log(`[Workspaces] No state file found for ${req.params.id}, returning empty state.`);
             return res.status(200).json({}); // Return empty object if no state file exists
        }
        console.error(`[Workspaces] Error loading project state ${req.params.id}:`, error);
        res.status(500).json({ status: 'error', message: 'Failed to load project state.' });
    }
});


// --- Start Server ---
app.listen(PORT, async () => {
    await ensureDir(PROJECTS_DIR);
    await ensureDir(WORKSPACES_DIR);
    await initializeVectorDB();
    console.log(`[MyOS Server] Backend server is live and listening on http://localhost:${PORT}`);
    console.log('[MyOS Server] Workspace and command endpoints are active.');
    if (ai) {
        console.log('[MyOS Server] AI Query endpoint is active.');
    } else {
        console.warn('[MyOS Server] AI Query endpoint is INACTIVE due to initialization failure.');
    }
});