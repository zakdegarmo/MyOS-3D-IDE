import React from 'react';

interface ColorPaletteProps {
  onColorSelect: (color: string) => void;
}

const colors = [
  '#FFFFFF', '#A0E9FF', '#00A9FF', '#FFC107', 
  '#FF5722', '#F44336', '#E91E63', '#9C27B0',
  '#673AB7', '#3F51B5', '#4CAF50', '#8BC34A',
];

export const ColorPalette: React.FC<ColorPaletteProps> = ({ onColorSelect }) => {
  return (
    <div className="pt-2 border-t border-gray-700/50 mt-1">
      <div className="grid grid-cols-4 gap-1.5">
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => onColorSelect(color)}
            className="w-6 h-6 rounded-full border border-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-light focus:ring-brand-primary transition-transform transform hover:scale-110"
            style={{ backgroundColor: color }}
            aria-label={`Select color ${color}`}
            title={color}
          />
        ))}
      </div>
    </div>
  );
};
