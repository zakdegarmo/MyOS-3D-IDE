import { ProjectState } from '../types';

interface BackendResponse {
    type: 'analysis_result' | 'error' | string;
    payload: any; 
}

// Use a relative path for the API base URL. This allows the development
// environment's proxy to correctly route requests from the sandboxed frontend
// to the backend service, avoiding CORS and "Failed to fetch" errors.
const BASE_URL = '/api';


class BackendService {
    /**
     * Sends a natural language query to the backend AI for processing.
     * Handles a newline-delimited JSON (NDJSON) stream from the server.
     * @param query The user's question.
     * @param onData A callback function invoked with each parsed JSON object from the stream.
     */
    public async aiQuery(query: string, onData: (data: { type: string; payload: any }) => void): Promise<void> {
        try {
            const response = await fetch(`${BASE_URL}/ai-query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server responded with ${response.status}: ${errorText}`);
            }
            
            if (!response.body) {
                throw new Error("Response body is missing.");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                
                // Keep the last, potentially incomplete line in the buffer
                buffer = lines.pop() || ''; 

                for (const line of lines) {
                    if (line.trim() === '') continue;
                    try {
                        const parsed = JSON.parse(line);
                        onData(parsed);
                    } catch (e) {
                        console.error('Failed to parse NDJSON line:', line, e);
                    }
                }
            }
             // Process any remaining data in the buffer
            if (buffer.trim() !== '') {
                try {
                    const parsed = JSON.parse(buffer);
                    onData(parsed);
                } catch (e) {
                    console.error('Failed to parse final NDJSON buffer:', buffer, e);
                }
            }

        } catch (error: any) {
            console.error('[BackendService] AI Query error:', error);
            const errorMessage = error.message.includes('Failed to fetch')
              ? 'AI query failed. Could not connect to the backend server. Is it running?'
              : error.message;
            throw new Error(errorMessage);
        }
    }

    /**
     * Sends a code snippet to the backend for AI-powered analysis.
     * Handles a newline-delimited JSON (NDJSON) stream from the server.
     * @param code The JavaScript code to analyze.
     * @param onData A callback function invoked with each parsed JSON object from the stream.
     */
    public async analyzeCode(code: string, onData: (data: { type: string; payload: any }) => void): Promise<void> {
        try {
            const response = await fetch(`${BASE_URL}/analyze-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server responded with ${response.status}: ${errorText}`);
            }
            
            if (!response.body) {
                throw new Error("Response body is missing.");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; 

                for (const line of lines) {
                    if (line.trim() === '') continue;
                    try {
                        onData(JSON.parse(line));
                    } catch (e) {
                        console.error('Failed to parse NDJSON line:', line, e);
                    }
                }
            }
            if (buffer.trim() !== '') {
                try {
                    onData(JSON.parse(buffer));
                } catch (e) {
                    console.error('Failed to parse final NDJSON buffer:', buffer, e);
                }
            }
        } catch (error: any) {
            console.error('[BackendService] Code Analysis error:', error);
            const errorMessage = error.message.includes('Failed to fetch')
              ? 'Code analysis failed. Could not connect to the backend server.'
              : error.message;
            throw new Error(errorMessage);
        }
    }


    /**
     * Sends the entire project state to the backend to be saved.
     * @param projectState - The complete state of the application.
     * @returns A promise that resolves with the project ID from the backend.
     */
    public async saveProject(projectState: ProjectState): Promise<{ projectId: string }> {
        const response = await fetch(`${BASE_URL}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(projectState),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server responded with ${response.status}: ${errorText}`);
        }
        return response.json();
    }

    /**
     * Loads a project state from the backend using its ID.
     * @param projectId - The ID of the project to load.
     * @returns A promise that resolves with the full project state.
     */
    public async loadProject(projectId: string): Promise<ProjectState> {
        const response = await fetch(`${BASE_URL}/projects/${projectId}`);
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`Project with ID '${projectId}' not found.`);
            }
            const errorText = await response.text();
            throw new Error(`Server responded with ${response.status}: ${errorText}`);
        }
        return response.json();
    }
}

export const backendService = new BackendService();
