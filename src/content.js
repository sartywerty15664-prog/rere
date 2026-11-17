export const models = [
  {
    slug: 'sol-1-plus',
    id: 'MindLarp-Sol-1-Plus',
    name: 'MindLarp-Sol-1-Plus',
    shortName: 'Sol 1 Plus',
    index: '01',
    eyebrow: 'Balanced / versatile',
    description: 'A balanced generalist for nuanced writing, complex analysis, and dependable agents.',
    longDescription: 'Sol 1 Plus is the default choice for most applications. It combines strong reasoning and instruction following with the speed and efficiency needed for production.',
    context: '256K',
    inputPrice: '$1.00',
    outputPrice: '$4.00',
    latency: 'Balanced',
    capabilities: ['Advanced reasoning', 'Function calling', 'JSON mode', 'Streaming'],
    accent: 'violet',
  },
  {
    slug: 'sol-1-max',
    id: 'MindLarp-Sol-1-Max',
    name: 'MindLarp-Sol-1-Max',
    shortName: 'Sol 1 Max',
    index: '02',
    eyebrow: 'Deep / precise',
    description: 'Our most capable model for difficult reasoning, research, and ambitious ideas.',
    longDescription: 'Sol 1 Max takes on work with many moving parts. Choose it for difficult analysis, multi-step planning, technical research, and problems where quality matters most.',
    context: '512K',
    inputPrice: '$3.00',
    outputPrice: '$12.00',
    latency: 'Deliberate',
    capabilities: ['Deep reasoning', 'Long context', 'Function calling', 'Streaming'],
    accent: 'amber',
  },
];

export const docsNavigation = [
  { href: '/docs', label: 'Introduction' },
  { href: '/docs/getting-started', label: 'Quickstart' },
  { href: '/docs/models', label: 'Models' },
  { href: '/docs/authentication', label: 'Authentication' },
  { href: '/docs/api-reference', label: 'API reference' },
  { href: '/docs/errors', label: 'Errors & limits' },
];

export function getModel(slug) {
  return models.find((model) => model.slug === slug);
}
