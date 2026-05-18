export function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);
  console.error(err.stack);

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Structure error response
  const response = {
    error: true,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  // Handle specific error types
  if (err.name === 'ApiKeyMissingError') {
    response.message = `Add your ${err.provider} API key in Settings to use this model`;
    response.code = 'API_KEY_MISSING';
    return res.status(400).json(response);
  }

  if (err.name === 'ProviderError') {
    response.message = `${err.provider} API error: ${err.message}`;
    response.code = 'PROVIDER_ERROR';
    return res.status(502).json(response);
  }

  res.status(statusCode).json(response);
}

// Custom error classes
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
