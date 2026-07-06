'use strict';

const { app } = require('electron');
const AutoLaunch = require('auto-launch');

const autoLaunch = new AutoLaunch({
  name: 'Agente Balanca Fila de Conferencia',
  isHidden: true,
});

// auto-launch grava no registro do Windows usando o basename de process.execPath
// (ignora `name` quando o path tem barras). Rodando via `electron .` em dev,
// execPath aponta para node_modules/electron/dist/electron.exe, o que cria uma
// entrada "electron" no Run que abre o binario cru (sem app) a cada boot.
// Por isso so mexemos no registro quando o app esta empacotado/instalado.

async function garantirPadrao(configStore) {
  const settings = configStore.obterConfiguracoes();
  if (settings.autoLaunchDefaultApplied) return;

  if (app.isPackaged && settings.autoLaunchEnabled) {
    try {
      await autoLaunch.enable();
    } catch {
      // Ambiente sem suporte - ignora.
    }
  }
  configStore.salvarConfiguracoes({ autoLaunchDefaultApplied: true });
}

async function estaAtivo() {
  if (!app.isPackaged) return false;
  try {
    return await autoLaunch.isEnabled();
  } catch {
    return false;
  }
}

async function definir(ativar, configStore) {
  if (app.isPackaged) {
    try {
      if (ativar) {
        await autoLaunch.enable();
      } else {
        await autoLaunch.disable();
      }
    } catch {
      // Ignora falhas de ambiente.
    }
  }
  configStore.salvarConfiguracoes({ autoLaunchEnabled: ativar });
  return ativar;
}

module.exports = { autoLaunch, garantirPadrao, estaAtivo, definir };
