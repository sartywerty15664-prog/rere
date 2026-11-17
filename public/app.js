export function initializePage() {
  const controller = new AbortController();
  const { signal } = controller;
  const timers = new Set();
  const on = (element, event, handler) => element?.addEventListener(event, handler, { signal });
  const navToggle = document.querySelector('.nav-toggle');
  on(navToggle, 'click', () => {
    const open = document.body.classList.toggle('nav-open');
    navToggle.setAttribute('aria-expanded', String(open));
  });

  document.querySelectorAll('[data-open-dialog]').forEach((button) => on(button, 'click', () => {
    const dialog = document.getElementById(button.dataset.openDialog);
    if (dialog instanceof HTMLDialogElement) dialog.showModal();
  }));
  document.querySelectorAll('dialog[data-open-on-load]').forEach((dialog) => dialog.showModal());
  document.querySelectorAll('[data-close-dialog]').forEach((button) => on(button, 'click', () => button.closest('dialog')?.close()));
  document.querySelectorAll('dialog').forEach((dialog) => on(dialog, 'click', (event) => {
    if (event.target !== dialog || dialog.id === 'created-key-dialog') return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  }));
  document.querySelectorAll('form[data-confirm]').forEach((form) => on(form, 'submit', (event) => {
    if (!window.confirm(form.dataset.confirm)) event.preventDefault();
  }));

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }

  document.querySelectorAll('.js-copy').forEach((button) => on(button, 'click', async () => {
    const target = button.dataset.copyTarget ? document.getElementById(button.dataset.copyTarget) : null;
    const text = button.dataset.copyText ?? target?.textContent ?? '';
    try {
      await copyText(text.trim());
      const original = button.innerHTML;
      button.innerHTML = '<span class="copy-success">Copied</span>';
      button.setAttribute('aria-label', 'Copied');
      const timer = setTimeout(() => {
        button.innerHTML = original;
        timers.delete(timer);
      }, 1600);
      timers.add(timer);
    } catch {
      button.textContent = 'Copy failed';
    }
  }));

  const chatForm = document.getElementById('chat-form');
  if (chatForm) {
    const input = document.getElementById('chat-input');
    const messages = document.getElementById('chat-messages');
    const submit = chatForm.querySelector('button[type="submit"]');

    function appendChatMessage(role, content) {
      document.getElementById('chat-welcome')?.remove();
      const row = document.createElement('div');
      row.className = `chat-message ${role}`;
      const label = document.createElement('span');
      label.className = 'chat-message-role';
      label.textContent = role === 'user' ? 'YOU' : 'MINDLARP';
      const body = document.createElement('div');
      body.className = 'chat-message-content';
      body.textContent = content;
      row.append(label, body);
      messages.append(row);
      messages.scrollTop = messages.scrollHeight;
      return row;
    }

    on(chatForm, 'submit', async (event) => {
      event.preventDefault();
      const content = input.value.trim();
      if (!content) return;
      appendChatMessage('user', content);
      input.value = '';
      input.style.height = 'auto';
      submit.disabled = true;
      const thinking = appendChatMessage('assistant', '…');
      thinking.classList.add('chat-thinking-row');
      try {
        const response = await fetch('/chat/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csrf: chatForm.elements.csrf.value, model: chatForm.elements.model.value, message: content }), signal });
        const data = await response.json();
        thinking.remove();
        appendChatMessage('assistant', response.ok ? data.message : data.error?.message || 'The request could not be completed.');
      } catch (error) {
        if (error.name === 'AbortError') return;
        thinking.remove();
        appendChatMessage('assistant', 'The connection was interrupted. Check the server and try again.');
      } finally {
        submit.disabled = false;
        input.focus();
      }
    });
    on(input, 'keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        chatForm.requestSubmit();
      }
    });
    on(input, 'input', () => {
      input.style.height = 'auto';
      input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
    });
    document.querySelectorAll('.chat-suggestions button').forEach((button) => on(button, 'click', () => {
      input.value = button.textContent;
      chatForm.requestSubmit();
    }));
    messages.scrollTop = messages.scrollHeight;
  }

  return () => {
    controller.abort();
    timers.forEach(clearTimeout);
  };
}
