// Edge Middleware — gates the whole site behind a password while it's not launched.
// Vercel runs this at the edge for every request, so nothing is served until the
// visitor enters the credentials below in the browser's native login prompt.
//
// To change the password: edit USER / PASSWORD here, commit, and push.

export const config = {
  // Protect everything except Vercel internals and the public stats API endpoint.
  matcher: '/((?!_vercel/|api/|favicon|apple-touch-icon).*)',
};

const USER = 'cooper';
const PASSWORD = 'hello12';   // <-- change this to whatever you want

export default function middleware(request) {
  const auth = request.headers.get('authorization');

  if (auth) {
    const [scheme, encoded] = auth.split(' ');
    if (scheme === 'Basic' && encoded) {
      let decoded = '';
      try { decoded = atob(encoded); } catch (e) { decoded = ''; }
      const idx = decoded.indexOf(':');
      const user = decoded.slice(0, idx);
      const pass = decoded.slice(idx + 1);
      if (user === USER && pass === PASSWORD) {
        return; // credentials match — serve the site as normal
      }
    }
  }

  return new Response('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Cooper Flagg"',
    },
  });
}
