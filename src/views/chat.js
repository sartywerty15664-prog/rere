import { models } from '../content.js';
import { escapeHtml, icon } from '../html.js';
import { consoleLayout } from './layout.jsx';

export function chatPage({ user, csrf, messages = [], selectedModel = 'MindLarp-Sol-1-Plus', upstreamConfigured = false }) {
  const safeMessages = messages.map((message) => {
    const role = message.role === 'user' ? 'user' : 'assistant';
    return `<article class="chat-message ${role}"><span class="chat-message-role">${role === 'user' ? 'YOU' : 'MINDLARP'}</span><div class="chat-message-content">${escapeHtml(message.content)}</div></article>`;
  }).join('');
  const welcome = `<div class="chat-welcome" id="chat-welcome"><span class="brand-mark"><span></span></span><span class="section-kicker">MINDLARP ASSISTANT</span><h2>What are you thinking about?</h2><p>Start with a question, a draft, or a difficult problem.</p><div class="chat-suggestions"><button type="button">Explain a complex idea in simple terms</button><button type="button">Help me improve a piece of writing</button><button type="button">Think through a difficult decision</button><button type="button">Brainstorm ten original ideas</button></div></div>`;
  const modelOptions = models.map((model) => `<option value="${escapeHtml(model.id)}" ${selectedModel === model.id ? 'selected' : ''}>${escapeHtml(model.name)}</option>`).join('');
  const connectionNotice = upstreamConfigured
    ? '<span class="chat-status-dot"></span> MODEL SERVICE CONNECTED'
    : '<span class="chat-status-dot offline"></span> AI SERVICE NOT CONFIGURED — messages cannot be sent yet';
  const content = `
    <section class="chat-shell" aria-label="MindLarp conversation">
      <header class="chat-header">
        <div class="chat-heading">
          <span class="section-kicker">WORKSPACE / CHAT</span>
          <h1>MindLarp Chat</h1>
          <span class="chat-connection">${connectionNotice}</span>
        </div>
        <label class="chat-model"><span>MODEL</span><select name="model" form="chat-form" id="chat-model">${modelOptions}</select></label>
      </header>
      <div class="chat-messages" id="chat-messages" aria-live="polite" aria-relevant="additions text">${safeMessages || welcome}</div>
      ${upstreamConfigured ? '' : '<div class="chat-setup-notice" role="status"><strong>The AI engine is not connected.</strong><span>The chat interface is online, but an administrator must configure the MINDLARP_UPSTREAM_URL environment variable in Vercel before the assistant can reply.</span></div>'}
      <div class="chat-composer">
        <form id="chat-form">
          <input type="hidden" name="csrf" value="${escapeHtml(csrf)}">
          <textarea name="message" id="chat-input" rows="1" maxlength="16000" ${upstreamConfigured ? 'required' : 'disabled'} placeholder="${upstreamConfigured ? 'Message MindLarp…' : 'AI service is not connected'}" aria-label="Message"></textarea>
          <button class="button button-primary" type="submit" ${upstreamConfigured ? '' : 'disabled'}>${upstreamConfigured ? `Send ${icon('arrow')}` : 'Unavailable'}</button>
        </form>
        <p>Enter to send · Shift + Enter for a new line · MindLarp can make mistakes; verify important information.</p>
      </div>
    </section>`;
  return consoleLayout({ title: 'Chat', path: '/chat', content, user, csrf });
}
