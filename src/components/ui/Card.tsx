import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
}

export function Card({
  children,
  className = '',
  padding = 'md',
  hover = false,
  onClick,
}: CardProps) {
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      className={`
        bg-bg
        rounded-xl
        border border-border-light
        shadow-xs
        ${hover ? 'hover:shadow-sm hover:border-border transition-all duration-150' : ''}
        ${onClick ? 'cursor-pointer text-left w-full' : ''}
        ${paddingStyles[padding]}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </Component>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
  divider?: boolean;
}

export function CardHeader({
  children,
  className = '',
  divider = false,
}: CardHeaderProps) {
  return (
    <div
      className={`
        flex items-center justify-between
        ${divider ? 'pb-4 mb-4 border-b border-border-lighter' : 'mb-4'}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
  return (
    <h3
      className={`
        text-[14px] font-semibold text-text-primary tracking-tight
        ${className}
      `}
    >
      {children}
    </h3>
  );
}

interface CardDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function CardDescription({
  children,
  className = '',
}: CardDescriptionProps) {
  return (
    <p className={`text-[12px] text-text-secondary ${className}`}>
      {children}
    </p>
  );
}

interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

export function CardBody({ children, className = '' }: CardBodyProps) {
  return <div className={className}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
  divider?: boolean;
}

export function CardFooter({
  children,
  className = '',
  divider = false,
}: CardFooterProps) {
  return (
    <div
      className={`
        flex items-center justify-end gap-3
        ${divider ? 'pt-4 mt-4 border-t border-border-lighter' : 'mt-4'}
        ${className}
      `}
    >
      {children}
    </div>
  );
}