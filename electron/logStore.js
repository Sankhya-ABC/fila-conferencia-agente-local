'use strict';

const fs = require('fs');
const path = require('path');

const MAX_LINHAS_MEMORIA = 500;

/**
 * Buffer circular de logs em memoria + espelho em arquivo rotativo simples
 * (um arquivo por dia) dentro de userData/logs.
 */
class LogStore {
  constructor(logDir) {
    this._dir = logDir;
    this._buffer = [];
    fs.mkdirSync(this._dir, { recursive: true });
  }

  _arquivoDoDia() {
    const hoje = new Date().toISOString().slice(0, 10);
    return path.join(this._dir, `agente-${hoje}.log`);
  }

  registrar({ nivel, mensagem, ts }) {
    const linha = { nivel, mensagem, ts: ts || new Date().toISOString() };
    this._buffer.push(linha);
    if (this._buffer.length > MAX_LINHAS_MEMORIA) {
      this._buffer.shift();
    }
    try {
      fs.appendFileSync(this._arquivoDoDia(), `[${linha.ts}] [${linha.nivel}] ${linha.mensagem}\n`, 'utf8');
    } catch {
      // Falha ao gravar em disco nao deve derrubar o agente.
    }
    return linha;
  }

  obterLinhas() {
    return [...this._buffer];
  }

  pastaDeLogs() {
    return this._dir;
  }
}

module.exports = { LogStore };
