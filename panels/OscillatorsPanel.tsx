

import React, { useMemo } from 'react';
import { SineWaveIcon, TrashIcon } from '../components/icons';
import { Slider } from '../components/Slider';
import { Oscillator } from '../types';

interface OscillatorsPanelProps {
    selectedKeys: string[];
    oscillators: Record<string, Oscillator[]>;
    setOscillators: (updater: React.SetStateAction<Record<string, Oscillator[]>>) => void;
}

export const OscillatorsPanel: React.FC<OscillatorsPanelProps> = ({ selectedKeys, oscillators, setOscillators }) => {
    
    const activeOscillators = useMemo(() => {
        if (selectedKeys.length !== 1) return [];
        return oscillators[selectedKeys[0]] || [];
    }, [selectedKeys, oscillators]);

    const handleUpdate = (id: string, newValues: Partial<Oscillator>) => {
        if (selectedKeys.length !== 1) return;
        const key = selectedKeys[0];
        setOscillators(prev => {
            const keyOscillators = prev[key] || [];
            const updated = keyOscillators.map(osc => osc.id === id ? { ...osc, ...newValues } : osc);
            return { ...prev, [key]: updated };
        });
    };

    const handleRemove = (id: string) => {
        if (selectedKeys.length !== 1) return;
        const key = selectedKeys[0];
        setOscillators(prev => {
            const keyOscillators = prev[key] || [];
            const updated = keyOscillators.filter(osc => osc.id !== id);
            if (updated.length === 0) {
                const next = { ...prev };
                delete next[key];
                return next;
            }
            return { ...prev, [key]: updated };
        });
    };

    let content: React.ReactNode;
    if (selectedKeys.length > 1) {
        content = <p className="text-xs text-base-300 pl-9">Oscillator editing is only available for single object selections.</p>;
    } else if (activeOscillators.length === 0) {
        content = (
            <p className="text-xs text-base-300 pl-9">
                No active oscillators. Use the console to add one:
                <br />
                <code className="text-brand-primary bg-bg-light px-1 py-0.5 rounded text-[11px] mt-1 inline-block">oscillate &lt;property&gt; &lt;freq&gt; &lt;amp&gt;</code>
            </p>
        );
    } else {
        content = (
            <div className="space-y-4">
                {activeOscillators.map(osc => (
                    <div key={osc.id} className="bg-bg-light/50 p-3 rounded-md border border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={osc.enabled}
                                    onChange={(e) => handleUpdate(osc.id, { enabled: e.target.checked })}
                                    className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-brand-primary focus:ring-brand-primary"
                                />
                                <span className="font-mono text-sm text-brand-secondary truncate" title={osc.property}>{osc.property}</span>
                            </div>
                            <button
                                onClick={() => handleRemove(osc.id)}
                                className="p-1 rounded-full text-gray-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                                title="Remove Oscillator"
                            >
                                <TrashIcon className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="space-y-3 pl-6">
                            <Slider
                                id={`${osc.id}-freq`}
                                label="Frequency"
                                value={osc.frequency}
                                onChange={(e) => handleUpdate(osc.id, { frequency: parseFloat(e.target.value) })}
                                min={0}
                                max={10}
                                step={0.1}
                            />
                             <Slider
                                id={`${osc.id}-amp`}
                                label="Amplitude"
                                value={osc.amplitude}
                                onChange={(e) => handleUpdate(osc.id, { amplitude: parseFloat(e.target.value) })}
                                min={0}
                                max={osc.property.includes('angle') ? 3.14 : 50}
                                step={0.05}
                            />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="bg-bg-dark p-4 rounded-lg border border-gray-700/50 space-y-3 animate-fade-in">
            <div className="flex items-center space-x-3">
                <SineWaveIcon />
                <h3 className="font-semibold text-lg text-brand-secondary">Oscillators</h3>
            </div>
            {content}
        </div>
    );
};