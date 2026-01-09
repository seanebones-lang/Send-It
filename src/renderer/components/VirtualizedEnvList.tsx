import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Lock, Trash2 } from 'lucide-react';

export interface EnvField {
  id: string;
  key: string;
  value: string;
  description?: string;
  isPassword?: boolean;
}

interface VirtualizedEnvListProps {
  fields: EnvField[];
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: Partial<EnvField>) => void;
  register: any; // react-hook-form register function
  errors: any; // react-hook-form errors
}

export function VirtualizedEnvList({
  fields,
  onRemove,
  onUpdate,
  register,
  errors,
}: VirtualizedEnvListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: fields.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Estimated row height
    overscan: 5, // Render 5 extra items outside viewport
  });

  if (fields.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <p>No environment variables added yet.</p>
        <p className="text-sm mt-2">Click "Add Variable" to get started.</p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="h-96 overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg"
      role="list"
      aria-label="Environment variables list"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const field = fields[virtualRow.index];
          const fieldErrors = errors.customVars?.[virtualRow.index];

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              role="listitem"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                <div>
                  <label
                    htmlFor={`customVars.${virtualRow.index}.key`}
                    className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
                  >
                    Key
                  </label>
                  <input
                    id={`customVars.${virtualRow.index}.key`}
                    {...register(`customVars.${virtualRow.index}.key`)}
                    placeholder="VARIABLE_NAME"
                    className={`w-full px-3 py-2 rounded-lg border ${
                      fieldErrors?.key
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                    } bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2`}
                    aria-invalid={fieldErrors?.key ? 'true' : 'false'}
                    aria-describedby={fieldErrors?.key ? `customVars.${virtualRow.index}.key-error` : undefined}
                  />
                  {fieldErrors?.key && (
                    <p
                      id={`customVars.${virtualRow.index}.key-error`}
                      className="mt-1 text-xs text-red-600 dark:text-red-400"
                      role="alert"
                    >
                      {fieldErrors.key.message}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor={`customVars.${virtualRow.index}.value`}
                    className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-2"
                  >
                    <Lock className="w-3 h-3" />
                    Value (encrypted)
                  </label>
                  <input
                    id={`customVars.${virtualRow.index}.value`}
                    type="password"
                    {...register(`customVars.${virtualRow.index}.value`)}
                    placeholder="value (will be encrypted)"
                    className={`w-full px-3 py-2 rounded-lg border ${
                      fieldErrors?.value
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                    } bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2`}
                    aria-invalid={fieldErrors?.value ? 'true' : 'false'}
                    aria-describedby={fieldErrors?.value ? `customVars.${virtualRow.index}.value-error` : undefined}
                  />
                  {fieldErrors?.value && (
                    <p
                      id={`customVars.${virtualRow.index}.value-error`}
                      className="mt-1 text-xs text-red-600 dark:text-red-400"
                      role="alert"
                    >
                      {fieldErrors.value.message}
                    </p>
                  )}
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => onRemove(field.id)}
                    className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    aria-label={`Remove ${field.key || 'variable'}`}
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              </div>
              <div>
                <label
                  htmlFor={`customVars.${virtualRow.index}.description`}
                  className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
                >
                  Description (optional)
                </label>
                <input
                  id={`customVars.${virtualRow.index}.description`}
                  {...register(`customVars.${virtualRow.index}.description`)}
                  placeholder="What this variable is used for"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
