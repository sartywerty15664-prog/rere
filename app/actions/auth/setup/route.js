export async function POST() {
  return new Response('Owner setup is OAuth-only. Continue with Google, GitHub, or Discord.', {
    status: 410,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  });
}
