import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { getAllProviders, getCustomProviders } from '../utils/providers';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [switches, setSwitches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('usm-theme') || 'light';
    }
    return 'light';
  });
  
  const [customProviders, setCustomProviders] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const custom = localStorage.getItem('usm-custom-providers');
        return custom ? JSON.parse(custom) : [];
      } catch (e) { return []; }
    }
    return [];
  });

  const [providerStatus, setProviderStatus] = useState({});
  const messagesRef = useRef(messages);
  const activeSessionRef = useRef(activeSession);
  const isSendingRef = useRef(isSending);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { activeSessionRef.current = activeSession; }, [activeSession]);
  useEffect(() => { isSendingRef.current = isSending; }, [isSending]);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('usm-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  useEffect(() => {
    localStorage.setItem('usm-custom-providers', JSON.stringify(customProviders));
    // Re-evaluate providerStatus to mark custom providers as connected
    setProviderStatus(prev => {
      const next = { ...prev };
      customProviders.forEach(cp => {
        next[cp.id] = true; // Custom providers are always 'connected' if they exist
      });
      return next;
    });
  }, [customProviders]);

  const saveCustomProvider = useCallback((providerDetails) => {
    setCustomProviders(prev => {
      const exists = prev.find(p => p.id === providerDetails.id);
      if (exists) {
        return prev.map(p => p.id === providerDetails.id ? providerDetails : p);
      }
      return [...prev, providerDetails];
    });
  }, []);

  const removeCustomProvider = useCallback((providerId) => {
    setCustomProviders(prev => prev.filter(p => p.id !== providerId));
  }, []);

  // Load all sessions
  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions');
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  }, []);

  // Select and load a session
  const selectSession = useCallback(async (sessionId) => {
    if (!sessionId) {
      setActiveSessionId(null);
      setActiveSession(null);
      setMessages([]);
      setSwitches([]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      const data = await res.json();
      setActiveSessionId(sessionId);
      setActiveSession(data);
      setMessages(data.messages || []);
      setSwitches(data.switches || []);
    } catch (err) {
      console.error('Failed to load session:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create a new session
  const createSession = useCallback(async (title, provider, model) => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, provider, model })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.message);

      await loadSessions();
      await selectSession(data.id);
      return data;
    } catch (err) {
      console.error('Failed to create session:', err);
      throw err;
    }
  }, [loadSessions, selectSession]);

  // Delete a session
  const deleteSession = useCallback(async (sessionId) => {
    try {
      await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setActiveSession(null);
        setMessages([]);
        setSwitches([]);
      }
      await loadSessions();
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  }, [activeSessionId, loadSessions]);

  // Update session (title, model switch, etc.)
  const updateSession = useCallback(async (sessionId, updates) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();

      if (sessionId === activeSessionId) {
        setActiveSession(data);
      }
      await loadSessions();
      return data;
    } catch (err) {
      console.error('Failed to update session:', err);
    }
  }, [activeSessionId, loadSessions]);

  // Send a message
  const sendMessage = useCallback(async (messageText) => {
    const session = activeSessionRef.current;
    if (!session || !messageText.trim() || isSendingRef.current) return;

    setIsSending(true);

    const history = messagesRef.current.map(m => ({
      role: m.role,
      content: m.content
    }));

    const allProviders = getAllProviders();
    const currentProvider = allProviders.find(p => p.id === session.active_provider);
    const extraPayload = currentProvider && currentProvider.isCustom ? {
      customApiKey: currentProvider.apiKey,
      customBaseUrl: currentProvider.baseURL
    } : {};

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          message: messageText,
          provider: session.active_provider,
          model: session.active_model,
          history,
          ...extraPayload
        })
      });

      const data = await res.json();

      if (data.error) {
        const errorMsg = {
          id: 'error-' + Date.now(),
          role: 'assistant',
          content: `⚠️ Error: ${data.message}`,
          provider: session.active_provider,
          model: session.active_model,
          token_count: 0,
          created_at: new Date().toISOString(),
          isError: true
        };
        setMessages(prev => [...prev, errorMsg]);
        return;
      }

      setMessages(prev => [...prev, data.userMessage, data.assistantMessage]);

      setActiveSession(prev => prev ? {
        ...prev,
        total_tokens: data.totalSessionTokens
      } : prev);

      loadSessions();
    } catch (err) {
      const session = activeSessionRef.current;
      const errorMsg = {
        id: 'error-' + Date.now(),
        role: 'assistant',
        content: `⚠️ Network error: ${err.message}. Please check your connection and try again.`,
        provider: session?.active_provider || 'unknown',
        model: session?.active_model || 'unknown',
        token_count: 0,
        created_at: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  }, [loadSessions]);

  // Switch model
  const switchModel = useCallback(async (newProvider, newModel) => {
    const session = activeSessionRef.current;
    if (!session) return;

    try {
      const updated = await updateSession(session.id, {
        active_provider: newProvider,
        active_model: newModel,
        from_provider: session.active_provider,
        from_model: session.active_model,
        total_tokens: session.total_tokens
      });

      if (updated) {
        const switchEvent = {
          id: 'switch-' + Date.now(),
          from_provider: session.active_provider,
          from_model: session.active_model,
          to_provider: newProvider,
          to_model: newModel,
          tokens_at_switch: session.total_tokens,
          switched_at: new Date().toISOString()
        };
        setSwitches(prev => [...prev, switchEvent]);

        setActiveSession(updated);
      }
    } catch (err) {
      console.error('Failed to switch model:', err);
      throw err;
    }
  }, [updateSession]);

  // Load provider connection status
  const loadProviderStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/providers');
      const data = await res.json();
      setProviderStatus(prev => {
        const statusMap = { ...prev };
        if (Array.isArray(data)) {
          data.forEach(p => { statusMap[p.id] = p.connected; });
        }
        return statusMap;
      });
    } catch (err) {
      console.error('Failed to load provider status:', err);
    }
  }, []);

  // Save API key
  const saveApiKey = useCallback(async (provider, apiKey) => {
    try {
      const res = await fetch('/api/providers/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey })
      });
      const data = await res.json();
      if (data.success) {
        setProviderStatus(prev => ({ ...prev, [provider]: true }));
      }
      return data;
    } catch (err) {
      console.error('Failed to save API key:', err);
      throw err;
    }
  }, []);

  // Remove API key
  const removeApiKey = useCallback(async (provider) => {
    try {
      await fetch(`/api/providers/${provider}/key`, { method: 'DELETE' });
      setProviderStatus(prev => ({ ...prev, [provider]: false }));
    } catch (err) {
      console.error('Failed to remove API key:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadSessions();
    loadProviderStatus();
  }, [loadSessions, loadProviderStatus]);

  const value = {
    sessions,
    activeSession,
    activeSessionId,
    messages,
    switches,
    isLoading,
    isSending,
    theme,
    providerStatus,
    customProviders,
    toggleTheme,
    loadSessions,
    selectSession,
    createSession,
    deleteSession,
    updateSession,
    sendMessage,
    switchModel,
    loadProviderStatus,
    saveApiKey,
    removeApiKey,
    saveCustomProvider,
    removeCustomProvider
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionContext() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessionContext must be used within a SessionProvider');
  }
  return context;
}
