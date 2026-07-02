'use strict';

const { WebSocketServer } = require('ws');
const { SerialManager } = require('./serialManager');

const PORT = 3099;

/**
 * Protocolo (JSON, uma mensagem por frame):
 *   cliente -> agente  { tipo: 'subscribe', portaCom: 'COM8' }
 *   cliente -> agente  { tipo: 'listar-portas' }
 *   agente  -> cliente { tipo: 'peso', portaCom, valor, estavel }
 *   agente  -> cliente { tipo: 'erro', portaCom, mensagem }
 *   agente  -> cliente { tipo: 'portas', valores: [...] }
 */
function iniciarWsServer(serialManager, logger = console) {
  // "localhost" no navegador pode resolver para 127.0.0.1 (IPv4) OU ::1 (IPv6)
  // dependendo do navegador/SO (Firefox no Windows costuma preferir IPv6).
  // Escuta nos dois loopbacks para o navegador conseguir conectar de qualquer jeito.
  const inscricoes = new Map(); // ws -> Set<portaCom>

  const handleConnection = (ws) => {
    inscricoes.set(ws, new Set());

    ws.on('message', async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (msg.tipo === 'subscribe' && msg.portaCom) {
        inscricoes.get(ws).add(msg.portaCom);
        const pesoAtual = serialManager.pesoAtual(msg.portaCom);
        if (pesoAtual !== null) {
          ws.send(JSON.stringify({ tipo: 'peso', portaCom: msg.portaCom, valor: pesoAtual, estavel: true }));
        } else if (!serialManager.portasConfiguradas().includes(msg.portaCom)) {
          ws.send(JSON.stringify({ tipo: 'erro', portaCom: msg.portaCom, mensagem: `Porta ${msg.portaCom} nao configurada no agente local.` }));
        }
        return;
      }

      if (msg.tipo === 'unsubscribe' && msg.portaCom) {
        inscricoes.get(ws)?.delete(msg.portaCom);
        return;
      }

      if (msg.tipo === 'listar-portas') {
        try {
          const valores = await SerialManager.listarPortasDisponiveis();
          ws.send(JSON.stringify({ tipo: 'portas', valores }));
        } catch (err) {
          ws.send(JSON.stringify({ tipo: 'erro', mensagem: `Falha ao listar portas: ${err.message}` }));
        }
      }
    });

    ws.on('close', () => inscricoes.delete(ws));
  };

  const broadcast = (portaCom, payload) => {
    for (const [ws, portas] of inscricoes) {
      if (portas.has(portaCom) && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(payload));
      }
    }
  };

  serialManager.on('peso', ({ portaCom, valor, estavel }) => {
    broadcast(portaCom, { tipo: 'peso', portaCom, valor, estavel });
  });

  serialManager.on('erro', ({ portaCom, mensagem }) => {
    broadcast(portaCom, { tipo: 'erro', portaCom, mensagem });
  });

  const wssV4 = new WebSocketServer({ port: PORT, host: '127.0.0.1' });
  wssV4.on('connection', handleConnection);
  wssV4.on('error', (err) => logger.error(`WS (IPv4) erro: ${err.message}`));

  let wssV6 = null;
  try {
    wssV6 = new WebSocketServer({ port: PORT, host: '::1' });
    wssV6.on('connection', handleConnection);
    wssV6.on('error', (err) => logger.error(`WS (IPv6) erro: ${err.message}`));
  } catch (err) {
    logger.log(`IPv6 (::1) indisponivel nessa maquina, seguindo so com IPv4: ${err.message}`);
  }

  logger.log(`Agente local de balancas - WS server ouvindo em ws://127.0.0.1:${PORT} e ws://[::1]:${PORT}`);
  return { wssV4, wssV6 };
}

module.exports = { iniciarWsServer, PORT };
