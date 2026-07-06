'use strict';

const path = require('path');
const { Tray, Menu, app, shell } = require('electron');

function textoStatus(status) {
  const total = status.portas.length;
  const conectadas = status.portas.filter((p) => p.status === 'conectado').length;
  if (total === 0) return 'Nenhuma balanca cadastrada';
  return `${conectadas}/${total} balanca(s) conectada(s)`;
}

function criarTray({ agentCore, logStore, mostrarJanela }) {
  const iconPath = path.join(__dirname, '..', 'build', 'icon.ico');
  const tray = new Tray(iconPath);
  tray.setToolTip('Agente Balanca - Fila de Conferencia');

  const atualizarMenu = () => {
    const status = agentCore.status();
    const menu = Menu.buildFromTemplate([
      { label: textoStatus(status), enabled: false },
      { type: 'separator' },
      { label: 'Abrir configuracao', click: () => mostrarJanela() },
      {
        label: 'Reiniciar conexoes',
        click: () => agentCore.reiniciarConexoes(),
      },
      {
        label: 'Ver logs',
        click: () => shell.openPath(logStore.pastaDeLogs()),
      },
      { type: 'separator' },
      {
        label: 'Sair',
        click: () => {
          app.isQuitting = true;
          agentCore.pararAgente();
          app.quit();
        },
      },
    ]);
    tray.setContextMenu(menu);
  };

  atualizarMenu();
  agentCore.on('status', atualizarMenu);

  tray.on('click', () => mostrarJanela());

  return tray;
}

module.exports = { criarTray };
