'use strict';

const { EventEmitter } = require('events');
const { SerialPort } = require('serialport');
const { parseLinha } = require('./toledoParser');

/**
 * Abre e gerencia N portas seriais simultaneamente (uma por balanca do config.json).
 * Emite:
 *   'peso' { portaCom, valor, estavel }
 *   'erro' { portaCom, mensagem }
 */
class SerialManager extends EventEmitter {
  constructor(balancas, logger = console) {
    super();
    this._balancas = balancas;
    this._log = logger;
    this._conexoes = new Map(); // portaCom -> { port, buffer, pesoAtual }
  }

  iniciar() {
    for (const cfg of this._balancas) {
      this._abrirPorta(cfg);
    }
  }

  parar() {
    for (const [, conexao] of this._conexoes) {
      try { conexao.port.close(); } catch { /* ignore */ }
    }
    this._conexoes.clear();
  }

  pesoAtual(portaCom) {
    return this._conexoes.get(portaCom)?.pesoAtual ?? null;
  }

  portasConfiguradas() {
    return this._balancas.map((b) => b.portaCom);
  }

  _abrirPorta(cfg) {
    const { portaCom, baudRate, dataBits, paridade, stopBits, protocoloSerial } = cfg;

    let port;
    try {
      port = new SerialPort({
        path: portaCom,
        baudRate,
        dataBits,
        parity: (paridade || 'NONE').toLowerCase(),
        stopBits,
        autoOpen: true,
      });
    } catch (err) {
      this._log.error(`[${portaCom}] Falha ao abrir: ${err.message}`);
      this.emit('erro', { portaCom, mensagem: err.message });
      return;
    }

    const conexao = { port, buffer: '', pesoAtual: null };
    this._conexoes.set(portaCom, conexao);

    port.on('open', () => {
      this._log.log(`[${portaCom}] Porta aberta (${baudRate} bps, ${protocoloSerial}).`);
      if (protocoloSerial === 'SOB_REQUISICAO') {
        port.write('SI\r\n');
      }
    });

    port.on('data', (data) => {
      conexao.buffer += data.toString();
      const linhas = conexao.buffer.split(/\r?\n/);
      conexao.buffer = linhas.pop() ?? '';
      for (const linha of linhas) {
        const peso = parseLinha(linha);
        if (peso !== null && peso >= 0) {
          conexao.pesoAtual = peso;
          this.emit('peso', { portaCom, valor: peso, estavel: true });
        }
      }
      if (protocoloSerial === 'SOB_REQUISICAO') {
        setTimeout(() => {
          if (this._conexoes.has(portaCom)) port.write('SI\r\n');
        }, 300);
      }
    });

    port.on('error', (err) => {
      this._log.error(`[${portaCom}] Erro: ${err.message}`);
      this.emit('erro', { portaCom, mensagem: err.message });
    });

    port.on('close', () => {
      this._log.log(`[${portaCom}] Porta fechada.`);
    });
  }

  static async listarPortasDisponiveis() {
    const portas = await SerialPort.list();
    return portas.map((p) => p.path);
  }
}

module.exports = { SerialManager };
