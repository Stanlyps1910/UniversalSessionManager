export const PROVIDERS = [
  {
    id: 'claude',
    name: 'Anthropic',
    displayName: 'Claude',
    color: '#C17B4E',
    icon: 'C',
    models: [
      { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6', contextLimit: 8000, tier: 'free' },
      { id: 'claude-haiku-4-5', label: 'Haiku 4.5', contextLimit: 5000, tier: 'free' },
    ]
  },
  {
    id: 'openai',
    name: 'OpenAI',
    displayName: 'ChatGPT',
    color: '#10A37F',
    icon: 'O',
    models: [
      { id: 'gpt-4o', label: 'GPT-4o', contextLimit: 8000, tier: 'free' },
      { id: 'gpt-4o-mini', label: 'GPT-4o mini', contextLimit: 8000, tier: 'free' },
    ]
  },
  {
    id: 'google',
    name: 'Google',
    displayName: 'Gemini',
    color: '#4285F4',
    icon: 'Gm',
    models: [
      { id: 'gemini-2.0-flash', label: 'Flash 2.0', contextLimit: 32000, tier: 'free' },
      { id: 'gemini-1.5-pro', label: 'Pro 1.5', contextLimit: 32000, tier: 'free' },
    ]
  },
  {
    id: 'mistral',
    name: 'Mistral',
    displayName: 'Le Chat',
    color: '#FF6B35',
    icon: 'M',
    models: [
      { id: 'mistral-small-latest', label: 'Small', contextLimit: 32000, tier: 'free' },
      { id: 'open-mistral-7b', label: 'Mistral 7B', contextLimit: 32000, tier: 'free' },
    ]
  }
];

export function getCustomProviders() {
  if (typeof window === 'undefined') return [];
  try {
    const custom = localStorage.getItem('usm-custom-providers');
    return custom ? JSON.parse(custom) : [];
  } catch (e) {
    return [];
  }
}

export function getAllProviders() {
  return [...PROVIDERS, ...getCustomProviders()];
}

export function getProvider(providerId) {
  return getAllProviders().find(p => p.id === providerId);
}

export function getModel(providerId, modelId) {
  const provider = getProvider(providerId);
  if (!provider) return null;
  return provider.models.find(m => m.id === modelId);
}

export function getProviderColor(providerId) {
  const provider = getProvider(providerId);
  return provider?.color || '#6366f1';
}

export function getModelLabel(providerId, modelId) {
  const provider = getProvider(providerId);
  const model = provider?.models.find(m => m.id === modelId);
  return model ? `${provider.displayName} · ${model.label}` : modelId;
}
