import React, { useState, useEffect } from 'react';
import { ConsoleLog } from '../types';
import { KeyIcon, LoadingIcon } from './icons';
import { Button } from './Button';
import { backendService } from '../services/backendService';

interface AuthEndpointModalProps {
  isOpen: boolean;
  onClose: () => void;
  logToIDE: (text: string, type: ConsoleLog['type']) => void;
}

export const AuthEndpointModal: React.FC<AuthEndpointModalProps> = ({ isOpen, onClose, logToIDE }) => {
  const [endpointUrl, setEndpointUrl] = useState('');
  const [savedEndpoint, setSavedEndpoint] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      const fetchConfig = async () => {
        try {
          const config = await backendService.getAuthEndpoint();
          if (config.endpointUrl) {
            setSavedEndpoint(config.endpointUrl);
            setEndpointUrl(config.endpointUrl);
          } else {
            setSavedEndpoint(null);
            setEndpointUrl('');
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          logToIDE(`Failed to get auth config from server: ${message}`, 'error');
          setError('Could not fetch server configuration.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchConfig();
    }
  }, [isOpen, logToIDE]);

  const handleConnect = async () => {
    setError(null);
    if (!endpointUrl.trim()) {
        setError('URL cannot be empty.');
        return;
    }
    if (!endpointUrl.startsWith('http://') && !endpointUrl.startsWith('https://')) {
      setError('URL must start with http:// or https://');
      return;
    }

    setIsLoading(true);
    try {
      await backendService.setAuthEndpoint(endpointUrl);
      setSavedEndpoint(endpointUrl);
      logToIDE(`Successfully connected to auth endpoint: ${endpointUrl}`, 'success');
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logToIDE(`Failed to set auth endpoint: ${message}`, 'error');
      setError(`Connection failed: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await backendService.setAuthEndpoint(''); // Send empty string to clear
      setSavedEndpoint(null);
      setEndpointUrl('');
      logToIDE('Disconnected from auth endpoint.', 'success');
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logToIDE(`Failed to disconnect from auth endpoint: ${message}`, 'error');
      setError(`Disconnect failed: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-bg-dark/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-endpoint-title"
    >
      <div
        className="bg-bg-light w-full max-w-lg rounded-lg shadow-2xl border border-gray-700/50 flex flex-col p-6"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between mb-4">
          <h2 id="auth-endpoint-title" className="text-xl font-bold text-brand-secondary flex items-center space-x-2">
            <KeyIcon />
            <span>Configure Auth Endpoint</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <LoadingIcon />
          </div>
        ) : (
          <div className="space-y-4">
             <p className="text-sm text-base-300">
              Connect the IDE backend to a serverless function for external authentication or other secure operations.
            </p>
            {savedEndpoint ? (
              <div className="space-y-3 bg-bg-dark p-4 rounded-lg">
                <p className="text-sm text-green-400">
                  Currently connected to:
                </p>
                <p className="font-mono text-xs bg-bg-light px-2 py-1.5 rounded break-all">{savedEndpoint}</p>
                <Button 
                    onClick={handleDisconnect}
                    disabled={isLoading}
                    variant="secondary"
                    className="w-full !bg-red-800/50 !text-red-300 hover:!bg-red-800/80"
                >
                    {isLoading ? <LoadingIcon /> : 'Disconnect'}
                </Button>
              </div>
            ) : (
               <div className="space-y-3">
                 <div>
                    <label htmlFor="auth-url" className="block text-sm font-medium text-base-200 mb-1">
                      Endpoint URL
                    </label>
                    <input
                      id="auth-url"
                      type="url"
                      value={endpointUrl}
                      onChange={(e) => setEndpointUrl(e.target.value)}
                      placeholder="https://your-auth-function.vercel.app"
                      className="w-full bg-bg-dark border-2 border-gray-700 rounded-lg text-white px-4 py-2 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition-all duration-200"
                      disabled={isLoading}
                    />
                 </div>
                  <Button
                      onClick={handleConnect}
                      disabled={isLoading || !endpointUrl}
                      className="w-full"
                  >
                      {isLoading ? <LoadingIcon /> : 'Connect'}
                  </Button>
               </div>
            )}
             {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
};
