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
  const wss = new WebSocketServer({ port: PORT, host: '127.0.0.1' });

  // socket -> Set<portaCom> (portas as quais este cliente esta inscrito)
  const inscricoes = new Map();

  wss.on('connection', (ws) => {
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
  });

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

  logger.log(`Agente local de balancas - WS server ouvindo em ws://127.0.0.1:${PORT}`);
  return wss;
}

module.exports = { iniciarWsServer, PORT };
