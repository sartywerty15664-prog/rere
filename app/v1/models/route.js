import { models } from '@/src/content.js';
import { apiKeyAuth } from '@/src/server/api.js';
import { apiError, json } from '@/src/server/responses.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const auth = await apiKeyAuth(request, 'models:read');
  if (auth.error) return apiError(...auth.error);
  return json({ object: 'list', data: models.map((model) => ({ id: model.id, object: 'model', created: 1794000000, owned_by: 'mindlarp' })) });
}
