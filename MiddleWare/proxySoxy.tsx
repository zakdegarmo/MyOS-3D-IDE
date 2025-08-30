// FIX: Added a reference to bun-types to resolve the "Cannot find name 'Bun'" error.
/// <reference types="bun-types" />

// A simple Bun server that handles both HTTP and WebSocket requests.

const server = Bun.serve({
  port: 10000,
  fetch(req, server) {
    const url = new URL(req.url);

    // If the request is for a WebSocket, try to upgrade the connection.
    if (url.pathname === "/ws") {
      const success = server.upgrade(req);
      return success ? undefined : new Response("WebSocket upgrade failed", { status: 400 });
    }

    // New API endpoint for a simple POST request
    if (url.pathname === "/api/example" && req.method === "POST") {
      return new Response(JSON.stringify({ message: "API call to Bun proxy successful!" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle standard HTTP requests for other paths.
    return new Response("Hello from the Bun proxy server!");
  },

  websocket: {
    // This is the core WebSocket message handler.
    // It's called whenever a message is received from a client.
    message(ws, message) {
      console.log(`Received message: ${message}`);
      // Echo the message back to the client.
      ws.send(`You said: ${message}`);
    },

    // This is called when a new WebSocket connection is opened.
    open(ws) {
      console.log(`New WebSocket connection opened.`);
    },

    // This is called when a WebSocket connection is closed.
    close(ws, code, reason) {
      console.log(`WebSocket connection closed with code ${code}.`);
    },
  },
});

console.log(`Bun proxy server listening on http://localhost:${server.port}`);