'use strict';

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = 'config.json';
const SETTINGS_FILE = 'settings.json';

const DEFAULT_SETTINGS = {
  retryIntervalMs: 10000,
  autoLaunchEnabled: true,
  autoLaunchDefaultApplied: false,
};

/**
 * Persiste balancas e configuracoes gerais em disco (userData no Electron,
 * ou qualquer diretorio informado no modo CLI/teste).
 */
class ConfigStore {
  constructor(diretorio) {
    this._dir = diretorio;
    this._configPath = path.join(diretorio, CONFIG_FILE);
    this._settingsPath = path.join(diretorio, SETTINGS_FILE);
  }

  _lerJson(caminho, valorPadrao) {
    if (!fs.existsSync(caminho)) return valorPadrao;
    try {
      const conteudo = fs.readFileSync(caminho, 'utf8');
      if (!conteudo.trim()) return valorPadrao;
      return JSON.parse(conteudo);
    } catch (err) {
      throw new Error(`Falha ao ler ${caminho}: ${err.message}`);
    }
  }

  _escreverJson(caminho, valor) {
    fs.mkdirSync(path.dirname(caminho), { recursive: true });
    const tmp = `${caminho}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(valor, null, 2), 'utf8');
    fs.renameSync(tmp, caminho);
  }

  listarBalancas() {
    const balancas = this._lerJson(this._configPath, []);
    return Array.isArray(balancas) ? balancas : [];
  }

  salvarBalancas(balancas) {
    if (!Array.isArray(balancas)) {
      throw new Error('Lista de balancas invalida.');
    }
    this._escreverJson(this._configPath, balancas);
    return balancas;
  }

  adicionarBalanca(balanca) {
    const balancas = this.listarBalancas();
    balancas.push(balanca);
    this.salvarBalancas(balancas);
    return balanca;
  }

  atualizarBalanca(portaComOriginal, balanca) {
    const balancas = this.listarBalancas();
    const idx = balancas.findIndex((b) => b.portaCom === portaComOriginal);
    if (idx === -1) {
      throw new Error(`Balanca na porta ${portaComOriginal} nao encontrada.`);
    }
    balancas[idx] = balanca;
    this.salvarBalancas(balancas);
    return balanca;
  }

  removerBalanca(portaCom) {
    const balancas = this.listarBalancas().filter((b) => b.portaCom !== portaCom);
    this.salvarBalancas(balancas);
    return balancas;
  }

  obterConfiguracoes() {
    const settings = this._lerJson(this._settingsPath, {});
    return { ...DEFAULT_SETTINGS, ...settings };
  }

  salvarConfiguracoes(parcial) {
    const atual = this.obterConfiguracoes();
    const novo = { ...atual, ...parcial };
    this._escreverJson(this._settingsPath, novo);
    return novo;
  }
}

module.exports = { ConfigStore, DEFAULT_SETTINGS };
