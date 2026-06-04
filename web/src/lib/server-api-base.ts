/**
 * Base URL for server-side fetches to this app's Route Handlers.
 * On Vercel, relative fetch is unreliable during RSC render — use the deployment host.
 */
export function getServerApiBase(): string {
  const explicit = process.env['API_URL'];
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }
  const vercelHost = process.env['VERCEL_URL'];
  if (vercelHost) {
    return `https://${vercelHost}`;
  }
  return 'http://localhost:3000';
}
