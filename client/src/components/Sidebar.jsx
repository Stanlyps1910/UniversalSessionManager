import { useState, useEffect } from 'react';
import { useSessionContext } from '../context/SessionContext';
import { getModel, getProvider } from '../utils/providers';

export default function Sidebar({ onNewSession, onOpenSettings }) {
  const { sessions, activeSessionId, selectSession, deleteSession } = useSessionContext();
  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener('click', handleClick);
    }
    return () => window.removeEventListener('click', handleClick);
  }, [contextMenu]);

  const handleContextMenu = (e, sessionId) => {
    e.preventDefault();
    const menuWidth = 140;
    const menuHeight = 60;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 8);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 8);
    setContextMenu({ x: Math.max(8, x), y: Math.max(8, y), sessionId });
  };

  const handleDelete = () => {
    if (contextMenu) {
      deleteSession(contextMenu.sessionId);
      setContextMenu(null);
    }
  };

  const formatTokens = (tokens) => {
    if (!tokens) return '0 tokens';
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k tokens`;
    return `${tokens} tokens`;
  };

  return (
    <>
      <aside
        className="sidebar-layout"
        onClick={() => setContextMenu(null)}
      >
        <div className="sidebar-header">
          <span style={{ fontSize: '16px', fontWeight: '700', letterSpacing: '-0.02em', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Universal Session Manager
          </span>
        </div>
        <div style={{ padding: '16px 20px 8px' }}>
          <button className="new-chat-btn" onClick={onNewSession} style={{ width: '100%' }}>
            + New Chat
          </button>
        </div>

        <div className="sidebar-sessions">
          {sessions.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
              No sessions yet
            </div>
          ) : (
            sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const provider = getProvider(session.active_provider);
              const providerName = provider ? provider.name : 'Unknown';
              return (
                <div
                  key={session.id}
                  className={`session-item ${isActive ? 'active' : ''}`}
                  onClick={() => selectSession(session.id)}
                  onContextMenu={(e) => handleContextMenu(e, session.id)}
                >
                  <div className="session-title">
                    {isActive ? '● ' : '○ '}{session.title}
                  </div>
                  <div className="session-meta">
                    {providerName} · {formatTokens(session.total_tokens)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="sidebar-footer" onClick={onOpenSettings}>
          ⚙ Settings
        </div>
      </aside>

      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-primary)',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
            padding: '4px',
            minWidth: '140px',
            zIndex: 200,
            animation: 'fadeIn 0.15s ease forwards'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '8px 16px',
              fontSize: '13px',
              color: 'var(--token-critical)',
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
            onClick={handleDelete}
            onMouseOver={(e) => e.target.style.background = '#FCEBEB'}
            onMouseOut={(e) => e.target.style.background = 'transparent'}
          >
            Delete chat
          </button>
        </div>
      )}
    </>
  );
}