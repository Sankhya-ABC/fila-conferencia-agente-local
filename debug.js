'use strict';
// Liga o log de dados brutos da porta serial e sobe o agente normalmente.
// Uso: node debug.js  (ou npm run start:debug)
process.env.AGENTE_DEBUG = '1';
require('./src/index.js');
