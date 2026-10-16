# Dguests NextGen × PDV EPOC — Plataforma de Reservas, Fila Virtual, Mapa em Tempo Real & CRM 360º

Implementação Full-Stack completa da **Especificação de Produto (Out/2026)** para evolução do Dguests em uma plataforma estilo **SevenRooms**, integrada bidirecionalmente ao **PDV EPOC** e ao **Data Hub Wangari / SalesBox (11 APIs)**.

## Como executar localmente

```bash
npm install
npm run dev
```

Acesse **[http://localhost:3000](http://localhost:3000)**.

---

## Módulos Implementados

1. **Mapa de Chão Interativo em Tempo Real & Editor de Planta (`src/components/FloorplanCanvas.tsx`)**
   - Multi-ambiente (**Salão Principal**, **Varanda Social**, **Lounge 88**, **Terraço Sunset**, **Mezanino** e **Todos os Ambientes**).
   - Convenção de cores oficial Dguests + Estados Físicos EPOC:
     - **Cinza**: Disponível (`EPOC FREE` + sem reserva no intervalo)
     - **Amarelo**: Reserva Online (`SUPERAPP`, `QR_CODE`, `SITE`, `LINKBIO`)
     - **Roxo**: Reserva Manual (`BALCAO`, `TELEFONE`, `WHATSAPP`)
     - **Laranja**: Reserva Confirmada / Check-in (`RECONFIRMED`, `ARRIVED`)
     - **Verde**: Sentados (`EPOC OPEN` vinculado à reserva ou fila) com timer de ocupação
     - **Âmbar Pulsante**: Em Fechamento (`EPOC CLOSING` — conta solicitada, alerta de mesa prestes a liberar)
     - **Azul Petróleo**: Ocupada sem Reserva (Walk-in aberto direto no terminal EPOC)
     - **Vermelho com Cadeado**: Travada (Bloqueio manual ou no EPOC)
     - **Cinza Hachurado**: Desatualizada (Sem resposta do EPOC > 30s / Modo degradado)
   - **Drag & Drop / 1-Clique para Sentar**: Arraste uma reserva ou grupo da fila sobre a mesa para validar capacidade, aplicar trava otimista de 30s e abrir a comanda no EPOC com `Idempotency-Key`.
   - **Junção e Separação de Mesas**: Inclui a **Mesa 11/04 (12 lugares)** e permite juntar ou separar mesas com 1 clique.
   - **IA para o Garçom no Cartão da Mesa**: Alerta de alergias severas em destaque, sugestão de faixa de vinho (Caro, Médio, Simples), pratos recomendados e dica de abordagem.

2. **Reservas, Fila Virtual Inteligente & Leitor de QR Code (`src/components/WaitlistAndReservationsPanel.tsx`)**
   - Máquina de estados completa (`REQUESTED` → `CONFIRMED` → `RECONFIRMED` → `ARRIVED` → `SEATED` → `FINISHED` / `NO_SHOW` / `CANCELLED`).
   - Validação de CPF (Módulo 11), bloqueio contra reservas duplicadas no mesmo CPF/dia (`HTTP 422`) e política de depósito após 3 no-shows.
   - Leitor de **Voucher QR Code Assinado de Uso Único**.
   - **Fila Virtual ao Vivo** dividida por faixa (`1-2`, `2-4`, `5-10`, `12+`), chamada via WhatsApp/Push com prazo de 5 min e botões do cliente (*Estou indo*, *Passar a vez*, *Sair da fila*).

3. **CRM 360º por CPF + Enriquecimento Wangari Data Hub & 11 APIs SalesBox (`src/components/CrmWangariPanel.tsx`)**
   - Chave única por CPF (mascarado na interface `***.418.920-**` e hash SHA-256).
   - Pipeline em funil das **11 APIs SalesBox** (*Data Quality PF → Vínculo CPF×Telefone → Reciclagem de Número → Flag WhatsApp → Dados PF → PeopleScope → Segmentação Comportamental → Score de Consumo 0–1000 → Score de Endereço*), com minimização LGPD (descarte de dados de saúde, política, score de crédito/dívidas e filiação).
   - **7 Clusters de Marketing** (*Premium frequente*, *Alto potencial adormecido*, *Frequente do dia a dia*, *Celebrações e grupos*, *Cultural e experiências*, *Novo com potencial*, *Baixa aderência de contato*).
   - Portal de Consentimentos Granulares LGPD (*Serviço*, *Enriquecimento*, *Marketing*).

4. **Simulador do Terminal PDV EPOC & EPOC Adapter (`src/components/EpocSimulatorAndApiPanel.tsx`)**
   - Lançamento de itens na comanda em tempo real, solicitação de conta (`CLOSING`) e fechamento definitivo (`CLOSED`) que libera a mesa no mapa e envia itens e valor total para o CRM pelo CPF.
   - Simulação do **Fluxo #6 (Walk-in aberto direto no terminal EPOC)** com realocação automática de reserva futura em conflito.
   - Simulação de **Modo Degradado Offline** e reconciliação completa a cada 60s.

5. **Portal QR Mobile do Cliente, API Pública REST `/v1` & Webhooks HMAC**
   - Endpoints reais em `/api/v1/venues/[id]/availability`, `/api/v1/reservations`, `/api/v1/guests/[id]/enrichment` e `/api/v1/state`.
