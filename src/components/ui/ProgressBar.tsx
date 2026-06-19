interface ProgressBarProps {
  percent: number;
  size?: 'xs' | 'sm' | 'md';
  variant?: 'default' | 'success' | 'error';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export function ProgressBar({
  percent,
  size = 'md',
  variant = 'default',
  showLabel = false,
  label,
  className = '',
}: ProgressBarProps) {
  const sizeStyles = {
    xs: 'h-1',
    sm: 'h-1.5',
    md: 'h-2',
  };

  const variantStyles = {
    default: 'bg-accent',
    success: 'bg-success',
    error: 'bg-error',
  };

  const clampedPercent = Math.min(100, Math.max(0, percent));

  return (
    <div className={className}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className="text-[12px] text-text-secondary">{label}</span>
          )}
          {showLabel && (
            <span className="text-[12px] font-medium text-text-primary tabular-nums">
              {clampedPercent.toFixed(1)}%
            </span>
          )}
        </div>
      )}
      <div
        className={`
          ${sizeStyles[size]}
          bg-bg-tertiary
          rounded-full
          overflow-hidden
        `}
      >
        <div
          className={`
            h-full
            ${variantStyles[variant]}
            rounded-full
            transition-all duration-300 ease-out
          `}
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
    </div>
  );
}