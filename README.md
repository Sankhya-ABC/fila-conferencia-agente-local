# Agente Local de Balanças — Fila de Conferência

Serviço leve que roda no PC Windows do operador/cliente, lê balanças conectadas
via porta serial (RS-232/USB) e expõe os pesos via WebSocket em
`ws://localhost:3099` para o frontend do Fila de Conferência (que roda na
nuvem) consumir diretamente do navegador.

Necessário porque o backend do sistema roda num servidor Linux na nuvem e
**não enxerga portas COM físicas conectadas no PC do cliente** — só o
navegador, rodando localmente na mesma máquina da balança, consegue.

## Instalação

1. Instale o [Node.js LTS](https://nodejs.org/) (18+) na máquina do cliente, se ainda não tiver.
2. Copie esta pasta (`fila-conferencia-agente-local`) para a máquina do cliente.
3. Abra um terminal na pasta e rode:
   ```
   npm install
   ```
4. Copie `config.example.json` para `config.json` (se ainda não existir) e edite
   com as balanças fisicamente conectadas **nessa estação**:
   ```json
   [
     {
       "nome": "Stagem Pequeno 02 - ST02",
       "portaCom": "COM8",
       "baudRate": 4800,
       "dataBits": 8,
       "paridade": "NONE",
       "stopBits": 1,
       "protocoloSerial": "P05"
     }
   ]
   ```
   Adicione um objeto por balança conectada nesse PC — o agente abre todas ao
   mesmo tempo, cada uma na sua porta COM. Use exatamente os mesmos valores já
   preenchidos no cadastro da balança na tela **Balanças** do sistema web
   (Porta COM, Baud Rate, Data Bits, Paridade, Stop Bits, Protocolo Serial).

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

- **Peso não aparece / vem zerado**: baud rate errado é a causa mais comum.
  Tente `9600`, `2400` ou `19200` no `config.json` e reinicie o agente.
- **Peso aparece só quando aperta um botão físico "imprimir" na balança**:
  troque `protocoloSerial` para `"SOB_REQUISICAO"`.
- **Caracteres estranhos no peso**: confira `dataBits`/`paridade`/`stopBits`
  no manual da balança — o padrão Toledo é 8/NONE/1, mas alguns modelos usam
  7/EVEN/1.
- **Porta em uso (`Access denied` / `Resource busy`)**: feche qualquer outro
  programa que esteja acessando a porta COM (ex: monitor serial, app do
  fabricante da balança).
- **Frontend não conecta no agente**: confirme que o agente está rodando
  (`npm start` ou serviço ativo) e que nada está bloqueando a porta 3099 no
  firewall local (`New-NetFirewallRule -DisplayName "Agente Balanca WS" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3099`).
  O agente escuta em `127.0.0.1`, então só é acessível da própria máquina —
  isso é intencional (segurança).
