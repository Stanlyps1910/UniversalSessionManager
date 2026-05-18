import { useState } from 'react';
import { useSessionContext } from '../context/SessionContext';
import { getAllProviders } from '../utils/providers';
import { formatTokenCount } from '../utils/tokenEstimator';

export default function NewSessionModal({ isOpen, onClose }) {
  const { createSession, providerStatus } = useSessionContext();
  const [title, setTitle] = useState('');
  const [selectedModelStr, setSelectedModelStr] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const allProviders = getAllProviders();
  
  // Filter only connected providers
  const availableProviders = allProviders.filter(p => p.isCustom || providerStatus[p.id]);

  const availableModels = availableProviders.flatMap(provider => 
    provider.models.map(model => ({
      providerId: provider.id,
      modelId: model.id,
      label: `${provider.displayName} · ${model.label}`,
      contextLimit: model.contextLimit
    }))
  );

  const handleCreate = async () => {
    if (!title.trim()) {
      setError('Please enter a session name');
      return;
    }
    if (!selectedModelStr) {
      setError('Please select a starting model');
      return;
    }

    const [providerId, modelId] = selectedModelStr.split('|');

    setIsCreating(true);
    setError('');

    try {
      await createSession(title.trim(), providerId, modelId);
      setTitle('');
      setSelectedModelStr('');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && selectedModelStr && title.trim()) {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title" style={{ marginBottom: '24px' }}>New Session</div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Session name
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Research Project"
            autoFocus
            className="form-input"
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Starting model
          </label>
          {availableModels.length === 0 ? (
            <div style={{ padding: '12px', fontSize: '13px', color: 'var(--token-warn)', background: '#FFFBEB', borderRadius: '10px', border: '1px solid #FDE68A' }}>
              No API keys configured. Please add a provider in Settings first.
            </div>
          ) : (
            <select
              value={selectedModelStr}
              onChange={(e) => setSelectedModelStr(e.target.value)}
              className="form-input"
              style={{ cursor: 'pointer', appearance: 'none', background: 'var(--bg-secondary) url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 12px center', backgroundSize: '16px' }}
            >
              <option value="" disabled>Select a model...</option>
              {availableModels.map(m => (
                <option key={`${m.providerId}|${m.modelId}`} value={`${m.providerId}|${m.modelId}`}>
                  {m.label} ({formatTokenCount(m.contextLimit)} tokens)
                </option>
              ))}
            </select>
          )}
        </div>

        {error && (
          <div style={{ fontSize: '12px', color: 'var(--token-critical)', marginBottom: '16px', padding: '8px 12px', background: '#FEF2F2', borderRadius: '8px', border: '1px solid #FECACA' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            className="modal-cancel" 
            style={{ flex: 1, margin: 0 }} 
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!title.trim() || !selectedModelStr || isCreating}
            className="modal-primary-btn"
            style={{ flex: 1, margin: 0 }}
          >
            {isCreating ? 'Creating...' : 'Create Chat →'}
          </button>
        </div>
      </div>
    </div>
  );
}
