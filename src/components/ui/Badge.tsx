import type { ReactNode } from 'react';

interface BadgeProps {
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info' | 'accent';
  size?: 'sm' | 'md';
  dot?: boolean;
  children: ReactNode;
}

export function Badge({
  variant = 'default',
  size = 'sm',
  dot = false,
  children,
}: BadgeProps) {
  const variantStyles = {
    default: 'bg-bg-tertiary text-text-secondary',
    success: 'bg-success-light text-success',
    error: 'bg-error-light text-error',
    warning: 'bg-warning-light text-warning',
    info: 'bg-accent-light text-accent',
    accent: 'bg-accent text-white',
  };

  const sizeStyles = {
    sm: 'h-5 px-2 text-[11px]',
    md: 'h-6 px-2.5 text-[12px]',
  };

  const dotColor = {
    default: 'bg-text-tertiary',
    success: 'bg-success',
    error: 'bg-error',
    warning: 'bg-warning',
    info: 'bg-accent',
    accent: 'bg-white',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        rounded-full
        font-medium
        leading-none
        ${variantStyles[variant]}
        ${sizeStyles[size]}
      `}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor[variant]}`} />
      )}
      {children}
    </span>
  );
}