# Agente Local de Balanças — Fila de Conferência

Aplicativo desktop (Electron) que roda no PC Windows do operador/cliente, lê
balanças conectadas via porta serial (RS-232/USB) e expõe os pesos via
WebSocket em `ws://localhost:3099` para o frontend do Fila de Conferência (que
roda na nuvem) consumir diretamente do navegador.

Necessário porque o backend do sistema roda num servidor Linux na nuvem e
**não enxerga portas COM físicas conectadas no PC do cliente** — só o
navegador, rodando localmente na mesma máquina da balança, consegue.

## Instalação (cliente final)

1. Baixe o instalador na tela **Balanças** do Portal, botão **Download do
   Agente**, ou peça o arquivo `agente-balanca-setup-*.exe` para o suporte.
2. Rode o instalador e siga o assistente (não precisa ser Administrador).
3. Ao terminar, o agente abre automaticamente. Uma janela de configuração
   aparece — clique em **Nova balança**, escolha a porta COM (confira no
   Gerenciador de Dispositivos se tiver dúvida — veja o aviso sobre portas
   "fantasma" abaixo), ajuste baud rate/paridade/stop bits do manual da
   balança e clique em **Testar comunicação** antes de salvar.
4. Clique em **Iniciar Agente**. O ícone aparece na bandeja do sistema
   (system tray) e o app continua rodando mesmo se você fechar a janela — só
   encerra de fato pelo menu da bandeja (**Sair**).
5. "Iniciar com o Windows" já vem marcado por padrão — o agente sobe sozinho
   no login, minimizado na bandeja, e reconecta às balanças configuradas sem
   precisar abrir a janela.

> ⚠️ **Portas COM "fantasma"**: em placas-mãe com Intel AMT/vPro, por exemplo,
> existe uma porta virtual `Intel(R) Active Management Technology - SOL` que
> ocupa um número de COM só de gerenciamento remoto, sem cabo físico ligado —
> ela "abre" sem erro, mas não é a balança. As portas de verdade aparecem
> tipicamente como um adaptador real (ex: placa PCIe "WCH PCI Express Serial",
> conversor USB-Serial FTDI/Prolific, etc). Confira no Gerenciador de
> Dispositivos (`devmgmt.msc` → "Portas (COM e LPT)") se tiver dúvida.

## Migrando uma estação que já rodava o agente antigo (Windows Service)

O modelo antigo (Node.js puro + `node-windows`) não pode rodar ao mesmo tempo
que o novo agente desktop — os dois disputam as mesmas portas COM e a porta WS
3099. Antes de instalar o novo agente numa máquina que já tem o serviço
`FilaConferenciaAgenteBalancas` instalado:

```
npm run legacy:uninstall-service   (como Administrador)
```

Depois disso, instale normalmente o novo `.exe`.

## Desenvolvimento

```
npm install
npm start              # abre o app Electron (janela + tray)
npm run start:hidden   # abre direto minimizado na bandeja (simula auto-start)
npm run dist:win       # gera o instalador em dist/agente-balanca-setup-<versao>.exe
```

Configuração (balanças cadastradas, configurações gerais) fica salva em
`%APPDATA%/fila-conferencia-agente-local/` — não é mais um `config.json` na
pasta do projeto.

### Modo CLI/headless (avançado)

`npm run start:cli` ainda sobe o agente sem GUI a partir de um `config.json`
na raiz do projeto (`config.example.json` como referência), para depuração ou
cenários sem Electron disponível. `npm run start:debug` liga o log de dados
brutos da porta serial nesse modo.

## Troubleshooting

- **Peso aparece errado (ex: balança com 15kg mostra 0,015 kg, ou qualquer
  valor fora da realidade)**: o parser está interpretando errado o formato que
  essa balança envia. Rode `npm run start:debug` (modo CLI) e observe o
  `RAW hex=...` / `LINHA=...` no terminal com um peso conhecido na balança —
  isso ajuda a ajustar o `toledoParser.js` para esse formato específico.
- **Falha ao testar/abrir a porta**: confira se a porta não está em uso por
  outro programa (feche qualquer software da balança que já esteja aberto) e
  se o número de COM confere com o Gerenciador de Dispositivos.
- **Peso não aparece / vem zerado**: baud rate errado é a causa mais comum.
  Tente `9600`, `2400` ou `19200` e teste a comunicação de novo.
- **Peso aparece só quando aperta um botão físico "imprimir" na balança**:
  troque o protocolo para "Sob requisição".
- **Caracteres estranhos no peso**: confira data bits/paridade/stop bits no
  manual da balança — o padrão Toledo é 8/NONE/1, mas alguns modelos usam
  7/EVEN/1.
- **Frontend não conecta no agente**: confirme que o agente está rodando
  (ícone na bandeja) e que nada está bloqueando a porta 3099 no firewall local
  (`New-NetFirewallRule -DisplayName "Agente Balanca WS" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3099`).
  O agente escuta em `127.0.0.1`, então só é acessível da própria máquina —
  isso é intencional (segurança).
