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
}

export function StudioOptionGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: StudioOptionGroupProps<T>) {
  return (
    <fieldset>
      <legend className="mb-2.5 text-sm font-medium text-foreground/90">
        {label}
      </legend>
      <div className="flex flex-wrap gap-2.5">
        {options.map((option) => {
          const selected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.id as T)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                selected
                  ? "border-adtraxio-accent/40 bg-adtraxio-accent/10 text-foreground"
                  : "border-border/70 bg-secondary/20 text-muted-foreground hover:text-foreground"
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
