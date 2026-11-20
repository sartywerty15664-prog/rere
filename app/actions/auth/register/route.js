export async function POST() {
  return new Response('Email and password registration is disabled. Use Google or GitHub OAuth.', {
    status: 410,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  });
}
