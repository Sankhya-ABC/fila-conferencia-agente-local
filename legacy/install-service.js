'use strict';

// DEPRECATED: substituido pelo agente desktop (Electron) com tray/auto-start.
// Mantido apenas para migracao de estacoes que ainda rodam o modelo antigo de
// Windows Service - veja o README para o passo a passo de migracao.

const path = require('path');
const { Service } = require('node-windows');

const svc = new Service({
  name: 'FilaConferenciaAgenteBalancas',
  description: 'Agente local que le balancas seriais (COM) e expoe os dados via WebSocket para o Fila de Conferencia.',
  script: path.join(__dirname, '..', 'src', 'index.js'),
});

svc.on('install', () => {
  console.log('Servico instalado. Iniciando...');
  svc.start();
});

svc.on('alreadyinstalled', () => {
  console.log('Servico ja instalado.');
});

svc.on('start', () => {
  console.log('Servico FilaConferenciaAgenteBalancas iniciado.');
});

svc.on('error', (err) => {
  console.error('Erro ao instalar/iniciar servico:', err);
});

console.log('Instalando servico Windows (execute como Administrador)...');
svc.install();
