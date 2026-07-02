# Agente Local de Balanças — Fila de Conferência

Serviço leve que roda no PC Windows do operador/cliente, lê balanças conectadas
via porta serial (RS-232/USB) e expõe os pesos via WebSocket em
`ws://localhost:3099` para o frontend do Fila de Conferência (que roda na
nuvem) consumir diretamente do navegador.

Necessário porque o backend do sistema roda num servidor Linux na nuvem e
**não enxerga portas COM físicas conectadas no PC do cliente** — só o
navegador, rodando localmente na mesma máquina da balança, consegue.

## Cada estação (Stage) tem seu próprio PC e seu próprio config.json

Cada "Stage" (Stage 01, Stage 02, ...) é um computador físico diferente, com
suas próprias balanças conectadas. **O `config.json` não é o mesmo em todas as
máquinas** — cada PC só deve listar as balanças que estão fisicamente
conectadas nele. O repositório traz um template pronto por estação:

- `config.stage01.example.json` — Balança Pequena e Média do Stage 01.
- `config.stage02.example.json` — Balança Pequena e Média do Stage 02.

> ⚠️ **Antes de usar os números de porta desses templates, confirme no
> Gerenciador de Dispositivos daquele PC especificamente.** Cada máquina pode
> ter numeração diferente — inclusive é comum aparecerem portas COM "fantasma"
> que **não são a balança**: em placas-mãe com Intel AMT/vPro, por exemplo,
> existe uma porta virtual `Intel(R) Active Management Technology - SOL`
> que ocupa um número de COM só de gerenciamento remoto, sem nenhum cabo
> físico ligado — ela "abre" sem erro, mas não é a balança. As portas de
> verdade, com cabo RS232 físico, aparecem tipicamente como um adaptador real
> (ex: placa PCIe "WCH PCI Express Serial", conversor USB-Serial FTDI/Prolific,
> etc). Veja como conferir isso no [Troubleshooting](#troubleshooting) abaixo.

## Instalação

1. Instale o [Node.js LTS](https://nodejs.org/) (18+) na máquina do cliente, se ainda não tiver.
   Depois de instalar, **feche e reabra o terminal** (ou reinicie o PC) antes
   de continuar — o Windows só carrega o `node`/`npm` no PATH em terminais
   abertos depois da instalação.
2. Copie esta pasta (`fila-conferencia-agente-local`) para a máquina do cliente
   (ou `git clone https://github.com/Sankhya-ABC/fila-conferencia-agente-local.git`).
3. Abra um terminal na pasta e rode:
   ```
   npm install
   ```
4. Confirme no Gerenciador de Dispositivos (`devmgmt.msc` → "Portas (COM e
   LPT)") quais são as portas COM **reais** dessa máquina (veja o aviso acima).
   Depois copie o template da estação correta para `config.json`:
   ```
   copy config.stage01.example.json config.json    (nesse PC = Stage 01)
   copy config.stage02.example.json config.json    (nesse PC = Stage 02)
   ```
   Se os números de porta do template não baterem com o que você viu no
   Gerenciador de Dispositivos, edite o `config.json` com os números certos
   antes de continuar. `config.json` não vai para o git (é específico dessa
   máquina) — pode editar à vontade.

5. Teste rodando manualmente:
   ```
   npm start
   ```
   Deve aparecer algo como:
   ```
   Carregadas 1 balanca(s): Stagem Pequeno 02 - ST02 (COM8)
   [COM8] Porta aberta (4800 bps, P05).
   Agente local de balancas - WS server ouvindo em ws://127.0.0.1:3099
   ```
   Se aparecer erro `Error: Opening COM8: File not found`, a porta não existe
   ou está em uso por outro programa (feche qualquer software da balança que
   já esteja aberto).

6. Abra a tela **Balanças** no sistema web e clique em **Testar Conexão** na
   balança — o peso deve aparecer sem passar pelo backend.

## Instalar como Serviço do Windows (recomendado para produção)

Assim o agente sobe sozinho ao ligar o PC, sem precisar deixar terminal aberto
nem depender de login do operador.

1. Instale a dependência extra (não vem por padrão):
   ```
   npm install node-windows
   ```
2. Abra o PowerShell/CMD **como Administrador** na pasta do projeto e rode:
   ```
   npm run install-service
   ```
3. Verifique em `services.msc` que o serviço **FilaConferenciaAgenteBalancas**
   está com status "Em execução" e "Automático".

Para remover o serviço (também como Administrador):
```
npm run uninstall-service
```

## Troubleshooting

- **`node`/`npm` não reconhecido depois de instalar**: feche todos os
  terminais (inclusive o do VSCode, se usar) e abra um novo — o PATH só é
  recarregado em terminais abertos após a instalação. Se persistir, reinicie
  o PC.
- **Descobrir qual COM é qual fisicamente**: abra `devmgmt.msc` → "Portas
  (COM e LPT)". Ignore qualquer entrada `Intel(R) Active Management
  Technology - SOL` — é uma porta virtual de gerenciamento remoto da
  placa-mãe, não tem balança nenhuma ligada nela. As portas reais aparecem
  como um adaptador físico (ex: `WCH PCI Express Serial`, `USB Serial Port
  (FTDI/Prolific)`, etc). Se a máquina tem uma placa PCIe multi-serial
  (ex: "WCH PCI Express Serial"), expanda a entrada dela — cada porta física
  da placa aparece como um item separado com seu próprio número de COM.
- **`Error: Opening COMx: File not found`**: essa porta não existe fisicamente
  nessa máquina. O número está errado no `config.json` — confira no
  Gerenciador de Dispositivos qual é o COM real dessa balança.
- **Peso não aparece / vem zerado**: baud rate errado é a causa mais comum.
  Tente `9600`, `2400` ou `19200` no `config.json` e reinicie o agente.
- **Peso aparece só quando aperta um botão físico "imprimir" na balança**:
  troque `protocoloSerial` para `"SOB_REQUISICAO"`.
- **Caracteres estranhos no peso**: confira `dataBits`/`paridade`/`stopBits`
  no manual da balança — o padrão Toledo é 8/NONE/1, mas alguns modelos usam
  7/EVEN/1.
- **Porta em uso (`Access denied` / `Resource busy`)**: a porta existe mas
  outro processo já está com ela aberta.
  1. Rode `Get-Process node` no PowerShell — se aparecer mais de um processo
     `node` (ex: um `npm start` manual rodando ao mesmo tempo que o serviço
     do Windows já instalado), encerre os extras com
     `Stop-Process -Id <PID> -Force` e deixe só uma instância do agente ativa.
  2. Feche qualquer outro programa que possa estar acessando a porta COM
     (ex: monitor serial, app do fabricante da balança).
  3. Se persistir, reinicie o PC para liberar qualquer handle travado na porta.
- **Frontend não conecta no agente**: confirme que o agente está rodando
  (`npm start` ou serviço ativo) e que nada está bloqueando a porta 3099 no
  firewall local (`New-NetFirewallRule -DisplayName "Agente Balanca WS" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3099`).
  O agente escuta em `127.0.0.1`, então só é acessível da própria máquina —
  isso é intencional (segurança).
