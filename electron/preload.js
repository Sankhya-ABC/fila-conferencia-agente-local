'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('agenteAPI', {
  listarPortas: () => ipcRenderer.invoke('portas:listar'),

  listarBalancas: () => ipcRenderer.invoke('balanca:listar'),
  criarBalanca: (balanca) => ipcRenderer.invoke('balanca:criar', balanca),
  atualizarBalanca: (portaComOriginal, balanca) => ipcRenderer.invoke('balanca:atualizar', portaComOriginal, balanca),
  removerBalanca: (portaCom) => ipcRenderer.invoke('balanca:remover', portaCom),
  testarConexao: (balanca) => ipcRenderer.invoke('balanca:testarConexao', balanca),

  iniciarAgente: () => ipcRenderer.invoke('agente:iniciar'),
  pararAgente: () => ipcRenderer.invoke('agente:parar'),
  status: () => ipcRenderer.invoke('agente:status'),
  reiniciarConexoes: () => ipcRenderer.invoke('agente:reiniciarConexoes'),

  obterLogs: () => ipcRenderer.invoke('logs:obter'),
  abrirPastaDeLogs: () => ipcRenderer.invoke('logs:abrirPasta'),

  obterAutoLaunch: () => ipcRenderer.invoke('config:autoLaunch:get'),
  definirAutoLaunch: (ativar) => ipcRenderer.invoke('config:autoLaunch:set', ativar),

  obterConfiguracoes: () => ipcRenderer.invoke('config:geral:get'),
  salvarConfiguracoes: (parcial) => ipcRenderer.invoke('config:geral:set', parcial),

  onEvento: (callback) => {
    const listener = (_evt, payload) => callback(payload);
    ipcRenderer.on('agente:evento', listener);
    return () => ipcRenderer.removeListener('agente:evento', listener);
  },
});
