
import React from 'react';

interface SliderProps {
  label: string;
  id: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  id,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
}) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label htmlFor={id} className={`block text-sm font-medium transition-colors ${disabled ? 'text-gray-500' : 'text-base-200'}`}>
          {label}
        </label>
        <span className="text-sm font-mono text-brand-secondary bg-bg-dark px-2 py-0.5 rounded">
          {!isNaN(value) ? value.toFixed(1) : '—'}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed
                   [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:w-4
                   [&::-webkit-slider-thumb]:h-4
                   [&::-webkit-slider-thumb]:bg-brand-primary
                   [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:transition-colors
                   hover:[&::-webkit-slider-thumb]:bg-brand-dark
                   focus:[&::-webkit-slider-thumb]:ring-2
                   focus:[&::-webkit-slider-thumb]:ring-brand-secondary
                   disabled:[&::-webkit-slider-thumb]:bg-gray-600"
      />
    </div>
  );
};
