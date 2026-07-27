"use client";

import type { ReactNode } from "react";
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

type FieldProps = {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
};

export function AdminFormField({
  label,
  error,
  hint,
  required,
  children,
}: FieldProps) {
  return (
    <label className="admin-form-field">
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      {children}
      {hint ? <small className="admin-field-hint">{hint}</small> : null}
      {error ? (
        <small className="admin-field-error" role="alert">
          {error}
        </small>
      ) : null}
    </label>
  );
}

export function AdminTextInput({
  className = "admin-input",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={className} {...props} />;
}

export function AdminTextarea({
  className = "admin-input",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={className} {...props} />;
}

export function AdminSelect({
  className = "admin-input",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={className} {...props}>
      {children}
    </select>
  );
}

export function AdminControlledField<T extends FieldValues>({
  control,
  name,
  label,
  required,
  hint,
  children,
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  required?: boolean;
  hint?: string;
  children: (args: {
    value: unknown;
    onChange: (...event: unknown[]) => void;
    onBlur: () => void;
  }) => ReactNode;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <AdminFormField
          label={label}
          required={required}
          hint={hint}
          error={fieldState.error?.message}
        >
          {children({
            value: field.value,
            onChange: field.onChange,
            onBlur: field.onBlur,
          })}
        </AdminFormField>
      )}
    />
  );
}
