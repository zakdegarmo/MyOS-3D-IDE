


import React, { useState, useEffect, useRef } from 'react';
import { ConsoleLog } from '../types';

interface OntologicalConsolePanelProps {
    logs: ConsoleLog[];
    onCommand: (command: string) => void;
}

export const OntologicalConsolePanel: React.FC<OntologicalConsolePanelProps> = ({ logs, onCommand }) => {
    const [input, setInput] = useState('');
    const outputRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [logs]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && input.trim() !== '') {
            onCommand(input.trim());
            setInput('');
        }
    };
    
    return (
        <div className="w-full h-full flex flex-col p-4 bg-bg-light space-y-4">
            <header>
                <h2 className="text-lg font-semibold text-brand-secondary">Ontological Console</h2>
                <p className="text-xs text-base-300">Select an object and issue a command, or ask a question about the ontology.</p>
                <p className="text-xs text-base-300 font-mono mt-1">
                    Examples: <span className="bg-bg-dark px-1 py-0.5 rounded">Refines</span>, <span className="bg-bg-dark px-1 py-0.5 rounded">Why is mastery important?</span>
                </p>
            </header>
            <div
                ref={outputRef}
                className="flex-grow bg-bg-dark font-mono text-sm p-3 rounded-md border border-gray-700/50 overflow-y-auto"
                aria-live="polite"
            >
                {logs.map(log => {
                    let color = 'text-gray-400';
                    let prefix = '<';
                    let prefixColor = 'text-gray-500';

                    switch (log.type) {
                        case 'in':
                            color = 'text-brand-secondary';
                            prefix = '>';
                            prefixColor = 'text-brand-secondary';
                            break;
                        case 'out':
                            color = 'text-base-200';
                            prefix = '<';
                            prefixColor = 'text-gray-500';
                            break;
                        case 'error':
                            color = 'text-red-400';
                            prefix = '✖';
                            prefixColor = 'text-red-500';
                            break;
                        case 'success':
                            color = 'text-green-400';
                            prefix = '✓';
                            prefixColor = 'text-green-500';
                            break;
                        case 'info':
                            color = 'text-blue-400';
                            prefix = 'ℹ';
                            prefixColor = 'text-blue-500';
                            break;
                        case 'system':
                            color = 'text-gray-500';
                            prefix = '::';
                            prefixColor = 'text-gray-600';
                            break;
                        case 'source':
                            color = 'text-purple-400';
                            prefix = '📄';
                            prefixColor = 'text-purple-500';
                            break;
                        case 'ai':
                            color = 'text-brand-secondary';
                            prefix = '🤖';
                            prefixColor = 'text-brand-secondary';
                            break;
                    }
                    
                    return (
                        <div key={log.id} className="flex">
                            <span className={`flex-shrink-0 mr-2 ${prefixColor}`}>{prefix}</span>
                            <p className={`${color} whitespace-pre-wrap break-words`}>{log.text}</p>
                        </div>
                    );
                })}
            </div>
            <div className="flex-shrink-0 flex items-center bg-bg-dark rounded-md border border-gray-700/50 focus-within:ring-2 focus-within:ring-brand-primary">
                <span className="pl-3 text-brand-secondary font-mono">&gt;</span>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type command or question and press Enter..."
                    className="w-full bg-transparent p-2 text-white font-mono focus:outline-none"
                    spellCheck={false}
                    aria-label="Ontological command input"
                />
            </div>
        </div>
    );
};