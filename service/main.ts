import http from 'node:http';
import { OmlxClient } from './omlx-client.ts';
import { SystemSampler } from './system.ts';

const port = Number(process.env.OPENCHAMBER_SERVICE_PORT);
const token = process.env.OPENCHAMBER_SERVICE_TOKEN ?? '';

if (!Number.isInteger(port) || port < 1 || port > 65_535 || token.length === 0) {
  console.error('OpenChamber service port and token are required.');
  process.exit(1);
}

const json = (response: http.ServerResponse, status: number, body: unknown): void => {
  response.statusCode = status;
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body));
};

const authorized = (request: http.IncomingMessage): boolean => (
  request.headers.authorization === `Bearer ${token}`
);

const client = new OmlxClient();
const system = new SystemSampler();
const server = http.createServer((request, response) => {
  void (async () => {
    try {
      if (!authorized(request)) {
        json(response, 401, { error: 'unauthorized' });
        return;
      }

      const url = new URL(request.url ?? '/', 'http://127.0.0.1');
      if (request.method === 'GET' && url.pathname === '/health') {
        json(response, 200, { status: 'healthy' });
        return;
      }
      if (request.method === 'GET' && url.pathname === '/snapshot') {
        json(response, 200, { ...await client.snapshot(), system: system.sample() });
        return;
      }
      json(response, 404, { error: 'not_found' });
    } catch (error) {
      console.error(`OMLX Scope service request failed: ${error instanceof Error ? error.message : String(error)}`);
      if (!response.headersSent) json(response, 503, { error: 'service_failed' });
    }
  })();
});

server.on('error', (error) => {
  console.error(`OMLX Scope service stopped: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});

let stopping = false;
const stop = (): void => {
  if (stopping) return;
  stopping = true;
  const forceExit = setTimeout(() => process.exit(1), 1_000);
  forceExit.unref();
  server.close(() => {
    clearTimeout(forceExit);
    process.exit(0);
  });
};
process.once('SIGTERM', stop);
process.once('SIGINT', stop);

server.listen(port, '127.0.0.1');
