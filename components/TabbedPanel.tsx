
import React, { useState } from 'react';

interface Tab {
  title: string;
  content: React.ReactNode;
}

interface TabbedPanelProps {
  tabs: Tab[];
}

export const TabbedPanel: React.FC<TabbedPanelProps> = ({ tabs }) => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="flex flex-col h-full w-full bg-bg-light">
      <div className="flex-shrink-0 flex items-center border-b border-gray-700/50">
        {tabs.map((tab, index) => (
          <button
            key={tab.title}
            onClick={() => setActiveTab(index)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === index
                ? 'border-brand-primary text-brand-secondary'
                : 'border-transparent text-base-300 hover:bg-gray-800/50'
            }`}
             aria-current={activeTab === index ? 'page' : undefined}
          >
            {tab.title}
          </button>
        ))}
      </div>
      <div className="flex-grow relative overflow-hidden">
        {tabs.map((tab, index) => (
          <div
            key={tab.title}
            className="absolute top-0 left-0 w-full h-full"
            style={{ display: activeTab === index ? 'block' : 'none' }}
            role="tabpanel"
            hidden={activeTab !== index}
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
};
