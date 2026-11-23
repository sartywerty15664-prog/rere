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
    inputPrice: 'TBA',
    outputPrice: 'TBA',
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

export const plans = [
{id:'pro',name:'Pro',price:19,tagline:'For everyday work',dailyLimit:500,features:['Both Larp 1 models','500 requests per day (planned)','1M context window','Chat + API access','Standard support'],linkEnv:'STRIPE_PAYMENT_LINK_PRO',priceEnv:'STRIPE_PRICE_ID_PRO',limitEnv:'INFERENCE_DAILY_REQUEST_LIMIT_PRO'},
{id:'plus',name:'Plus',price:79,tagline:'For heavier workloads',dailyLimit:2500,featured:true,features:['Everything in Pro','2,500 requests per day (planned)','Priority support','Early access to new models'],linkEnv:'STRIPE_PAYMENT_LINK_PLUS',priceEnv:'STRIPE_PRICE_ID_PLUS',limitEnv:'INFERENCE_DAILY_REQUEST_LIMIT_PLUS'},
{id:'studio',name:'Studio',price:199,tagline:'For products at scale',dailyLimit:10000,features:['Everything in Plus','10,000 requests per day (planned)','Highest daily throughput','Dedicated support'],linkEnv:'STRIPE_PAYMENT_LINK_STUDIO',priceEnv:'STRIPE_PRICE_ID_STUDIO',limitEnv:'INFERENCE_DAILY_REQUEST_LIMIT_STUDIO'}
];
