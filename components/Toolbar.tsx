





import React, { useState, useEffect, useRef } from 'react';

// Reusable DropdownMenu component
interface DropdownMenuProps {
  label: string;
  children: React.ReactNode;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ label, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-1 text-sm rounded-md transition-colors focus:outline-none ${
          isOpen ? 'bg-bg-dark text-white' : 'text-base-200 hover:bg-gray-700/50'
        }`}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {label}
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-bg-dark border border-gray-700/50 rounded-md shadow-lg z-50 animate-fade-in p-1" role="menu">
          {children}
        </div>
      )}
    </div>
  );
};

// Reusable MenuItem component
interface MenuItemProps {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

const MenuItem: React.FC<MenuItemProps> = ({ onClick = () => {}, disabled = false, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    role="menuitem"
    className="w-full text-left px-3 py-1.5 text-sm flex items-center justify-between rounded-sm text-base-200 hover:bg-brand-primary hover:text-bg-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {children}
  </button>
);

const MenuSeparator: React.FC = () => (
    <div className="h-px bg-gray-700/50 my-1" role="separator" />
);

interface ToolbarProps {
  onLoadFont: (file: File) => void;
  onCreateFromGlyph: () => void;
  isFontLoaded: boolean;
  onSaveScene: () => void;
  onNewProject: () => void;
  onSaveProject: () => void;
  onImportProject: () => void;
  onExportProject: () => void;
  onExportOntology: () => void;
  onCreatePrimitive: () => void;
  onIntegrateWebsite: () => void;
  onCreateGlyphLibrary: () => void;
  onConfigureAuth: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = (props) => {
  const { 
    onLoadFont, onCreateFromGlyph, isFontLoaded, onSaveScene, 
    onNewProject, onSaveProject, onImportProject, onExportProject,
    onExportOntology, onCreatePrimitive, onIntegrateWebsite, onCreateGlyphLibrary,
    onConfigureAuth
  } = props;
  const fontFileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, callback: (file: File) => void) => {
    const file = event.target.files?.[0];
    if (file) {
      callback(file);
    }
    if (event.target) {
        event.target.value = '';
    }
  };
  
  return (
    <>
       <input
        type="file"
        ref={fontFileInputRef}
        onChange={(e) => handleFileChange(e, onLoadFont)}
        accept=".ttf,.otf"
        style={{ display: 'none' }}
        aria-hidden="true"
      />
      <nav className="flex items-center space-x-1">
        <DropdownMenu label="File">
          <MenuItem onClick={onNewProject}>New Project</MenuItem>
          <MenuSeparator />
          <MenuItem onClick={() => fontFileInputRef.current?.click()}>Load Font (.ttf, .otf)...</MenuItem>
          <MenuSeparator />
          <MenuItem onClick={onSaveProject}>Save Project</MenuItem>
          <MenuSeparator />
          <MenuItem onClick={onImportProject}>Import Project (.json)...</MenuItem>
          <MenuItem onClick={onExportProject}>Export Project (.json)...</MenuItem>
          <MenuItem onClick={onExportOntology}>Export Ontology (.glb)...</MenuItem>
          <MenuSeparator />
          <MenuItem onClick={onSaveScene}>Save Scene As (.glb)...</MenuItem>
          <MenuSeparator />
          <MenuItem onClick={() => console.log('Integrate Projects clicked')} disabled>Integrate Projects...</MenuItem>
        </DropdownMenu>

        <DropdownMenu label="Object">
          <MenuItem onClick={onCreatePrimitive}>Create Primitive...</MenuItem>
          <MenuItem onClick={onCreateFromGlyph} disabled={!isFontLoaded}>Create from Font Glyph...</MenuItem>
          <MenuItem onClick={onCreateGlyphLibrary} disabled={!isFontLoaded}>Create glb library</MenuItem>
          <MenuSeparator />
          <MenuItem onClick={() => console.log('Edit DOOR Data')} disabled>Edit DOOR Data...</MenuItem>
          <MenuItem onClick={() => console.log('View Relationships')} disabled>View Relationships</MenuItem>
          <MenuSeparator />
          <MenuItem onClick={() => console.log('Group Selected')} disabled>Group Selected</MenuItem>
          <MenuItem onClick={() => console.log('Duplicate')} disabled>Duplicate</MenuItem>
          <MenuItem onClick={() => console.log('Delete')} disabled>Delete</MenuItem>
        </DropdownMenu>
        
        <DropdownMenu label="Integrations">
          <MenuItem onClick={onIntegrateWebsite}>Integrate New Website...</MenuItem>
          <MenuItem onClick={onConfigureAuth}>Configure Auth Endpoint...</MenuItem>
          <MenuSeparator />
          <p className="px-3 py-1 text-xs text-gray-500 font-semibold uppercase">Installed</p>
          <MenuItem disabled>three.js</MenuItem>
          <MenuItem disabled>@react-three/fiber</MenuItem>
          <MenuItem disabled>bun package manager</MenuItem>
          <MenuSeparator />
          <MenuItem onClick={() => console.log('Configure PM clicked')} disabled>Configure Package Manager...</MenuItem>
        </DropdownMenu>
      </nav>
    </>
  );
};
