import { useState, useCallback } from 'react';
import { getProviderColor, getProvider } from '../utils/providers';

function renderMarkdown(content) {
  const lines = content.split('\n');
  const elements = [];
  let blockIdx = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    const codeMatch = line.match(/^```(\w*)/);
    if (codeMatch) {
      const lang = codeMatch[1];
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      const codeContent = codeLines.join('\n');
      const blockKey = `cb-${blockIdx++}`;
      elements.push(
        <CodeBlock key={blockKey} lang={lang} code={codeContent} />
      );
      continue;
    }

    if (line.trim() === '') {
      elements.push(<div key={`br-${blockIdx}-${i}`} style={{ height: '8px' }} />);
      i++;
      continue;
    }

    const tokens = [];
    let lastIdx = 0;

    let match;
    const regex = /\*\*(.+?)\*\*|`(.+?)`|\[(.+?)\]\((.+?)\)/g;
    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIdx) {
        tokens.push({ type: 'text', value: line.slice(lastIdx, match.index), start: lastIdx, end: match.index });
      }
      if (match[1]) {
        tokens.push({ type: 'bold', value: match[1], start: match.index, end: regex.lastIndex });
      } else if (match[2]) {
        tokens.push({ type: 'code', value: match[2], start: match.index, end: regex.lastIndex });
      } else if (match[3] && match[4]) {
        tokens.push({ type: 'link', text: match[3], href: match[4], start: match.index, end: regex.lastIndex });
      }
      lastIdx = regex.lastIndex;
    }
    if (lastIdx < line.length) {
      tokens.push({ type: 'text', value: line.slice(lastIdx) });
    }

    const lineElements = tokens.map((token, tidx) => {
      const tKey = `t-${tidx}`;
      switch (token.type) {
        case 'bold':
          return <strong key={tKey}>{token.value}</strong>;
        case 'code':
          return <code key={tKey} className="inline-code">{token.value}</code>;
        case 'link':
          return <a key={tKey} href={token.href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>{token.text}</a>;
        default:
          return <span key={tKey}>{token.value}</span>;
      }
    });

    elements.push(<div key={`p-${blockIdx}-${i}`} className="msg-line">{lineElements}</div>);
    i++;
  }

  return elements;
}

function CodeBlock({ lang, code }) {
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }).catch(() => {});
  }, [code]);

  return (
    <div className="code-block">
      <div className="code-lang-row">
        <span>{lang}</span>
        <button
          onClick={(e) => { e.stopPropagation(); handleCopyCode(); }}
          style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '10px' }}
        >
          {copiedCode ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div style={{ whiteSpace: 'pre' }}>{code}</div>
    </div>
  );
}

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const providerColor = getProviderColor(message.provider);
  const providerObj = getProvider(message.provider);
  const providerName = providerObj ? providerObj.name : message.provider;

  return (
    <div className={`msg ${isUser ? 'msg-user' : 'msg-assistant'}`}>
      <div className={isUser ? 'bubble-user' : 'bubble-assistant'}>
        {renderMarkdown(message.content)}
      </div>
      
      {isUser ? (
        <div className="msg-meta-user">
          You
        </div>
      ) : (
        <div className="msg-meta-assistant">
          <span 
            className="model-dot" 
            style={{ backgroundColor: providerColor || 'var(--text-tertiary)' }}
          />
          {providerName} · {message.model}
        </div>
      )}
    </div>
  );
}
