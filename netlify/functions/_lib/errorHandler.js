export function formatError(err) {
  console.error('Error:', err.message);
  console.error(err.stack);

  const statusCode = err.statusCode || err.status || 500;

  const response = {
    error: true,
    message: err.message || 'Internal server error',
  };

  if (err.name === 'ApiKeyMissingError') {
    response.message = `Add your ${err.provider} API key in Settings to use this model`;
    response.code = 'API_KEY_MISSING';
    return { statusCode: 400, body: JSON.stringify(response) };
  }

  if (err.name === 'ProviderError') {
    response.message = `${err.provider} API error: ${err.message}`;
    response.code = 'PROVIDER_ERROR';
    return { statusCode: 502, body: JSON.stringify(response) };
  }

  return { statusCode, body: JSON.stringify(response) };
}

export class ApiKeyMissingError extends Error {
  constructor(provider) {
    super(`API key missing for ${provider}`);
    this.name = 'ApiKeyMissingError';
    this.provider = provider;
    this.statusCode = 400;
  }
}

export class ProviderError extends Error {
  constructor(provider, message) {
    super(message);
    this.name = 'ProviderError';
    this.provider = provider;
    this.statusCode = 502;
  }
}
