export function trustedStrip({ id = 'trusted-strip', heading = 'Built for independent builders' } = {}) {
  return `<section class="trusted-strip" aria-labelledby="${id}-title"><h2 id="${id}-title">${heading}</h2><p>Clear APIs, scoped credentials, and usage visibility — without borrowed customer claims.</p></section>`;
}
