import React, { useMemo, useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useWizard } from '../contexts/WizardContext';
import { useElectron } from '../hooks/useElectron';
import { Plus, Trash2, ArrowLeft, CheckCircle, Info, Lock, Key, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';

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
  const { electronAPI, isAvailable } = useElectron();
  const [keychainPermission, setKeychainPermission] = useState<boolean | null>(null);
  const [oauthLoading, setOauthLoading] = useState<'vercel' | 'railway' | null>(null);
  const [tokenStatus, setTokenStatus] = useState<Record<string, boolean>>({});

  // Check keychain permission on mount
  useEffect(() => {
    if (isAvailable && electronAPI?.keychain?.check) {
      electronAPI.keychain.check().then((result: any) => {
        setKeychainPermission(result?.hasPermission ?? false);
      });
    }
  }, [isAvailable, electronAPI]);

  // Check token status for platforms
  useEffect(() => {
    if (state.selectedPlatform && isAvailable && electronAPI?.token?.get) {
      const platform = state.selectedPlatform === 'vercel' ? 'vercel' : state.selectedPlatform === 'railway' ? 'railway' : null;
      if (platform) {
        electronAPI.token.get(platform).then((result: any) => {
          setTokenStatus((prev) => ({ ...prev, [platform]: result?.success ?? false }));
        });
      }
    }
  }, [state.selectedPlatform, isAvailable, electronAPI]);

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
    setValue,
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

  const handleOAuth = async (platform: 'vercel' | 'railway') => {
    if (!electronAPI?.token?.oauth) {
      return;
    }

    setOauthLoading(platform);
    try {
      const result = await electronAPI.token.oauth(platform);
      if (result?.success) {
        setTokenStatus((prev) => ({ ...prev, [platform]: true }));
        // Set token field as authenticated
        if (platform === 'vercel') {
          setValue('VERCEL_TOKEN', '***authenticated***' as any);
        } else if (platform === 'railway') {
          setValue('RAILWAY_TOKEN', '***authenticated***' as any);
        }
      } else {
        alert(`OAuth failed: ${result?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('OAuth error:', error);
      alert(`OAuth error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setOauthLoading(null);
    }
  };

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
          deployment. All values are encrypted before deployment.
        </p>

        {/* Keychain Permission Warning */}
        {keychainPermission === false && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Keychain Access Required</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                Please grant keychain access in your system preferences to securely store tokens.
              </p>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Platform-specific fields */}
        {platformFields.map((fieldName) => {
          const fieldSchema = schemaShape[fieldName];
          const isRequired = fieldSchema?._def?.typeName === 'ZodString' && !fieldSchema.isOptional();
          const isTokenField = fieldName.includes('TOKEN') || fieldName.includes('SECRET') || fieldName.includes('KEY');
          const isPassword = isTokenField || fieldName.toLowerCase().includes('secret') || fieldName.toLowerCase().includes('password');
          const platform = state.selectedPlatform === 'vercel' ? 'vercel' : state.selectedPlatform === 'railway' ? 'railway' : null;
          const hasToken = platform && tokenStatus[platform];
          const isVercelToken = fieldName === 'VERCEL_TOKEN' && state.selectedPlatform === 'vercel';
          const isRailwayToken = (fieldName === 'RAILWAY_TOKEN' || fieldName === 'RAILWAY_API_TOKEN') && state.selectedPlatform === 'railway';
          const showOAuthButton = (isVercelToken || isRailwayToken) && platform && !hasToken;

          return (
            <div key={fieldName}>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor={fieldName}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2"
                >
                  {isPassword && <Lock className="w-4 h-4" />}
                  {fieldName}
                  {isRequired && <span className="text-red-500 ml-1">*</span>}
                </label>
                {showOAuthButton && (
                  <button
                    type="button"
                    onClick={() => handleOAuth(platform)}
                    disabled={oauthLoading === platform}
                    className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    {oauthLoading === platform ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Authenticating...
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4" />
                        Authenticate with {platform === 'vercel' ? 'Vercel' : 'Railway'}
                      </>
                    )}
                  </button>
                )}
                {hasToken && (isVercelToken || isRailwayToken) && (
                  <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Authenticated
                  </span>
                )}
              </div>
              <input
                id={fieldName}
                type={isPassword ? 'password' : 'text'}
                {...register(fieldName as any)}
                disabled={hasToken && (isVercelToken || isRailwayToken)}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors[fieldName as keyof typeof errors]
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 ${
                  hasToken && (isVercelToken || isRailwayToken) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                placeholder={
                  hasToken && (isVercelToken || isRailwayToken)
                    ? 'Token authenticated via OAuth'
                    : `Enter ${fieldName}`
                }
                aria-invalid={errors[fieldName as keyof typeof errors] ? 'true' : 'false'}
                aria-describedby={errors[fieldName as keyof typeof errors] ? `${fieldName}-error` : descriptions[fieldName] ? `${fieldName}-description` : undefined}
                aria-disabled={hasToken && (isVercelToken || isRailwayToken)}
              />
              {descriptions[fieldName] && (
                <div id={`${fieldName}-description`} className="mt-2 flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg" role="note">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <p className="text-sm text-blue-600 dark:text-blue-400">{descriptions[fieldName]}</p>
                </div>
              )}
              {errors[fieldName as keyof typeof errors] && (
                <p id={`${fieldName}-error`} className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
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
                      className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-2"
                    >
                      <Lock className="w-3 h-3" />
                      Value (encrypted)
                    </label>
                    <input
                      id={`customVars.${index}.value`}
                      type="password"
                      {...register(`customVars.${index}.value`)}
                      placeholder="value (will be encrypted)"
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
