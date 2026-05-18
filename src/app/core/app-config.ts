export const APP_CONFIG = {
  appName: 'Atlas',
  tagline: 'Agents that build their own UI.',

  appDomain: 'https://atlas.example.com',

  aiStudioApiKeyUrl: 'https://aistudio.google.com/app/apikey',
  geminiEndpoint: 'https://generativelanguage.googleapis.com',
} as const;

export type AppConfig = typeof APP_CONFIG;
