export const models = [
  {
    slug: 'larp-1',
    id: 'MindLarp-Larp-1',
    name: 'MindLarp-Larp-1',
    shortName: 'Larp 1',
    index: '01',
    eyebrow: 'Balanced / versatile',
    status: 'Coming soon',
    description: 'A balanced generalist for nuanced writing, complex analysis, and dependable agents.',
    longDescription: 'Larp 1 is the default choice for most applications. It combines strong reasoning and instruction following with the speed and efficiency needed for production.',
    context: '256K',
    inputPrice: '$0.00',
    outputPrice: '$0.00',
    latency: 'Balanced',
    capabilities: ['Advanced reasoning', 'Function calling', 'JSON mode', 'Streaming'],
  },
  {
    slug: 'larp-1-code',
    id: 'MindLarp-Larp-1-Code',
    name: 'MindLarp-Larp-1-Code',
    shortName: 'Larp 1 Code',
    index: '02',
    eyebrow: 'Code / precise',
    status: 'Coming soon',
    description: 'Our most capable model for writing code, difficult reasoning, and ambitious engineering.',
    longDescription: 'Larp 1 Code takes on work with many moving parts. Choose it for writing and reviewing code, difficult analysis, multi-step planning, and technical research.',
    context: '512K',
    inputPrice: '$0.00',
    outputPrice: '$0.00',
    latency: 'Deliberate',
    capabilities: ['Deep reasoning', 'Long context', 'Function calling', 'Streaming'],
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
