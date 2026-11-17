export const trustedCompanySets = [
  [
    { id: 'salesforce', name: 'Salesforce', text: 'salesforce', width: 140, fontSize: 28, weight: 600 },
    { id: 'intel', name: 'Intel', text: 'intel', width: 90, fontSize: 34, weight: 700 },
    { id: 'cisco', name: 'Cisco', text: 'CISCO', width: 110, fontSize: 20, weight: 700 },
    { id: 'redhat', name: 'Red Hat', text: 'Red Hat', width: 130, fontSize: 20, weight: 600 },
    { id: 'revolut', name: 'Revolut', text: 'Revolut', width: 130, fontSize: 29, weight: 500 },
  ],
  [
    { id: 'github', name: 'GitHub', text: 'GitHub', width: 130, fontSize: 27, weight: 600 },
    { id: 'gitlab', name: 'GitLab', text: 'GitLab', width: 125, fontSize: 28, weight: 600 },
    { id: 'docker', name: 'Docker', text: 'Docker', width: 130, fontSize: 28, weight: 600 },
    { id: 'kubernetes', name: 'Kubernetes', text: 'Kubernetes', width: 150, fontSize: 24, weight: 500 },
    { id: 'notion', name: 'Notion', text: 'Notion', width: 125, fontSize: 28, weight: 600 },
  ],
  [
    { id: 'vercel', name: 'Vercel', text: 'Vercel', width: 125, fontSize: 28, weight: 600 },
    { id: 'cloudflare', name: 'Cloudflare', text: 'Cloudflare', width: 150, fontSize: 24, weight: 600 },
    { id: 'supabase', name: 'Supabase', text: 'Supabase', width: 145, fontSize: 25, weight: 600 },
    { id: 'stripe', name: 'Stripe', text: 'Stripe', width: 110, fontSize: 31, weight: 600 },
    { id: 'linear', name: 'Linear', text: 'Linear', width: 120, fontSize: 28, weight: 500 },
  ],
];

function logo(company) {
  let artwork;
  if (company.id === 'cisco') {
    const bars = [10, 16, 22, 28, 22, 28, 22, 16, 10];
    artwork = `${bars.map((height, index) => `<rect x="${31 + index * 6}" y="${17 - height}" width="2.5" height="${height}" rx="1" fill="currentColor"/>`).join('')}<text x="55" y="37" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${company.fontSize}" font-weight="${company.weight}" letter-spacing="1" fill="currentColor">${company.text}</text>`;
  } else if (company.id === 'redhat') {
    artwork = `<path d="M3 19c2-2 5-3 8-4l1-5c2-1 7-2 10-1l3 5c4 1 6 2 6 4 0 3-5 5-10 5-4 0-7-1-9-3l-9 2Z" fill="currentColor"/><path d="M11 10c3-3 9-4 12-1l2 5-14-1Z" fill="currentColor"/><text x="39" y="26" font-family="Arial, Helvetica, sans-serif" font-size="${company.fontSize}" font-weight="${company.weight}" fill="currentColor">${company.text}</text>`;
  } else {
    artwork = `<text x="50%" y="28" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${company.fontSize}" font-weight="${company.weight}" fill="currentColor">${company.text}</text>`;
  }
  return `<li class="trusted-strip-logo"><svg class="trusted-logo trusted-logo-${company.id}" viewBox="0 0 ${company.width} 40" role="img" aria-label="${company.name}" focusable="false">${artwork}</svg></li>`;
}

export function trustedStrip({ id = 'trusted-strip', heading = 'Trusted by 22M+ developers' } = {}) {
  const sets = trustedCompanySets.map((companies, index) => `<div class="trusted-strip-set" data-trusted-set data-set-index="${index}" ${index === 0 ? '' : 'hidden'}>${companies.map(logo).join('')}</div>`).join('');
  return `<section class="trusted-strip" aria-labelledby="${id}-title" data-trusted-strip><h2 id="${id}-title">${heading}</h2><div class="trusted-strip-viewport" aria-label="Trusted companies" aria-live="off">${sets}</div></section>`;
}
