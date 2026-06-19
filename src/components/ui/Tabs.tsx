interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  size?: 'sm' | 'md';
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  size = 'sm',
}: TabsProps) {
  const sizeStyles = {
    sm: 'h-7 text-[12px]',
    md: 'h-8 text-[13px]',
  };

  return (
    <div className="inline-flex gap-0.5 p-0.5 bg-bg-tertiary rounded-lg">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            ${sizeStyles[size]}
            px-3
            rounded-md
            font-medium
            transition-all duration-150 ease-out
            cursor-pointer
            ${activeTab === tab.id
              ? 'bg-bg text-text-primary shadow-xs'
              : 'text-text-secondary hover:text-text-primary'
            }
          `}
        >
          <span>{tab.label}</span>
          {tab.count !== undefined && (
            <span className="ml-1.5 text-[10px] text-text-tertiary">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}