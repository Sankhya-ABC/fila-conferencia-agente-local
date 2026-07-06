'use strict';

const { ipcMain, shell } = require('electron');
const { AgentCore } = require('../src/agentCore');
const autoLaunchMod = require('./autoLaunch');

const CAMPOS_OBRIGATORIOS = ['nome', 'portaCom', 'baudRate', 'dataBits', 'paridade', 'stopBits', 'protocoloSerial'];

function validarBalanca(balanca) {
  for (const campo of CAMPOS_OBRIGATORIOS) {
    if (balanca[campo] === undefined || balanca[campo] === null || balanca[campo] === '') {
      throw new Error(`Campo obrigatorio ausente: ${campo}`);
    }
  }
}

/**
 * Registra todos os handlers ipcMain.handle(...). Recebe as dependencias ja
 * construidas (configStore, agentCore, logStore) para ficar facilmente
 * testavel com mocks.
 */
function registrarIpcHandlers({ configStore, agentCore, logStore }) {
  ipcMain.handle('portas:listar', async () => {
    return AgentCore.listarPortasDisponiveis();
  });

  ipcMain.handle('balanca:listar', async () => {
    return configStore.listarBalancas();
  });

  ipcMain.handle('balanca:criar', async (_evt, balanca) => {
    validarBalanca(balanca);
    const balancas = configStore.listarBalancas();
    if (balancas.some((b) => b.portaCom === balanca.portaCom)) {
      throw new Error(`Ja existe uma balanca cadastrada na porta ${balanca.portaCom}.`);
    }
    configStore.adicionarBalanca(balanca);
    if (agentCore.status().rodando) {
      agentCore.reiniciarConexoes();
    }
    return configStore.listarBalancas();
  });

  ipcMain.handle('balanca:atualizar', async (_evt, portaComOriginal, balanca) => {
    validarBalanca(balanca);
    configStore.atualizarBalanca(portaComOriginal, balanca);
    if (agentCore.status().rodando) {
      agentCore.reiniciarConexoes();
    }
    return configStore.listarBalancas();
  });

  ipcMain.handle('balanca:remover', async (_evt, portaCom) => {
    const balancas = configStore.removerBalanca(portaCom);
    if (agentCore.status().rodando) {
      agentCore.reiniciarConexoes();
    }
    return balancas;
  });

  ipcMain.handle('balanca:testarConexao', async (_evt, balanca) => {
    validarBalanca(balanca);
    return agentCore.testarConexao(balanca);
  });

  ipcMain.handle('agente:iniciar', async () => {
    agentCore.iniciarAgente();
    return agentCore.status();
  });

  ipcMain.handle('agente:parar', async () => {
    agentCore.pararAgente();
    return agentCore.status();
  });

  ipcMain.handle('agente:status', async () => {
    return agentCore.status();
  });

  ipcMain.handle('agente:reiniciarConexoes', async () => {
    agentCore.reiniciarConexoes();
    return agentCore.status();
  });

  ipcMain.handle('logs:obter', async () => {
    return logStore.obterLinhas();
  });

  ipcMain.handle('logs:abrirPasta', async () => {
    await shell.openPath(logStore.pastaDeLogs());
    return true;
  });

  ipcMain.handle('config:autoLaunch:get', async () => {
    return autoLaunchMod.estaAtivo();
  });

  ipcMain.handle('config:autoLaunch:set', async (_evt, ativar) => {
    return autoLaunchMod.definir(!!ativar, configStore);
  });

  ipcMain.handle('config:geral:get', async () => {
    return configStore.obterConfiguracoes();
  });

  ipcMain.handle('config:geral:set', async (_evt, parcial) => {
    return configStore.salvarConfiguracoes(parcial);
  });
}

module.exports = { registrarIpcHandlers, validarBalanca };
