import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const projectId = process.env.EXPO_PROJECT_ID || config.extra?.eas?.projectId;
  const owner = process.env.EXPO_OWNER || config.owner;
  return {
    ...config,
    name: config.name ?? 'SpendLens',
    slug: config.slug ?? 'spendlens',
    ...(owner ? { owner } : {}),
    ...(projectId ? { extra: { ...config.extra, eas: { ...config.extra?.eas, projectId } } } : {}),
  };
};
