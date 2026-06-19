interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: ToggleProps) {
  return (
    <div
      className={`
        flex items-center justify-between
        py-3.5
        border-b border-border-lighter last:border-b-0
        ${disabled ? 'opacity-50' : ''}
      `}
    >
      <div className="flex-1 mr-4 min-w-0">
        <div className="text-[13px] font-medium text-text-primary">
          {label}
        </div>
        {description && (
          <div className="text-[12px] text-text-secondary mt-0.5 leading-relaxed">
            {description}
          </div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`
          relative w-[44px] h-[26px] rounded-full
          transition-colors duration-200 ease-out
          cursor-pointer flex-shrink-0
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent
          disabled:cursor-not-allowed
          ${checked ? 'bg-accent' : 'bg-gray-300'}
        `}
      >
        <span
          className={`
            absolute top-[2px]
            w-[22px] h-[22px]
            bg-white rounded-full
            shadow-sm
            transition-transform duration-200 ease-out
            ${checked ? 'translate-x-[20px]' : 'translate-x-[2px]'}
          `}
        />
      </button>
    </div>
  );
}