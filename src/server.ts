import http from 'http';
import type Bot from './structures/Bot';

export function startServer(bot: Bot) {
  const port = Number(process.env.PORT) || 8080;

  const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        discord: bot.isReady() ? 'ready' : 'connecting'
      }));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(port, () => {
    console.log(`Servidor de estado escuchando en el puerto ${port}`);
  });

  return server;
}
