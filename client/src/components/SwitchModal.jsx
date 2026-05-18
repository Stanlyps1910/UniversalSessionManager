import { useState } from 'react';
import { useSessionContext } from '../context/SessionContext';
import { getAllProviders } from '../utils/providers';
import { getAvailableModels, formatTokenCount } from '../utils/tokenEstimator';

export default function SwitchModal({ isOpen, onClose }) {
  const { activeSession, switchModel, providerStatus } = useSessionContext();
  const [switchingId, setSwitchingId] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen || !activeSession) return null;

  const currentTokens = activeSession.total_tokens || 0;
  
  // Use getAllProviders instead of static PROVIDERS
  const allProviders = getAllProviders();

  // Filter out any provider that is NOT connected and NOT custom
  const connectedProviders = allProviders.filter(p => p.isCustom || providerStatus[p.id]);

  // Compute available models using only the connected providers
  const { available, unavailable } = getAvailableModels(currentTokens, connectedProviders, activeSession.active_model);

  const handleSwitch = async (model) => {
    if (!model.fits || switchingId) return;
    setSwitchingId(model.id);
    setError('');
    try {
      await switchModel(model.provider.id, model.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to switch model');
    } finally {
      setSwitchingId(null);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Switch Model</div>
        <div className="modal-subtitle">Current history: {formatTokenCount(currentTokens)} tokens</div>

        <div style={{ height: '1px', background: 'var(--border-secondary)', margin: '16px -28px', width: 'calc(100% + 56px)' }} />

        {available.length === 0 && unavailable.length === 0 && (
           <div style={{ padding: '12px', fontSize: '13px', color: 'var(--token-warn)', background: '#FFFBEB', borderRadius: '10px', border: '1px solid #FDE68A' }}>
             No API keys configured. Please add a provider in Settings first.
           </div>
        )}

        {available.length > 0 && (
          <div>
            <div className="modal-section-label">AVAILABLE (context fits)</div>
            {available.map(model => {
              const isSwitching = switchingId === model.id;
              
              return (
                <div 
                  key={model.id} 
                  className={`model-option ${isSwitching ? 'disabled' : ''}`}
                  onClick={() => handleSwitch(model)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="model-dot" style={{ backgroundColor: model.provider.color, width: '10px', height: '10px' }} />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {model.provider.displayName} · {model.label}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        {model.provider.displayName}
                        {model.provider.isCustom && <span style={{ marginLeft: '6px', fontSize: '9px', background: 'var(--bg-secondary)', padding: '2px 4px', borderRadius: '4px', color: 'var(--text-tertiary)' }}>CUSTOM</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--token-good)' }}>
                    {formatTokenCount(model.remaining)} left
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {unavailable.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <div className="modal-section-label">CANNOT FIT</div>
            {unavailable.map(model => (
              <div key={model.id} className="model-option disabled">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="model-dot" style={{ backgroundColor: model.provider.color, width: '10px', height: '10px' }} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                      {model.provider.displayName} · {model.label}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      {model.provider.displayName}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--token-critical)' }}>
                  History too large
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div style={{ fontSize: '12px', color: 'var(--token-critical)', marginTop: '12px', padding: '8px', background: '#FEF2F2', borderRadius: '8px', border: '1px solid #FECACA' }}>
            {error}
          </div>
        )}

        <div style={{ height: '1px', background: 'var(--border-secondary)', margin: '20px -28px 16px', width: 'calc(100% + 56px)' }} />

        <button className="modal-cancel" onClick={onClose} style={{ margin: 0 }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
