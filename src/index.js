'use strict';

const fs = require('fs');
const path = require('path');
const { SerialManager } = require('./serialManager');
const { iniciarWsServer } = require('./wsServer');

function carregarConfig() {
  const configPath = path.join(__dirname, '..', 'config.json');
  if (!fs.existsSync(configPath)) {
    console.error(`Arquivo config.json nao encontrado em ${configPath}. Copie config.example.json para config.json e ajuste as portas.`);
    process.exit(1);
  }
  const balancas = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (!Array.isArray(balancas) || balancas.length === 0) {
    console.error('config.json esta vazio. Cadastre ao menos uma balanca.');
    process.exit(1);
  }
  return balancas;
}

function main() {
  const balancas = carregarConfig();
  console.log(`Carregadas ${balancas.length} balanca(s): ${balancas.map((b) => `${b.nome} (${b.portaCom})`).join(', ')}`);

  const serialManager = new SerialManager(balancas);
  serialManager.iniciar();

  iniciarWsServer(serialManager);

  process.on('SIGINT', () => {
    serialManager.parar();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    serialManager.parar();
    process.exit(0);
  });
}

main();
