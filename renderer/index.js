'use strict';

const state = {
  balancas: [],
  statusPorPorta: new Map(),
  agenteRodando: false,
};

const el = (id) => document.getElementById(id);

function trocarAba(nome) {
  document.querySelectorAll('.aba-btn').forEach((b) => b.classList.toggle('ativo', b.dataset.aba === nome));
  document.querySelectorAll('.aba-conteudo').forEach((s) => s.classList.toggle('ativo', s.id === `aba-${nome}`));
}

document.querySelectorAll('.aba-btn').forEach((btn) => {
  btn.addEventListener('click', () => trocarAba(btn.dataset.aba));
});

function statusLabel(status) {
  switch (status) {
    case 'conectado': return 'Conectado';
    case 'erro': return 'Erro de comunicação';
    default: return 'Desconectado';
  }
}

function renderizarTabela() {
  const corpo = el('corpoTabelaBalancas');
  corpo.innerHTML = '';
  el('msgListaVazia').hidden = state.balancas.length > 0;

  for (const b of state.balancas) {
    const info = state.statusPorPorta.get(b.portaCom) || { status: 'desconectado', pesoAtual: null };
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.nome}</td>
      <td>${b.portaCom}</td>
      <td>${b.protocoloSerial}</td>
      <td><span class="status-dot status-${info.status}"></span>${statusLabel(info.status)}${info.mensagemErro ? ` (${info.mensagemErro})` : ''}</td>
      <td>${info.pesoAtual != null ? info.pesoAtual.toFixed(3) + ' kg' : '-'}</td>
      <td>
        <button class="acao-icone" data-acao="editar" data-porta="${b.portaCom}">Editar</button>
        <button class="acao-icone remover" data-acao="remover" data-porta="${b.portaCom}">Remover</button>
      </td>
    `;
    corpo.appendChild(tr);
  }
}

corpoTabelaEventos();
function corpoTabelaEventos() {
  el('corpoTabelaBalancas').addEventListener('click', async (evt) => {
    const btn = evt.target.closest('button[data-acao]');
    if (!btn) return;
    const porta = btn.dataset.porta;
    if (btn.dataset.acao === 'editar') {
      abrirFormulario(state.balancas.find((b) => b.portaCom === porta));
    } else if (btn.dataset.acao === 'remover') {
      if (confirm(`Remover a balança na porta ${porta}?`)) {
        state.balancas = await window.agenteAPI.removerBalanca(porta);
        renderizarTabela();
      }
    }
  });
}

async function carregarBalancas() {
  state.balancas = await window.agenteAPI.listarBalancas();
  renderizarTabela();
}

async function carregarStatus() {
  const status = await window.agenteAPI.status();
  aplicarStatus(status);
}

function aplicarStatus(status) {
  state.agenteRodando = status.rodando;
  state.statusPorPorta = new Map(status.portas.map((p) => [p.portaCom, p]));
  el('btnToggleAgente').textContent = state.agenteRodando ? 'Parar Agente' : 'Iniciar Agente';
  renderizarTabela();
}

el('btnToggleAgente').addEventListener('click', async () => {
  if (state.agenteRodando) {
    await window.agenteAPI.pararAgente();
  } else {
    await window.agenteAPI.iniciarAgente();
  }
  await carregarStatus();
});

el('btnReiniciarConexoes').addEventListener('click', async () => {
  await window.agenteAPI.reiniciarConexoes();
  await carregarStatus();
});

// ---------- Auto-launch ----------
async function carregarAutoLaunch() {
  el('chkAutoLaunch').checked = await window.agenteAPI.obterAutoLaunch();
}

el('chkAutoLaunch').addEventListener('change', async (evt) => {
  await window.agenteAPI.definirAutoLaunch(evt.target.checked);
});

// ---------- Formulario (criar/editar) ----------
function abrirFormulario(balancaExistente) {
  const modal = el('modalForm');
  const form = el('formBalanca');
  form.reset();
  el('resultadoTeste').textContent = '';

  el('modalTitulo').textContent = balancaExistente ? 'Editar balança' : 'Nova balança';
  el('fPortaComOriginal').value = balancaExistente ? balancaExistente.portaCom : '';

  if (balancaExistente) {
    el('fNome').value = balancaExistente.nome;
    el('fBaudRate').value = String(balancaExistente.baudRate);
    el('fDataBits').value = String(balancaExistente.dataBits);
    el('fParidade').value = balancaExistente.paridade;
    el('fStopBits').value = String(balancaExistente.stopBits);
    el('fTimeout').value = balancaExistente.timeout || 5000;
    el('fProtocolo').value = balancaExistente.protocoloSerial;
  }

  carregarPortas(balancaExistente ? balancaExistente.portaCom : null);
  modal.hidden = false;
}

function fecharFormulario() {
  el('modalForm').hidden = true;
}

el('btnNovaBalanca').addEventListener('click', () => abrirFormulario(null));
el('btnCancelarForm').addEventListener('click', fecharFormulario);

async function carregarPortas(selecionar) {
  const select = el('fPortaCom');
  select.innerHTML = '<option value="">Carregando...</option>';
  try {
    const portas = await window.agenteAPI.listarPortas();
    select.innerHTML = portas.map((p) => `<option value="${p}">${p}</option>`).join('');
    if (selecionar) select.value = selecionar;
  } catch (err) {
    select.innerHTML = `<option value="">Falha ao listar portas</option>`;
  }
}

el('btnAtualizarPortas').addEventListener('click', () => carregarPortas(el('fPortaCom').value));

function valoresFormulario() {
  return {
    nome: el('fNome').value.trim(),
    portaCom: el('fPortaCom').value,
    baudRate: Number(el('fBaudRate').value),
    dataBits: Number(el('fDataBits').value),
    paridade: el('fParidade').value,
    stopBits: Number(el('fStopBits').value),
    timeout: Number(el('fTimeout').value),
    protocoloSerial: el('fProtocolo').value,
  };
}

el('btnTestarConexao').addEventListener('click', async () => {
  const resultadoEl = el('resultadoTeste');
  resultadoEl.textContent = 'Testando...';
  try {
    const resultado = await window.agenteAPI.testarConexao(valoresFormulario());
    resultadoEl.textContent = resultado.ok
      ? `OK - peso lido: ${resultado.peso} kg`
      : `Falha: ${resultado.mensagem}`;
    resultadoEl.style.color = resultado.ok ? '#2e9e5b' : '#d64545';
  } catch (err) {
    resultadoEl.textContent = `Erro: ${err.message}`;
    resultadoEl.style.color = '#d64545';
  }
});

el('formBalanca').addEventListener('submit', async (evt) => {
  evt.preventDefault();
  const dados = valoresFormulario();
  const portaComOriginal = el('fPortaComOriginal').value;

  try {
    if (portaComOriginal) {
      state.balancas = await window.agenteAPI.atualizarBalanca(portaComOriginal, dados);
    } else {
      state.balancas = await window.agenteAPI.criarBalanca(dados);
    }
    fecharFormulario();
    renderizarTabela();
    await carregarStatus();
  } catch (err) {
    alert(`Erro ao salvar: ${err.message}`);
  }
});

// ---------- Logs ----------
function anexarLog(linha) {
  const viewer = el('logViewer');
  viewer.textContent += `[${linha.ts}] [${linha.nivel}] ${linha.mensagem}\n`;
  viewer.scrollTop = viewer.scrollHeight;
}

async function carregarLogs() {
  const linhas = await window.agenteAPI.obterLogs();
  el('logViewer').textContent = linhas.map((l) => `[${l.ts}] [${l.nivel}] ${l.mensagem}`).join('\n');
  el('logViewer').scrollTop = el('logViewer').scrollHeight;
}

el('btnAbrirPastaLogs').addEventListener('click', () => window.agenteAPI.abrirPastaDeLogs());

// ---------- Eventos ao vivo ----------
window.agenteAPI.onEvento((evento) => {
  if (evento.tipo === 'status') {
    aplicarStatus({ rodando: state.agenteRodando, portas: evento.portas });
  } else if (evento.tipo === 'log') {
    anexarLog(evento);
  }
});

// ---------- Boot ----------
(async function iniciar() {
  await Promise.all([carregarBalancas(), carregarStatus(), carregarAutoLaunch(), carregarLogs()]);
})();
