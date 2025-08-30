import React from 'react';
import { Integration } from '../types';
import { GlobeIcon } from '../components/icons';

interface UnityHubPanelProps {
  integrations: Integration[];
  activeUrl: string;
  setActiveUrl: (url: string) => void;
}

export const UnityHubPanel: React.FC<UnityHubPanelProps> = ({ integrations, activeUrl, setActiveUrl }) => {
  return (
    <div className="w-full h-full flex flex-col bg-bg-light">
      <header className="flex-shrink-0 p-4 border-b border-gray-700/50">
        <h2 className="text-lg font-semibold text-brand-secondary flex items-center space-x-3">
            <GlobeIcon className="h-6 w-6 text-brand-primary" />
            <span>Unity Hub</span>
        </h2>
        <p className="text-xs text-base-300">Integrated web applications</p>
      </header>
      
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
