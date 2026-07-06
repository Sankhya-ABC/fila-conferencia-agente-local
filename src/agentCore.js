'use strict';

const { EventEmitter } = require('events');
const { SerialManager } = require('./serialManager');
const { iniciarWsServer } = require('./wsServer');

/**
 * Orquestra o SerialManager + WS server a partir de uma ConfigStore, com
 * reconexao automatica configuravel. Nao depende de Electron (testavel
 * isoladamente); a camada Electron so consome os eventos/metodos publicos.
 *
 * Emite:
 *   'log'    { nivel, mensagem, ts }
 *   'status' { portas: [{ portaCom, nome, status, pesoAtual, mensagemErro }] }
 */
class AgentCore extends EventEmitter {
  constructor(configStore) {
    super();
    this._configStore = configStore;
    this._serialManager = null;
    this._retryTimer = null;
    this._wsHandle = null;
    this._statusPorPorta = new Map(); // portaCom -> { status, pesoAtual, mensagemErro }
    this._rodando = false;
  }

  _log(nivel, mensagem) {
    const linha = { nivel, mensagem, ts: new Date().toISOString() };
    this.emit('log', linha);
  }

  iniciarWsServerSeNecessario() {
    if (this._wsHandle) return;
    this._wsHandle = iniciarWsServer(this._serialAtivoOuVazio(), {
      log: (msg) => this._log('info', msg),
      error: (msg) => this._log('erro', msg),
    });
  }

  _serialAtivoOuVazio() {
    // wsServer precisa de um SerialManager com EventEmitter valido mesmo
    // antes da primeira conexao ser aplicada.
    if (!this._serialManager) {
      this._serialManager = new SerialManager([], console);
    }
    return this._serialManager;
  }

  iniciarAgente() {
    const balancas = this._configStore.listarBalancas();
    this._aplicarConfig(balancas);
    this.iniciarWsServerSeNecessario();
    this._rodando = true;
    this._agendarRetry();
    this._log('info', `Agente iniciado com ${balancas.length} balanca(s).`);
  }

  pararAgente() {
    this._rodando = false;
    this._cancelarRetry();
    if (this._serialManager) {
      this._serialManager.parar();
    }
    this._statusPorPorta.clear();
    this._emitirStatus();
    this._log('info', 'Agente parado (conexoes seriais encerradas).');
  }

  reiniciarConexoes() {
    const balancas = this._configStore.listarBalancas();
    if (this._serialManager) {
      this._serialManager.parar();
    }
    this._aplicarConfig(balancas);
    this._log('info', 'Conexoes reiniciadas.');
  }

  _aplicarConfig(balancas) {
    const logger = {
      log: (msg) => this._log('info', msg),
      error: (msg) => this._log('erro', msg),
    };

    const novoManager = new SerialManager(balancas, logger);
    this._statusPorPorta.clear();
    for (const b of balancas) {
      this._statusPorPorta.set(b.portaCom, {
        nome: b.nome,
        status: 'desconectado',
        pesoAtual: null,
        mensagemErro: null,
      });
    }

    novoManager.on('peso', ({ portaCom, valor }) => {
      const s = this._statusPorPorta.get(portaCom);
      if (s) {
        s.status = 'conectado';
        s.pesoAtual = valor;
        s.mensagemErro = null;
      }
      this._emitirStatus();
    });

    novoManager.on('erro', ({ portaCom, mensagem }) => {
      const s = this._statusPorPorta.get(portaCom);
      if (s) {
        s.status = 'erro';
        s.mensagemErro = mensagem;
      }
      this._emitirStatus();
      this._log('erro', `[${portaCom}] ${mensagem}`);
    });

    this._serialManager = novoManager;
    novoManager.iniciar();

    // Porta aberta com sucesso mas ainda sem leitura de peso -> marca "conectado".
    for (const b of balancas) {
      const s = this._statusPorPorta.get(b.portaCom);
      if (s && s.status === 'desconectado') {
        s.status = 'conectado';
      }
    }

    // Se o wsServer ja estava de pe, ele referencia o SerialManager antigo -
    // reencaminha os eventos do novo manager para manter o broadcast vivo.
    if (this._wsHandle && this._wsHandle.reatribuirSerialManager) {
      this._wsHandle.reatribuirSerialManager(novoManager);
    }

    this._emitirStatus();
  }

  _emitirStatus() {
    const portas = [];
    for (const [portaCom, info] of this._statusPorPorta) {
      portas.push({ portaCom, ...info });
    }
    this.emit('status', { portas });
  }

  status() {
    const portas = [];
    for (const [portaCom, info] of this._statusPorPorta) {
      portas.push({ portaCom, ...info });
    }
    return { rodando: this._rodando, portas };
  }

  serialManagerAtual() {
    return this._serialManager;
  }

  _agendarRetry() {
    this._cancelarRetry();
    const { retryIntervalMs } = this._configStore.obterConfiguracoes();
    this._retryTimer = setInterval(() => {
      if (!this._rodando) return;
      const algumaComErro = [...this._statusPorPorta.values()].some((s) => s.status !== 'conectado');
      if (algumaComErro) {
        this.reiniciarConexoes();
      }
    }, retryIntervalMs);
    if (this._retryTimer.unref) this._retryTimer.unref();
  }

  _cancelarRetry() {
    if (this._retryTimer) {
      clearInterval(this._retryTimer);
      this._retryTimer = null;
    }
  }

  async testarConexao(cfgBalanca) {
    return new Promise((resolve) => {
      const teste = new SerialManager([cfgBalanca], { log: () => {}, error: () => {} });
      let finalizado = false;
      const finalizar = (resultado) => {
        if (finalizado) return;
        finalizado = true;
        clearTimeout(timeout);
        teste.parar();
        resolve(resultado);
      };

      teste.on('peso', ({ valor }) => {
        finalizar({ ok: true, peso: valor });
      });
      teste.on('erro', ({ mensagem }) => {
        finalizar({ ok: false, mensagem });
      });

      const timeout = setTimeout(() => {
        finalizar({ ok: false, mensagem: 'Tempo esgotado aguardando resposta da balanca (verifique porta/baud rate/protocolo).' });
      }, cfgBalanca.timeout || 5000);

      teste.iniciar();
    });
  }

  static async listarPortasDisponiveis() {
    return SerialManager.listarPortasDisponiveis();
  }
}

module.exports = { AgentCore };
