import { ProjectState } from '../types';

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
     * @param code The JavaScript code to analyze.
     * @param onData A callback function invoked with each parsed JSON object from the stream.
     */
    public async analyzeCode(code: string, onData: (data: { type: string; payload: any }) => void): Promise<void> {
        // Implementation remains the same...
    }
    
    /**
     * Executes a `bun` command on the backend within a specific project workspace.
     * @param command The full `bun` command to execute.
     * @param projectId The ID of the workspace to execute the command in.
     * @param onData A callback function invoked for each chunk of output from the command.
     */
    public async executeBunCommand(command: string, projectId: string, onData: (data: { type: string; payload: string }) => void): Promise<void> {
        try {
             const response = await fetch(`${BASE_URL}/execute-bun`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command, projectId }),
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
        } catch (error: any) {
             console.error('[BackendService] Bun command error:', error);
            const errorMessage = error.message.includes('Failed to fetch')
              ? 'Bun command failed. Could not connect to the backend server.'
              : error.message;
            throw new Error(errorMessage);
        }
    }

    // --- Workspace and Project Management ---

    public async createNewWorkspace(): Promise<{ projectId: string }> {
        const response = await fetch(`${BASE_URL}/workspaces/new`, { method: 'POST' });
        if (!response.ok) throw new Error('Failed to create new workspace on server.');
        return response.json();
    }
    
    public async uploadProject(file: File): Promise<{ projectId: string }> {
        const formData = new FormData();
        formData.append('projectFile', file);
        
        const response = await fetch(`${BASE_URL}/workspaces/upload`, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) throw new Error('Failed to upload project.');
        return response.json();
    }

    public async downloadProject(projectId: string): Promise<Blob> {
        const response = await fetch(`${BASE_URL}/workspaces/${projectId}/download`);
        if (!response.ok) throw new Error('Failed to download project archive.');
        return response.blob();
    }

    public async saveProjectState(projectId: string, projectState: ProjectState): Promise<void> {
        const response = await fetch(`${BASE_URL}/workspaces/${projectId}/state`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(projectState),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to save project state: ${errorText}`);
        }
    }

    public async loadProjectState(projectId: string): Promise<ProjectState> {
        const response = await fetch(`${BASE_URL}/workspaces/${projectId}/state`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to load project state: ${errorText}`);
        }
        return response.json();
    }
}

export const backendService = new BackendService();