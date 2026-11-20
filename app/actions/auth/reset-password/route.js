export async function POST() {
  return new Response('Password reset is disabled. Sign in with your connected OAuth provider.', {
    status: 410,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  });
}
