export async function POST() {
  return new Response('Password sign-in is disabled. Use Google or GitHub.', {
    status: 410,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
