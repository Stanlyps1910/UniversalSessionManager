// Rough estimation: 1 token ≈ 4 characters (standard approximation)
export function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export function estimateConversationTokens(messages) {
  if (!messages || messages.length === 0) return 0;
  return messages.reduce((total, msg) => {
    return total + estimateTokens(msg.content) + 4; // 4 tokens overhead per message
  }, 0);
}

export function getTokenStatus(used, limit) {
  if (!limit || limit === 0) return 'good';
  const pct = used / limit;
  if (pct >= 0.95) return 'critical';   // Red — switch now
  if (pct >= 0.80) return 'warning';    // Yellow — consider switching
  return 'good';                         // Green — all fine
}

export function getTokenPercentage(used, limit) {
  if (!limit || limit === 0) return 0;
  return Math.min((used / limit) * 100, 100);
}

export function formatTokenCount(count) {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toLocaleString();
}

export function getAvailableModels(currentTokens, allProviders, currentModelId) {
  const available = [];
  const unavailable = [];

  allProviders.forEach(provider => {
    provider.models.forEach(model => {
      if (model.id === currentModelId) return; // skip current model
      const fits = model.contextLimit > currentTokens;
      const remaining = model.contextLimit - currentTokens;
      const entry = {
        ...model,
        provider: { id: provider.id, name: provider.name, displayName: provider.displayName, color: provider.color, icon: provider.icon },
        remaining,
        fits
      };
      fits ? available.push(entry) : unavailable.push(entry);
    });
  });

  // Sort available by most remaining tokens first
  available.sort((a, b) => b.remaining - a.remaining);
  // Sort unavailable by closest to fitting
  unavailable.sort((a, b) => b.remaining - a.remaining);

  return { available, unavailable };
}
