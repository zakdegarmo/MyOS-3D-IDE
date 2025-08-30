
import React, { useState } from 'react';
import { Integration } from '../types';
import { Button } from './Button';

interface IntegrateWebsiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (integration: Integration) => void;
}

export const IntegrateWebsiteModal: React.FC<IntegrateWebsiteModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) {
      setError('Both title and URL are required.');
      return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError('URL must start with http:// or https://');
      return;
    }
    setError('');
    onAdd({ title, url });
    setTitle('');
    setUrl('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-bg-dark/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="integrate-website-title"
    >
      <div
        className="bg-bg-light w-full max-w-md rounded-lg shadow-2xl border border-gray-700/50 flex flex-col p-6"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between mb-4">
          <h2 id="integrate-website-title" className="text-xl font-bold text-brand-secondary">
            Integrate New Website
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="integration-title" className="block text-sm font-medium text-base-200 mb-1">
              Label / Title
            </label>
            <input
              id="integration-title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., My Project Dashboard"
              className="w-full bg-bg-dark border-2 border-gray-700 rounded-lg text-white px-4 py-2 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition-all duration-200"
              required
            />
          </div>
          <div>
            <label htmlFor="integration-url" className="block text-sm font-medium text-base-200 mb-1">
              URL
            </label>
            <input
              id="integration-url"
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full bg-bg-dark border-2 border-gray-700 rounded-lg text-white px-4 py-2 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition-all duration-200"
              required
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <footer className="flex justify-end pt-2">
            <Button type="submit">Add Integration</Button>
          </footer>
        </form>
      </div>
    </div>
  );
};
