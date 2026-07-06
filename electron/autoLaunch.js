'use strict';

const AutoLaunch = require('auto-launch');

const autoLaunch = new AutoLaunch({
  name: 'Agente Balanca Fila de Conferencia',
  isHidden: true,
});

async function garantirPadrao(configStore) {
  const settings = configStore.obterConfiguracoes();
  if (settings.autoLaunchDefaultApplied) return;

  if (settings.autoLaunchEnabled) {
    try {
      await autoLaunch.enable();
    } catch {
      // Ambiente sem suporte (ex: dev fora de app empacotado) - ignora.
    }
  }
  configStore.salvarConfiguracoes({ autoLaunchDefaultApplied: true });
}

async function estaAtivo() {
  try {
    return await autoLaunch.isEnabled();
  } catch {
    return false;
  }
}

async function definir(ativar, configStore) {
  try {
    if (ativar) {
      await autoLaunch.enable();
    } else {
      await autoLaunch.disable();
    }
  } catch {
    // Ignora falhas de ambiente (ex: rodando via `electron .` sem instalar).
  }
  configStore.salvarConfiguracoes({ autoLaunchEnabled: ativar });
  return ativar;
}

module.exports = { autoLaunch, garantirPadrao, estaAtivo, definir };
