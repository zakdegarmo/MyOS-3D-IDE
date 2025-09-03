import React, { useRef, useState } from 'react';
import { Integration } from '../types';
import { GlobeIcon, LoadingIcon } from '../components/icons';
import { backendService } from '../services/backendService';

interface UnityHubPanelProps {
  integrations: Integration[];
  activeUrl: string;
  setActiveUrl: (url: string) => void;
}

export const UnityHubPanel: React.FC<UnityHubPanelProps> = ({ integrations, activeUrl, setActiveUrl }) => {
  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});
  const [editTitle, setEditTitle] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdateTitle = async () => {
    if (!editTitle || !activeUrl) return;

    setIsSending(true);
    setError(null);
    try {
      // This command is sent to our own backend.
      // The backend can then choose how to act on this command in the future.
      await backendService.sendIdeCommand({
        targetUrl: activeUrl,
        command: 'UPDATE_TITLE',
        payload: { newTitle: editTitle },
      });
      // For now, we just log it on the server. No success message needed here yet.
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send command';
      setError(message);
    } finally {
      setIsSending(false);
    }
  };


  return (
    <div className="w-full h-full flex flex-col bg-bg-light">
      <header className="flex-shrink-0 p-4 border-b border-gray-700/50">
        <h2 className="text-lg font-semibold text-brand-secondary flex items-center space-x-3">
            <GlobeIcon className="h-6 w-6 text-brand-primary" />
            <span>Unity Hub</span>
        </h2>
        <p className="text-xs text-base-300">Integrated web applications</p>
      </header>
       <div className="p-2 border-b border-gray-700/50 bg-bg-dark/50">
          <div className="flex items-center space-x-2">
              <input 
                  type="text" 
                  value={editTitle} 
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Send command to backend..."
                  className="flex-grow bg-bg-dark border border-gray-600 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  aria-label="Live edit page title"
                  disabled={isSending}
              />
              <button
                  onClick={handleUpdateTitle}
                  disabled={!editTitle || isSending}
                  className="px-3 py-1 w-20 text-sm rounded-md bg-brand-primary text-bg-dark hover:bg-brand-dark font-semibold disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center"
              >
                  {isSending ? <LoadingIcon /> : 'Send'}
              </button>
          </div>
          {error && <p className="text-xs text-red-400 mt-1 px-1">{error}</p>}
      </div>
      
      <div className="flex-shrink-0 flex items-center border-b border-gray-700/50 overflow-x-auto">
        {integrations.map((integration) => (
          <button
            key={integration.url}
            onClick={() => setActiveUrl(integration.url)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeUrl === integration.url
                ? 'border-brand-primary text-brand-secondary'
                : 'border-transparent text-base-300 hover:bg-gray-800/50'
            }`}
            aria-current={activeUrl === integration.url ? 'page' : undefined}
          >
            {integration.title}
          </button>
        ))}
      </div>
      
      <div className="flex-grow relative bg-bg-dark">
        {integrations.map((integration) => (
          <iframe
            key={integration.url}
            // FIX: The ref callback was implicitly returning the element, which is invalid for a ref callback.
            // Wrapped the assignment in braces to ensure a void return type, satisfying TypeScript.
            ref={el => { iframeRefs.current[integration.url] = el; }}
            src={integration.url}
            title={integration.title}
            className="absolute top-0 left-0 w-full h-full border-none"
            style={{
              display: activeUrl === integration.url ? 'block' : 'none',
            }}
            sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
          />
        ))}
      </div>
    </div>
  );
};
