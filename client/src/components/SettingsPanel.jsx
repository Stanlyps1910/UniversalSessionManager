import { useState } from 'react';
import { useSessionContext } from '../context/SessionContext';
import { PROVIDERS, getAllProviders } from '../utils/providers';

export default function SettingsPanel({ isOpen, onClose }) {
  const { providerStatus, saveApiKey, removeApiKey, saveCustomProvider, removeCustomProvider } = useSessionContext();
  const [keys, setKeys] = useState({});
  const [saving, setSaving] = useState({});

  // Custom tool state
  const [customName, setCustomName] = useState('');
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [customKey, setCustomKey] = useState('');

  if (!isOpen) return null;

  const handleSave = async (providerId) => {
    const key = keys[providerId];
    if (!key?.trim()) return;
    setSaving(p => ({ ...p, [providerId]: true }));
    try {
      await saveApiKey(providerId, key.trim());
      setKeys(p => ({ ...p, [providerId]: '' }));
    } catch (err) { /* handled in context */ }
    setSaving(p => ({ ...p, [providerId]: false }));
  };

  const handleRemove = async (providerId) => {
    await removeApiKey(providerId);
  };

  const handleAddCustom = () => {
    if (!customName.trim() || !customBaseUrl.trim() || !customModel.trim() || !customKey.trim()) return;
    
    const newId = 'custom_' + Date.now();
    const newProvider = {
      id: newId,
      name: customName.trim(),
      displayName: customName.trim(),
      color: 'var(--provider-custom)',
      icon: customName.trim().substring(0, 2).toUpperCase(),
      isCustom: true,
      baseURL: customBaseUrl.trim(),
      apiKey: customKey.trim(),
      models: [
        { id: customModel.trim(), label: customModel.trim(), contextLimit: 128000, tier: 'custom' }
      ]
    };

    saveCustomProvider(newProvider);
    
    // Clear form
    setCustomName('');
    setCustomBaseUrl('');
    setCustomModel('');
    setCustomKey('');
  };

  const allProviders = getAllProviders();

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <button className="settings-close" onClick={onClose}>
          ← Back
        </button>
        <span style={{ fontSize: '15px', fontWeight: '600' }}>Settings</span>
      </div>

      <div className="settings-content">
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>Connected Providers</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Keys are stored locally and only sent to the respective AI provider.
          </div>

          <div>
            {allProviders.map(provider => {
              const connected = provider.isCustom || providerStatus[provider.id];
              
              return (
                <div key={provider.id} className={`provider-card ${connected ? 'connected' : ''}`}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="model-dot" style={{ backgroundColor: provider.color, width: '10px', height: '10px' }} />
                      <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {provider.displayName}
                        {provider.isCustom && <span style={{ marginLeft: '8px', fontSize: '10px', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-tertiary)' }}>CUSTOM</span>}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: connected ? 'var(--token-good)' : 'var(--text-tertiary)' }}>
                      {connected ? '✅ Connected' : '○ Connect'}
                    </div>
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', marginLeft: '20px' }}>
                    {provider.models.map(m => <div key={m.id}>{m.id}</div>)}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: '8px' }}>
                    {connected ? (
                      <button 
                        onClick={() => provider.isCustom ? removeCustomProvider(provider.id) : handleRemove(provider.id)}
                        className="modal-cancel"
                        style={{ width: 'auto', padding: '6px 16px', marginTop: 0 }}
                      >
                        Disconnect
                      </button>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                        <input
                          type="password"
                          value={keys[provider.id] || ''}
                          onChange={(e) => setKeys(p => ({ ...p, [provider.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(provider.id); }}
                          placeholder={`Enter API key`}
                          className="form-input"
                        />
                        <button 
                          onClick={() => handleSave(provider.id)}
                          disabled={!keys[provider.id]?.trim() || saving[provider.id]}
                          className="modal-primary-btn"
                          style={{ padding: '8px 16px', whiteSpace: 'nowrap' }}
                        >
                          {saving[provider.id] ? '...' : `Connect →`}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-secondary)', paddingTop: '32px' }}>
          <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>Add Custom AI Tool</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Use an API Key of any OpenAI-compatible AI tool available on the internet (e.g. OpenRouter, Groq, Together).
          </div>

          <div className="provider-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '4px' }}>Provider Name</label>
              <input 
                type="text" 
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="e.g. Groq" 
                className="form-input" 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '4px' }}>Base URL</label>
              <input 
                type="text" 
                value={customBaseUrl}
                onChange={e => setCustomBaseUrl(e.target.value)}
                placeholder="e.g. https://api.groq.com/openai/v1" 
                className="form-input" 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '4px' }}>Model ID</label>
              <input 
                type="text" 
                value={customModel}
                onChange={e => setCustomModel(e.target.value)}
                placeholder="e.g. llama3-70b-8192" 
                className="form-input" 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '4px' }}>API Key</label>
              <input 
                type="password" 
                value={customKey}
                onChange={e => setCustomKey(e.target.value)}
                placeholder="sk-..." 
                className="form-input" 
              />
            </div>

            <button 
              onClick={handleAddCustom}
              disabled={!customName.trim() || !customBaseUrl.trim() || !customModel.trim() || !customKey.trim()}
              className="modal-primary-btn"
              style={{ marginTop: '8px' }}
            >
              Add Custom Tool
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
