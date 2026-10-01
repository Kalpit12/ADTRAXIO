"use client";

import { cn } from "@/lib/utils";

const fieldClassName =
  "w-full rounded-md border border-border/80 bg-secondary/30 px-3.5 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/45 focus:border-adtraxio-accent/50 focus:ring-2 focus:ring-adtraxio-accent/15";

interface StudioFieldProps {
  label: string;
  htmlFor: string;
  optional?: boolean;
  error?: string;
  children: React.ReactNode;
}

export function StudioField({
  label,
  htmlFor,
  optional,
  error,
  children,
}: StudioFieldProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-foreground/90"
      >
        {label}
        {optional && (
          <span className="ml-1 font-normal text-muted-foreground/70">
            (optional)
          </span>
        )}
      </label>
      {children}
      {error && (
        <p id={`${htmlFor}-error`} className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface StudioInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  optional?: boolean;
}

export function StudioInput({
  label,
  error,
  optional,
  id,
  className,
  ...props
}: StudioInputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <StudioField
      label={label}
      htmlFor={inputId}
      optional={optional}
      error={error}
    >
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={cn(fieldClassName, "h-11", className)}
        {...props}
      />
    </StudioField>
  );
}

interface StudioTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  optional?: boolean;
}

export function StudioTextarea({
  label,
  error,
  optional,
  id,
  className,
  ...props
}: StudioTextareaProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <StudioField
      label={label}
      htmlFor={inputId}
      optional={optional}
      error={error}
    >
      <textarea
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={cn(
          fieldClassName,
          "min-h-[100px] resize-y py-3 leading-relaxed",
          className
        )}
        {...props}
      />
    </StudioField>
  );
}

interface StudioOption {
  id: string;
  label: string;
}

interface StudioOptionGroupProps<T extends string> {
  label: string;
  options: StudioOption[];
  value: T;
  onChange: (value: T) => void;
  compact?: boolean;
}

export function StudioOptionGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  compact = false,
}: StudioOptionGroupProps<T>) {
  return (
    <fieldset>
      <legend
        className={cn(
          "mb-2 font-medium text-foreground/90",
          compact ? "text-xs text-muted-foreground" : "text-sm"
        )}
      >
        {label}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const selected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.id as T)}
              className={cn(
                "min-h-9 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-adtraxio-accent/30",
                selected
                  ? "border-adtraxio-accent/35 bg-white/[0.05] text-foreground ring-1 ring-adtraxio-accent/15"
                  : "border-border/70 bg-transparent text-muted-foreground hover:bg-white/[0.02] hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
