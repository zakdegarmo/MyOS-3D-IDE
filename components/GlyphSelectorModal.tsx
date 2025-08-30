
import React, { useState, useMemo } from 'react';

interface GlyphSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  glyphs: string[];
  onGlyphSelect: (glyph: string) => void;
}

export const GlyphSelectorModal: React.FC<GlyphSelectorModalProps> = ({ isOpen, onClose, glyphs, onGlyphSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredGlyphs = useMemo(() => {
    if (!searchTerm) return glyphs;
    return glyphs.filter(g => g.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [glyphs, searchTerm]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-bg-dark/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="glyph-selector-title"
    >
      <div
        className="bg-bg-light w-full max-w-2xl h-full max-h-[80vh] rounded-lg shadow-2xl border border-gray-700/50 flex flex-col p-6"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 id="glyph-selector-title" className="text-xl font-bold text-brand-secondary">Select a Glyph</h2>
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

        <div className="mb-4 flex-shrink-0">
          <input
            type="text"
            placeholder="Search glyphs..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-bg-dark border-2 border-gray-700 rounded-lg text-white px-4 py-2 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition-all duration-200"
          />
        </div>

        <div className="flex-grow overflow-y-auto pr-2">
          {filteredGlyphs.length > 0 ? (
            <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
              {filteredGlyphs.map(glyph => (
                <button
                  key={glyph}
                  onClick={() => {
                    onGlyphSelect(glyph);
                    onClose();
                  }}
                  className="aspect-square bg-bg-dark border-2 border-gray-700 rounded-md text-3xl font-light flex items-center justify-center hover:bg-brand-primary hover:border-brand-primary hover:text-bg-dark transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  title={`Create glyph: ${glyph}`}
                >
                  {glyph}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 pt-10">
              <p>No matching glyphs found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
