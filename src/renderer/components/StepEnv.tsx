import React, { useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useWizard } from '../contexts/WizardContext';
import { Plus, Trash2, ArrowLeft, CheckCircle, Info } from 'lucide-react';

// Dynamic schema based on platform
const getEnvSchema = (platform: string) => {
  const baseSchema: Record<string, z.ZodString> = {};

  switch (platform) {
    case 'vercel':
      baseSchema.VERCEL_TOKEN = z.string().min(1, 'Vercel token is required');
      baseSchema.VERCEL_ORG_ID = z.string().optional();
      baseSchema.VERCEL_PROJECT_ID = z.string().optional();
      break;
    case 'netlify':
      baseSchema.NETLIFY_AUTH_TOKEN = z.string().min(1, 'Netlify auth token is required');
      baseSchema.NETLIFY_SITE_ID = z.string().optional();
      break;
    case 'cloudflare':
      baseSchema.CLOUDFLARE_API_TOKEN = z.string().min(1, 'Cloudflare API token is required');
      baseSchema.CLOUDFLARE_ACCOUNT_ID = z.string().min(1, 'Cloudflare account ID is required');
      break;
    case 'aws':
      baseSchema.AWS_ACCESS_KEY_ID = z.string().min(1, 'AWS access key ID is required');
      baseSchema.AWS_SECRET_ACCESS_KEY = z.string().min(1, 'AWS secret access key is required');
      baseSchema.AWS_REGION = z.string().default('us-east-1');
      break;
    case 'azure':
      baseSchema.AZURE_CLIENT_ID = z.string().min(1, 'Azure client ID is required');
      baseSchema.AZURE_CLIENT_SECRET = z.string().min(1, 'Azure client secret is required');
      baseSchema.AZURE_TENANT_ID = z.string().min(1, 'Azure tenant ID is required');
      break;
    case 'gcp':
      baseSchema.GOOGLE_APPLICATION_CREDENTIALS = z.string().min(1, 'GCP credentials path is required');
      baseSchema.GCP_PROJECT_ID = z.string().min(1, 'GCP project ID is required');
      break;
    default:
      break;
  }

  // Allow custom environment variables
  const customEnvSchema = z.object({
    customVars: z.array(
      z.object({
        key: z.string().min(1, 'Key is required').regex(/^[A-Z_][A-Z0-9_]*$/, 'Invalid environment variable name'),
        value: z.string().min(1, 'Value is required'),
        description: z.string().optional(),
      })
    ),
  });

  return z.object(baseSchema).merge(customEnvSchema);
};

const platformDescriptions: Record<string, Record<string, string>> = {
  vercel: {
    VERCEL_TOKEN: 'Your Vercel API token. Get it from https://vercel.com/account/tokens',
    VERCEL_ORG_ID: 'Your Vercel organization ID (optional)',
    VERCEL_PROJECT_ID: 'Your Vercel project ID (optional)',
  },
  netlify: {
    NETLIFY_AUTH_TOKEN: 'Your Netlify authentication token. Get it from https://app.netlify.com/user/applications',
    NETLIFY_SITE_ID: 'Your Netlify site ID (optional, can be set later)',
  },
  cloudflare: {
    CLOUDFLARE_API_TOKEN: 'Your Cloudflare API token with Pages edit permissions',
    CLOUDFLARE_ACCOUNT_ID: 'Your Cloudflare account ID from the dashboard',
  },
  aws: {
    AWS_ACCESS_KEY_ID: 'Your AWS access key ID from IAM',
    AWS_SECRET_ACCESS_KEY: 'Your AWS secret access key (keep this secure)',
    AWS_REGION: 'AWS region for deployment (default: us-east-1)',
  },
  azure: {
    AZURE_CLIENT_ID: 'Azure application (client) ID',
    AZURE_CLIENT_SECRET: 'Azure client secret value',
    AZURE_TENANT_ID: 'Azure directory (tenant) ID',
  },
  gcp: {
    GOOGLE_APPLICATION_CREDENTIALS: 'Path to your GCP service account JSON file',
    GCP_PROJECT_ID: 'Your Google Cloud project ID',
  },
};

export function StepEnv() {
  const { state, setEnvVar, prevStep, reset } = useWizard();

  const schema = useMemo(() => {
    if (!state.selectedPlatform) return z.object({});
    return getEnvSchema(state.selectedPlatform);
  }, [state.selectedPlatform]);

  type EnvForm = z.infer<ReturnType<typeof getEnvSchema>>;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<EnvForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      customVars: [],
      ...state.envVars,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'customVars',
  });

  const onSubmit = (data: EnvForm) => {
    // Save all environment variables
    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'customVars' && typeof value === 'string') {
        setEnvVar(key, value);
      }
    });

    // Save custom variables
    if (data.customVars) {
      data.customVars.forEach(({ key, value }) => {
        setEnvVar(key, value);
      });
    }

    // Show success and reset wizard
    alert('Environment variables saved! Wizard complete.');
    reset();
  };

  if (!state.selectedPlatform) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6">
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            Please select a platform first. Go back to the analysis step.
          </p>
        </div>
        <button
          onClick={prevStep}
          className="mt-4 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const descriptions = platformDescriptions[state.selectedPlatform] || {};
  const schemaShape = (schema as any).shape || {};
  const platformFields = Object.keys(schemaShape).filter((key) => key !== 'customVars');

  return (
    <div className="w-full max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Environment Variables</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Configure environment variables for <span className="font-semibold">{state.selectedPlatform}</span>{' '}
          deployment.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Platform-specific fields */}
        {platformFields.map((fieldName) => {
          const fieldSchema = schemaShape[fieldName];
          const isRequired = fieldSchema?._def?.typeName === 'ZodString' && !fieldSchema.isOptional();
          return (
            <div key={fieldName}>
              <label
                htmlFor={fieldName}
                className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
              >
                {fieldName}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </label>
              <input
                id={fieldName}
                type={fieldName.toLowerCase().includes('secret') || fieldName.toLowerCase().includes('key') ? 'password' : 'text'}
                {...register(fieldName as any)}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors[fieldName as keyof typeof errors]
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2`}
                placeholder={`Enter ${fieldName}`}
              />
              {descriptions[fieldName] && (
                <div className="mt-2 flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-600 dark:text-blue-400">{descriptions[fieldName]}</p>
                </div>
              )}
              {errors[fieldName as keyof typeof errors] && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {errors[fieldName as keyof typeof errors]?.message as string}
                </p>
              )}
            </div>
          );
        })}

        {/* Custom environment variables */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Custom Variables</h3>
            <button
              type="button"
              onClick={() => append({ key: '', value: '', description: '' })}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Variable
            </button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div>
                    <label
                      htmlFor={`customVars.${index}.key`}
                      className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
                    >
                      Key
                    </label>
                    <input
                      id={`customVars.${index}.key`}
                      {...register(`customVars.${index}.key`)}
                      placeholder="VARIABLE_NAME"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {errors.customVars?.[index]?.key && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {errors.customVars[index]?.key?.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor={`customVars.${index}.value`}
                      className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
                    >
                      Value
                    </label>
                    <input
                      id={`customVars.${index}.value`}
                      {...register(`customVars.${index}.value`)}
                      placeholder="value"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {errors.customVars?.[index]?.value && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {errors.customVars[index]?.value?.message}
                      </p>
                    )}
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </button>
                  </div>
                </div>
                <div>
                  <label
                    htmlFor={`customVars.${index}.description`}
                    className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
                  >
                    Description (optional)
                  </label>
                  <input
                    id={`customVars.${index}.description`}
                    {...register(`customVars.${index}.description`)}
                    placeholder="What this variable is used for"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={prevStep}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Save & Complete
          </button>
        </div>
      </form>
    </div>
  );
}
