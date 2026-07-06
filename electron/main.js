'use strict';

const path = require('path');
const { app, BrowserWindow } = require('electron');
const { ConfigStore } = require('../src/configStore');
const { AgentCore } = require('../src/agentCore');
const { LogStore } = require('./logStore');
const { registrarIpcHandlers } = require('./ipcHandlers');
const { criarTray } = require('./tray');
const autoLaunchMod = require('./autoLaunch');

const iniciarEscondido = process.argv.includes('--hidden') || process.argv.includes('--autostart');

const ganhouLock = app.requestSingleInstanceLock();
if (!ganhouLock) {
  app.quit();
} else {
  let mainWindow = null;
  let tray = null;

  const configStore = new ConfigStore(app.getPath('userData'));
  const logStore = new LogStore(path.join(app.getPath('userData'), 'logs'));
  const agentCore = new AgentCore(configStore);

  agentCore.on('log', (linha) => {
    logStore.registrar(linha);
    enviarEvento({ tipo: 'log', ...linha });
  });
  agentCore.on('status', (status) => {
    enviarEvento({ tipo: 'status', ...status });
  });

  function enviarEvento(payload) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('agente:evento', payload);
    }
  }

  function mostrarJanela() {
    if (!mainWindow) {
      criarJanela();
      return;
    }
    mainWindow.show();
    mainWindow.focus();
  }

  function criarJanela() {
    mainWindow = new BrowserWindow({
      width: 900,
      height: 640,
      show: !iniciarEscondido,
      icon: path.join(__dirname, '..', 'build', 'icon.ico'),
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    mainWindow.setMenuBarVisibility(false);
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

    mainWindow.on('close', (evento) => {
      if (!app.isQuitting) {
        evento.preventDefault();
        mainWindow.hide();
      }
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }

  app.on('second-instance', () => {
    mostrarJanela();
  });

  app.whenReady().then(async () => {
    registrarIpcHandlers({ configStore, agentCore, logStore });

    await autoLaunchMod.garantirPadrao(configStore);

    agentCore.iniciarAgente();

    criarJanela();
    tray = criarTray({ agentCore, logStore, mostrarJanela });
  });

  app.on('window-all-closed', () => {
    // Fechar a janela nao encerra o processo - o agente continua na bandeja.
  });

  app.on('before-quit', () => {
    app.isQuitting = true;
  });

  app.on('quit', () => {
    agentCore.pararAgente();
  });
}
