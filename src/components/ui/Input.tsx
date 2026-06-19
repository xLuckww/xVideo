import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: ReactNode;
  suffix?: ReactNode;
}

export function Input({
  label,
  hint,
  error,
  icon,
  suffix,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-[13px] font-medium text-text-primary mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
            {icon}
          </div>
        )}
        <input
          className={`
            w-full h-9
            ${icon ? 'pl-9' : 'pl-3'} ${suffix ? 'pr-9' : 'pr-3'}
            bg-bg-secondary
            border rounded-lg
            text-[13px] text-text-primary
            placeholder:text-text-placeholder
            outline-none
            transition-all duration-150
            ${error
              ? 'border-error focus:border-error focus:ring-2 focus:ring-error/20'
              : 'border-border-light focus:border-accent focus:ring-2 focus:ring-accent/20 focus:bg-bg'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
            ${className}
          `}
          {...props}
        />
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary">
            {suffix}
          </div>
        )}
      </div>
      {hint && !error && (
        <p className="mt-1.5 text-[11px] text-text-secondary leading-relaxed">{hint}</p>
      )}
      {error && (
        <p className="mt-1.5 text-[11px] text-error">{error}</p>
      )}
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Textarea({
  label,
  hint,
  error,
  className = '',
  ...props
}: TextareaProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-[13px] font-medium text-text-primary mb-1.5">
          {label}
        </label>
      )}
      <textarea
        className={`
          w-full min-h-[100px]
          px-3 py-2.5
          bg-bg-secondary
          border rounded-lg
          text-[13px] text-text-primary
          placeholder:text-text-placeholder
          outline-none
          transition-all duration-150
          resize-y
          ${error
            ? 'border-error focus:border-error focus:ring-2 focus:ring-error/20'
            : 'border-border-light focus:border-accent focus:ring-2 focus:ring-accent/20 focus:bg-bg'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        {...props}
      />
      {hint && !error && (
        <p className="mt-1.5 text-[11px] text-text-secondary leading-relaxed">{hint}</p>
      )}
      {error && (
        <p className="mt-1.5 text-[11px] text-error">{error}</p>
      )}
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  options: { value: string; label: string }[];
}

export function Select({
  label,
  hint,
  options,
  className = '',
  ...props
}: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-[13px] font-medium text-text-primary mb-1.5">
          {label}
        </label>
      )}
      <select
        className={`
          w-full h-9
          pl-3 pr-8
          bg-bg-secondary
          border border-border-light
          rounded-lg
          text-[13px] text-text-primary
          outline-none
          transition-all duration-150
          focus:border-accent focus:ring-2 focus:ring-accent/20 focus:bg-bg
          disabled:opacity-50 disabled:cursor-not-allowed
          cursor-pointer
          appearance-none
          ${className}
        `}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2386868B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 10px center',
        }}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint && (
        <p className="mt-1.5 text-[11px] text-text-secondary leading-relaxed">{hint}</p>
      )}
    </div>
  );
}