'use strict';

const path = require('path');
const { Service } = require('node-windows');

const svc = new Service({
  name: 'FilaConferenciaAgenteBalancas',
  script: path.join(__dirname, 'src', 'index.js'),
});

svc.on('uninstall', () => {
  console.log('Servico removido.');
});

svc.on('error', (err) => {
  console.error('Erro ao remover servico:', err);
});

console.log('Removendo servico Windows (execute como Administrador)...');
svc.uninstall();
