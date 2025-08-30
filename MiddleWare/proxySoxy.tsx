// FIX: Changed the type reference to '@types/bun' to align with the likely project setup
// indicated by the TypeScript error message, which resolves the missing 'Bun' global.
/// <reference types="@types/bun" />

import { ServerWebSocket } from "bun";

// A simple Bun-based proxy server.
// It listens on port 10000.
// It can handle both HTTP requests and WebSocket connections.

const server = Bun.serve({
  port: 10000,
  fetch(req, server) {
    const url = new URL(req.url);

    // Upgrade to WebSocket if requested
    if (url.pathname === "/ws") {
      const success = server.upgrade(req);
      if (success) {
        return; // Bun handles the response for successful upgrades
      }
      return new Response("WebSocket upgrade failed", { status: 500 });
    }
    
    // Simple test endpoint
    if (url.pathname === "/api/example") {
        console.log(`[ProxySoxy] Received request for /api/example`);
        return new Response(JSON.stringify({
            message: "Hello from ProxySoxy!",
            timestamp: new Date().toISOString(),
        }), {
            headers: { "Content-Type": "application/json" },
        });
    }

    // Default response for other paths
    return new Response("ProxySoxy is running. Use /ws for WebSocket or known API endpoints.", { status: 200 });
  },
  websocket: {
    open(ws: ServerWebSocket) {
      console.log("WebSocket connection opened.");
      ws.subscribe("the-group-chat");
      ws.send("Welcome to the WebSocket chat!");
    },
    message(ws, message) {
      console.log(`Received message: ${message}`);
      // Echo the message back to all clients in the channel
      ws.publish("the-group-chat", `A client says: ${message}`);
    },
    close(ws) {
      console.log("WebSocket connection closed.");
      ws.unsubscribe("the-group-chat");
    },
  },
  error(error) {
    return new Response(`<pre>${error}\n${error.stack}</pre>`, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  },
});

console.log(`🦊 ProxySoxy server listening on http://localhost:${server.port}`);
