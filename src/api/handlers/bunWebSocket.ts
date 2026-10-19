/**
 * Shared WebSocket handler factory for Bun server entries.
 * Reduces duplication between entry.bun.ts and entry.bun.dev.ts.
 */

import {
  parseExecParams,
  extractTokenFromTicket,
  buildNomadExecUrl,
} from './execWebSocket';
import type { ExecParams } from '../../shared/types/exec';

interface BunWebSocketConfig {
  nomadAddr: string;
  ticketSecret: string;
}

interface WebSocketData {
  params: ExecParams;
  token: string;
  nomadAddr: string;
}

type BunWebSocket = WebSocket & { data?: WebSocketData };

interface NomadRelay {
  nomadWs: WebSocket;
  // Browser messages that arrive while the Nomad connection is still opening
  pending: Array<string | Uint8Array<ArrayBuffer>>;
}

interface BunServer {
  upgrade: (req: Request, options?: { data?: unknown }) => boolean;
}

// Tech debt: the shared tsconfig loads lib.dom, which hides Bun's WebSocket(url, { headers }) overload.
// Remove once server code gets its own tsconfig without DOM.
const BunWebSocketClient = WebSocket as unknown as new (
  url: string,
  options: Bun.WebSocketOptions
) => WebSocket;

export function createBunWebSocketHandlers(config: BunWebSocketConfig) {
  const { nomadAddr, ticketSecret } = config;
  const wsConnections = new Map<WebSocket, NomadRelay>();

  async function handleUpgrade(
    request: Request,
    server: BunServer,
    url: URL
  ): Promise<Response | undefined> {
    if (
      url.pathname !== '/api/ws/exec' ||
      request.headers.get('Upgrade')?.toLowerCase() !== 'websocket'
    ) {
      return undefined;
    }

    const params = parseExecParams(url.searchParams);
    if (!params) {
      return new Response('Missing required parameters: allocId, task', { status: 400 });
    }

    const token = await extractTokenFromTicket(request, url.searchParams, ticketSecret);
    if (!token) {
      return new Response('Authentication required or ticket expired', { status: 401 });
    }

    const success = server.upgrade(request, {
      data: { params, token, nomadAddr },
    });

    if (success) {
      return undefined;
    }
    return new Response('WebSocket upgrade failed', { status: 500 });
  }

  const websocket = {
    async open(ws: BunWebSocket) {
      const { params, token, nomadAddr: addr } = ws.data || {};
      if (!params || !token) {
        ws.close(1008, 'Missing parameters');
        return;
      }

      try {
        const nomadUrl = buildNomadExecUrl(addr!, params);
        const nomadWs = new BunWebSocketClient(nomadUrl, { headers: { 'X-Nomad-Token': token } });
        const relay: NomadRelay = { nomadWs, pending: [] };
        wsConnections.set(ws, relay);

        nomadWs.onopen = () => {
          for (const message of relay.pending.splice(0)) {
            nomadWs.send(message);
          }
        };

        nomadWs.onmessage = (event) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(event.data);
          }
        };

        nomadWs.onclose = (event) => {
          wsConnections.delete(ws);
          if (ws.readyState === WebSocket.OPEN) {
            ws.close(event.code || 1000, event.reason || 'Nomad connection closed');
          }
        };

        nomadWs.onerror = () => {
          wsConnections.delete(ws);
          ws.close(1011, 'Nomad connection error');
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Connection failed';
        ws.close(1011, message);
      }
    },

    message(ws: WebSocket, message: string | Buffer) {
      const relay = wsConnections.get(ws);
      if (!relay) return;

      const payload = typeof message === 'string' ? message : new Uint8Array(message);
      if (relay.nomadWs.readyState === WebSocket.CONNECTING) {
        relay.pending.push(payload);
      } else if (relay.nomadWs.readyState === WebSocket.OPEN) {
        relay.nomadWs.send(payload);
      }
    },

    close(ws: WebSocket) {
      const relay = wsConnections.get(ws);
      if (relay) {
        relay.nomadWs.close();
        wsConnections.delete(ws);
      }
    },
  };

  return { handleUpgrade, websocket };
}
