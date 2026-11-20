export async function POST() {
  return new Response('Email and password authentication is disabled. Continue with Apple, Google, or GitHub.', {
    status: 410,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
