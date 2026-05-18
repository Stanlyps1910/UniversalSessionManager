import { useState, useRef, useEffect, useCallback } from 'react';
import { useSessionContext } from '../context/SessionContext';
import Sidebar from './Sidebar';
import NewSessionModal from './NewSessionModal';
import SwitchModal from './SwitchModal';
import SettingsPanel from './SettingsPanel';
import MessageBubble from './MessageBubble';
import SwitchDivider from './SwitchDivider';
import { getModel, getProvider, getProviderColor } from '../utils/providers';
import { getTokenStatus } from '../utils/tokenEstimator';

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2L11 13" />
    <path d="M22 2L15 22L11 13L2 9L22 2Z" />
  </svg>
);

const ExchangeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 4l-4 4 4 4M4 8h16M16 20l4-4-4-4M20 16H4" />
  </svg>
);

export default function Dashboard() {
  const {
    activeSession,
    messages,
    switches,
    isLoading,
    isSending,
    sendMessage,
    updateSession,
  } = useSessionContext();

  const [showNewSession, setShowNewSession] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [inputText, setInputText] = useState('');
  const textareaRef = useRef(null);
  const bottomRef = useRef(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const titleInputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isSending]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    }
  }, [inputText]);

  useEffect(() => {
    if (activeSession && textareaRef.current && !isEditingTitle) {
      textareaRef.current.focus();
    }
  }, [activeSession?.id, isEditingTitle]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isEditingTitle]);

  const handleGlobalKeyDown = useCallback((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      setShowNewSession(true);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      setShowSwitchModal(true);
    }
    if (e.key === 'Escape') {
      setShowNewSession(false);
      setShowSwitchModal(false);
      setShowSettings(false);
      setIsEditingTitle(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  const timeline = (() => {
    if (!messages.length) return [];
    const items = [];
    messages.forEach(msg => {
      items.push({ type: 'message', data: msg, timestamp: msg.created_at });
    });
    switches.forEach(sw => {
      items.push({ type: 'switch', data: sw, timestamp: sw.switched_at });
    });
    items.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    return items;
  })();

  const handleSubmit = () => {
    if (!inputText.trim() || isSending || !activeSession) return;
    sendMessage(inputText.trim());
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTitleSubmit = () => {
    if (tempTitle.trim() && tempTitle !== activeSession?.title) {
      updateSession(activeSession.id, { title: tempTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const startTitleEdit = () => {
    if (!activeSession) return;
    setTempTitle(activeSession.title);
    setIsEditingTitle(true);
  };

  const tokenLimit = activeSession ? getModel(activeSession.active_provider, activeSession.active_model)?.contextLimit || 8000 : 8000;
  const tokenUsed = activeSession?.total_tokens || 0;
  const tokenPct = Math.min((tokenUsed / tokenLimit) * 100, 100);
  
  let tokenColor = 'var(--token-good)';
  let tokenStatus = 'good';
  if (tokenPct >= 95) {
    tokenColor = 'var(--token-critical)';
    tokenStatus = 'critical';
  } else if (tokenPct >= 80) {
    tokenColor = 'var(--token-warn)';
    tokenStatus = 'warning';
  }

  const provider = activeSession ? getProvider(activeSession.active_provider) : null;
  const model = activeSession ? getModel(activeSession.active_provider, activeSession.active_model) : null;

  return (
    <>
      <div className="app-layout">
        <Sidebar
          onNewSession={() => setShowNewSession(true)}
          onOpenSettings={() => setShowSettings(true)}
        />

        <main className="main-column">
          {!activeSession ? (
            <div className="empty-state">
              <span style={{ fontSize: '24px', marginBottom: '8px' }}>💬</span>
              <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500' }}>No sessions yet</div>
              <div>Create your first session to start chatting</div>
            </div>
          ) : (
            <>
              <div className="topbar-layout">
                {isEditingTitle ? (
                  <input
                    ref={titleInputRef}
                    className="topbar-title"
                    style={{ border: 'none', background: 'transparent' }}
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onBlur={handleTitleSubmit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleTitleSubmit();
                      if (e.key === 'Escape') setIsEditingTitle(false);
                    }}
                  />
                ) : (
                  <div className="topbar-title" onClick={startTitleEdit}>
                    {activeSession.title}
                  </div>
                )}
                
                <div className="topbar-right">
                  {provider && model && (
                    <div className="provider-badge">
                      <span
                        className="model-dot"
                        style={{ backgroundColor: provider.color }}
                      />
                      {provider.name} · {model.label}
                    </div>
                  )}

                  <div className="token-bar-container">
                    <span className="token-label">
                      {tokenUsed.toLocaleString()} / {tokenLimit.toLocaleString()}
                    </span>
                    <div className="token-bar-track">
                      <div
                        className="token-fill"
                        style={{
                          width: `${tokenPct}%`,
                          backgroundColor: tokenColor
                        }}
                      />
                    </div>
                  </div>

                  <button
                    className="switch-btn"
                    onClick={() => setShowSwitchModal(true)}
                  >
                    <ExchangeIcon />
                    Switch Model
                  </button>
                </div>
              </div>

              {tokenStatus === 'warning' && (
                <div className="warning-banner warn">
                  <span>⚠</span> Approaching token limit. Consider switching models soon.
                </div>
              )}
              {tokenStatus === 'critical' && (
                <div className="warning-banner critical">
                  <span>⛔</span> Token limit almost reached. Switch model to continue without losing context.
                </div>
              )}

              <div className="chat-area-layout">
                {isLoading ? (
                  <div className="empty-state">
                    Loading...
                  </div>
                ) : (
                  <>
                    {timeline.length === 0 && !isSending && (
                      <div className="empty-state">
                        <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500' }}>Start the conversation</div>
                        <div>Ask anything — your context is saved automatically</div>
                      </div>
                    )}
                    {timeline.map((item, index) => {
                      if (item.type === 'switch') {
                        return <SwitchDivider key={`switch-${item.data.id || index}`} switchEvent={item.data} />;
                      }
                      return <MessageBubble key={item.data.id} message={item.data} />;
                    })}
                    {isSending && (
                      <div className="typing-indicator">
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                      </div>
                    )}
                    <div ref={bottomRef} style={{ height: 1 }} />
                  </>
                )}
              </div>

              <div className="input-bar-layout">
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message..."
                  disabled={isSending}
                  className="chat-input"
                  rows={1}
                />
                <button
                  onClick={handleSubmit}
                  disabled={isSending || !inputText.trim()}
                  className="send-btn"
                >
                  <SendIcon />
                </button>
              </div>
            </>
          )}

          <SettingsPanel
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
          />
        </main>
      </div>

      <NewSessionModal
        isOpen={showNewSession}
        onClose={() => setShowNewSession(false)}
      />
      <SwitchModal
        isOpen={showSwitchModal}
        onClose={() => setShowSwitchModal(false)}
      />
    </>
  );
}
