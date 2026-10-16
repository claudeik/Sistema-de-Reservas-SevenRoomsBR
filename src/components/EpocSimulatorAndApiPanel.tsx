"use client";

import React, { useState } from "react";
import {
  Activity,
  CheckCircle2,
  Code2,
  CreditCard,
  ExternalLink,
  KeyRound,
  Plus,
  QrCode,
  RefreshCw,
  Server,
  Shield,
  Smartphone,
  Terminal,
  Wifi,
  WifiOff,
} from "lucide-react";
import { DatabaseState } from "@/types/domain";

interface EpocSimulatorAndApiPanelProps {
  db: DatabaseState;
  mode: "EPOC_SIMULATOR" | "QR_AND_API";
  onAction: (payload: Record<string, unknown>) => Promise<void>;
  busy: boolean;
}

const MENU_CATALOG = [
  { name: "Brunello di Montalcino DOCG Banfi (Garrafa)", category: "VINHO", price: 790 },
  { name: "Champagne Veuve Clicquot Brut (Garrafa)", category: "VINHO", price: 640 },
  { name: "Provence Rosé Whispering Angel (Garrafa)", category: "VINHO", price: 360 },
  { name: "Prime Rib Wagyu A5 com Trufas Negras", category: "PRATO", price: 340 },
  { name: "Polvo Grelhado na Brasa c/ Páprica Defumada", category: "PRATO", price: 188 },
  { name: "Risoto de Camarão com Limão Siciliano", category: "PRATO", price: 164 },
  { name: "Crudo de Atum Bluefin com Ponzu Cítrico", category: "ENTRADA", price: 124 },
  { name: "Burrata Artesanal ao Pesto de Pistache", category: "ENTRADA", price: 96 },
  { name: "Negroni Sbagliato Autoral", category: "DRINK", price: 54 },
] as const;

export default function EpocSimulatorAndApiPanel({
  db,
  mode,
  onAction,
  busy,
}: EpocSimulatorAndApiPanelProps) {
  // Estado para o Simulador do Terminal PDV EPOC
  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    db.epocOrders.find((o) => o.status !== "CLOSED")?.id || db.epocOrders[0]?.id || ""
  );
  const [walkinTableId, setWalkinTableId] = useState<string>("table-03");
  const [walkinPartySize, setWalkinPartySize] = useState<number>(4);
  const [walkinCpf, setWalkinCpf] = useState<string>("");

  // Estado para o Simulador Mobile do Cliente (QR Code na Porta / SuperApp)
  const [mobileTab, setMobileTab] = useState<"WAITLIST" | "RESERVE">("WAITLIST");
  const [mobName, setMobName] = useState("Gabriel Santoro");
  const [mobCpf, setMobCpf] = useState("44829103847");
  const [mobPhone, setMobPhone] = useState("+55 11 99281-7744");
  const [mobSize, setMobSize] = useState(4);
  const [mobTime, setMobTime] = useState("21:30");
  const [mobConsentMkt, setMobConsentMkt] = useState(true);
  const [mobConsentEnr, setMobConsentEnr] = useState(true);

  // Estado para o Playground da API Pública v1
  const [apiResponseJson, setApiResponseJson] = useState<string>("");
  const [apiLoading, setApiLoading] = useState(false);

  const activeOrders = db.epocOrders.filter((o) => o.status !== "CLOSED");
  const currentOrder =
    db.epocOrders.find((o) => o.id === selectedOrderId) || activeOrders[0] || db.epocOrders[0];

  const runLiveApiTest = async (url: string, method: "GET" | "POST" = "GET", payload?: unknown) => {
    setApiLoading(true);
    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `demo-idem-${Date.now()}`,
        },
        body: payload ? JSON.stringify(payload) : undefined,
      });
      const data = await res.json();
      setApiResponseJson(JSON.stringify(data, null, 2));
    } catch (e) {
      setApiResponseJson(JSON.stringify({ error: String(e) }, null, 2));
    } finally {
      setApiLoading(false);
    }
  };

  if (mode === "EPOC_SIMULATOR") {
    return (
      <div className="space-y-6">
        {/* Topo: Status da Camada EPOC Adapter (Seção 12) */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
            <div>
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">
                  Camada de Integração: EPOC Adapter & Simulador de Terminal PDV EPOC (Seção 12)
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                A reserva decide quem vai sentar, o EPOC diz se a mesa está livre (prevalece em divergências) e a
                abertura da comanda confirma o sentar com <code className="text-amber-300">Idempotency-Key</code>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                disabled={busy}
                onClick={() =>
                  onAction({
                    action: "EPOC_SET_CONNECTION_MODE",
                    mode: "ONLINE_WEBHOOK",
                  })
                }
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  db.venue.epocConnectionMode === "ONLINE_WEBHOOK"
                    ? "bg-emerald-500 text-slate-950"
                    : "border border-slate-700 bg-slate-800 text-slate-300"
                }`}
              >
                <Wifi className="h-3.5 w-3.5" /> Webhook Real-Time (&lt;2s)
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  onAction({
                    action: "EPOC_SET_CONNECTION_MODE",
                    mode: "ONLINE_POLLING",
                  })
                }
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  db.venue.epocConnectionMode === "ONLINE_POLLING"
                    ? "bg-amber-500 text-slate-950"
                    : "border border-slate-700 bg-slate-800 text-slate-300"
                }`}
              >
                <Activity className="h-3.5 w-3.5" /> Polling (5–10s)
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  onAction({
                    action: "EPOC_SET_CONNECTION_MODE",
                    mode: "DEGRADED_OFFLINE",
                  })
                }
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  db.venue.epocConnectionMode === "DEGRADED_OFFLINE"
                    ? "bg-rose-500 text-white"
                    : "border border-slate-700 bg-slate-800 text-slate-300"
                }`}
              >
                <WifiOff className="h-3.5 w-3.5" /> Simular Queda EPOC (Modo Degradado)
              </button>
              <button
                disabled={busy}
                onClick={() => onAction({ action: "EPOC_RECONCILE_NOW" })}
                className="flex items-center gap-1 rounded-lg border border-indigo-500/40 bg-indigo-500/20 px-3 py-1.5 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/30"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Reconciliar 60s Agora
              </button>
            </div>
          </div>

          {/* Tabela de Mapeamento Mesa Interna <-> ID EPOC <-> ID Ambiente EPOC */}
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
            {db.tables
              .filter((t) => !t.parentMergedIntoId)
              .slice(0, 12)
              .map((t) => (
                <div
                  key={t.id}
                  className="rounded-lg border border-slate-800 bg-slate-950/70 p-2 text-[11px]"
                >
                  <div className="flex items-center justify-between font-mono font-bold">
                    <span className="text-white">Mesa {t.number}</span>
                    <span
                      className={
                        t.epocStatus === "FREE"
                          ? "text-slate-400"
                          : t.epocStatus === "OPEN"
                            ? "text-emerald-400"
                            : t.epocStatus === "CLOSING"
                              ? "text-amber-300"
                              : "text-rose-400"
                      }
                    >
                      {t.epocStatus}
                    </span>
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-slate-400">
                    {t.epocTableId} · {db.areas.find((a) => a.id === t.areaId)?.epocAreaId}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Grid Principal do Simulador EPOC: Comandas Abertas e Lançamento de Itens (Esquerda) + Simulador de Conflito Walk-in e Auditoria (Direita) */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          {/* Terminal de Comandas do Garçom / Caixa EPOC (7 cols) */}
          <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/90 p-4 xl:col-span-7">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="flex items-center gap-2 text-base font-bold text-white">
                  <Terminal className="h-4 w-4 text-emerald-400" />
                  Terminal PDV EPOC — Comandas Abertas em Tempo Real
                </h3>
                <p className="text-xs text-slate-400">
                  Lance vinhos e pratos, solicite a conta (deixa a mesa em fechamento no mapa) ou encerre a conta
                  (libera a mesa e envia o consumo ao CRM por CPF).
                </p>
              </div>
            </div>

            {/* Seletor de Comandas EPOC */}
            <div className="flex flex-wrap gap-2">
              {db.epocOrders.map((ord) => {
                const tbl = db.tables.find((t) => t.id === ord.tableId);
                const active = currentOrder?.id === ord.id;
                return (
                  <button
                    key={ord.id}
                    onClick={() => setSelectedOrderId(ord.id)}
                    className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                      active
                        ? "border-emerald-400 bg-emerald-950/40 text-white"
                        : "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div className="font-mono font-bold text-emerald-300">
                      {ord.id} · Mesa {tbl?.number || ord.epocTableId}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {ord.guestName} · R$ {ord.total.toFixed(0)} ({ord.status})
                    </div>
                  </button>
                );
              })}
            </div>

            {currentOrder && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                {/* Detalhes da Comanda Selecionada */}
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 lg:col-span-6">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div>
                      <span className="font-mono text-sm font-bold text-emerald-400">
                        {currentOrder.id} ({currentOrder.epocTableId})
                      </span>
                      <p className="text-xs text-white font-semibold">{currentOrder.guestName}</p>
                      <p className="font-mono text-[10px] text-slate-400">
                        CPF na comanda: {currentOrder.guestCpf || "Não informado"} · Idempotency-Key:{" "}
                        {currentOrder.idempotencyKey || "Walk-in"}
                      </p>
                    </div>
                    <span className="rounded bg-slate-800 px-2 py-1 text-xs font-bold text-amber-300">
                      {currentOrder.status}
                    </span>
                  </div>

                  <div className="my-3 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Couvert Artístico ({currentOrder.partySize}p)</span>
                      <span>R$ {currentOrder.couvertTotal.toFixed(2)}</span>
                    </div>
                    {currentOrder.items.map((it) => (
                      <div key={it.id} className="flex justify-between text-slate-200">
                        <span>
                          {it.qty}x {it.name}
                        </span>
                        <span className="font-mono">R$ {(it.qty * it.unitPrice).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-slate-800 pt-1.5 text-slate-400">
                      <span>Subtotal</span>
                      <span>R$ {currentOrder.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Serviço Opcional (13%)</span>
                      <span>R$ {currentOrder.serviceFeeTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-800 pt-1.5 text-sm font-extrabold text-white">
                      <span>Total da Conta EPOC</span>
                      <span className="text-emerald-400">R$ {currentOrder.total.toFixed(2)}</span>
                    </div>
                  </div>

                  {currentOrder.status !== "CLOSED" && (
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button
                        disabled={busy || currentOrder.status === "CLOSING"}
                        onClick={() =>
                          onAction({
                            action: "EPOC_REQUEST_BILL",
                            tableId: currentOrder.tableId,
                          })
                        }
                        className="flex items-center justify-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/20 px-3 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/30 disabled:opacity-40"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        Solicitar Conta (CLOSING)
                      </button>
                      <button
                        disabled={busy}
                        onClick={() =>
                          onAction({
                            action: "EPOC_CLOSE_ORDER",
                            tableId: currentOrder.tableId,
                          })
                        }
                        className="flex items-center justify-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Fechar Conta & Liberar Mesa
                      </button>
                    </div>
                  )}
                </div>

                {/* Catálogo Rápido KDS / EPOC para Lançar Consumo */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 lg:col-span-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Cardápio PDV EPOC — Clique para Lançar na Comanda
                  </span>
                  <div className="mt-2.5 space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {MENU_CATALOG.map((item) => (
                      <button
                        key={item.name}
                        disabled={busy || currentOrder.status === "CLOSED"}
                        onClick={() =>
                          onAction({
                            action: "EPOC_ADD_ITEM",
                            orderId: currentOrder.id,
                            name: item.name,
                            category: item.category,
                            qty: 1,
                            unitPrice: item.price,
                          })
                        }
                        className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-left text-xs transition hover:border-amber-500/50 hover:bg-slate-800 disabled:opacity-40"
                      >
                        <div>
                          <div className="font-semibold text-white">{item.name}</div>
                          <div className="text-[10px] text-slate-400">{item.category}</div>
                        </div>
                        <span className="flex items-center gap-1 font-mono font-bold text-amber-300">
                          <Plus className="h-3 w-3" /> R$ {item.price}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Simulador de Walk-in Aberto Direto no EPOC (Fluxo #6 Seção 12) + Log de Auditoria EPOC Adapter (5 cols) */}
          <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/90 p-4 xl:col-span-5">
            <div className="rounded-xl border border-cyan-500/40 bg-cyan-950/20 p-3.5">
              <h3 className="text-sm font-bold text-cyan-200">
                Fluxo #6 (Seção 12): Abrir Mesa Direto no EPOC sem Reserva (Walk-in)
              </h3>
              <p className="mt-1 text-xs text-slate-300">
                Quando um garçom abre uma mesa direto no terminal EPOC sem passar pelo Host, o mapa marca{" "}
                <strong>&ldquo;Ocupada sem reserva&rdquo;</strong>. Se havia reserva futura nessa mesa (ex.:{" "}
                <strong>Mesa 03 da Mariana</strong>), o sistema realoca automaticamente a reserva para outra mesa livre
                e alerta o Host!
              </p>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <select
                  value={walkinTableId}
                  onChange={(e) => setWalkinTableId(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                >
                  {db.tables
                    .filter((t) => !t.parentMergedIntoId && t.epocStatus === "FREE" && !t.isLocked)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        Mesa {t.number} ({t.currentReservationId ? "Com Reserva!" : "Livre"})
                      </option>
                    ))}
                </select>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={walkinPartySize}
                  onChange={(e) => setWalkinPartySize(Number(e.target.value))}
                  placeholder="Pessoas"
                  className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                />
                <input
                  type="text"
                  value={walkinCpf}
                  onChange={(e) => setWalkinCpf(e.target.value)}
                  placeholder="CPF na comanda (opcional)"
                  className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-white"
                />
              </div>

              <button
                disabled={busy}
                onClick={() =>
                  onAction({
                    action: "EPOC_OPEN_WALKIN",
                    tableId: walkinTableId,
                    partySize: walkinPartySize,
                    guestCpf: walkinCpf || undefined,
                  })
                }
                className="mt-2.5 w-full rounded-lg bg-cyan-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400"
              >
                Abrir Comanda Walk-in Direto no Terminal EPOC
              </button>
            </div>

            {/* Trilha de Auditoria EPOC Adapter & LGPD */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Log de Auditoria EPOC Adapter & Governança LGPD
                </span>
                <Shield className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="mt-2.5 space-y-2 max-h-64 overflow-y-auto pr-1">
                {db.auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-lg border border-slate-800/80 bg-slate-900/70 p-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-mono font-bold text-amber-300">
                        [{log.timestamp}] {log.role}
                      </span>
                      {log.targetCpfMasked && (
                        <span className="font-mono text-slate-300">CPF: {log.targetCpfMasked}</span>
                      )}
                    </div>
                    <div className="mt-0.5 font-semibold text-white">{log.action}</div>
                    <p className="text-[11px] text-slate-300">{log.details}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MODO: QR CODES, JORNADA MOBILE DO CLIENTE & API PÚBLICA REST v1 / WEBHOOKS HMAC (Seções 6 e 9)
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Coluna Esquerda (5 cols): Simulador Mobile da Jornada do Cliente (QR Code na Porta / SuperApp) */}
        <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/90 p-4 xl:col-span-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="flex items-center gap-2 text-base font-bold text-white">
                <Smartphone className="h-4 w-4 text-amber-400" />
                Jornada do Cliente no Celular (QR Code Porta & SuperApp — Seções 2 e 6)
              </h3>
              <p className="text-xs text-slate-400">
                Simule a experiência sem atrito do cliente ao escanear o QR Code da porta: reservar ou entrar na fila
                virtual agora com CPF e consentimentos LGPD.
              </p>
            </div>
          </div>

          {/* Moldura de Smartphone Interativo */}
          <div className="mx-auto w-full max-w-sm rounded-3xl border-4 border-slate-700 bg-slate-950 p-4 shadow-2xl">
            <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-slate-800" />
            <div className="text-center">
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                QR PORTA · UTM: qr_porta_vilamariana
              </span>
              <h4 className="mt-1.5 text-base font-extrabold text-white">{db.venue.name}</h4>
              <p className="text-[11px] text-slate-400">
                Escolha sua jornada · Disponibilidade unificada em tempo real
              </p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl bg-slate-900 p-1">
              <button
                onClick={() => setMobileTab("WAITLIST")}
                className={`rounded-lg py-1.5 text-xs font-bold transition ${
                  mobileTab === "WAITLIST"
                    ? "bg-emerald-500 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Entrar na Fila Agora
              </button>
              <button
                onClick={() => setMobileTab("RESERVE")}
                className={`rounded-lg py-1.5 text-xs font-bold transition ${
                  mobileTab === "RESERVE"
                    ? "bg-amber-500 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Reservar Mesa
              </button>
            </div>

            <div className="mt-3 space-y-2.5 text-xs">
              <div>
                <label className="text-[10px] text-slate-400">CPF (Chave Única SuperApp & CRM)</label>
                <input
                  type="text"
                  value={mobCpf}
                  onChange={(e) => setMobCpf(e.target.value)}
                  className="mt-0.5 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 font-mono text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Nome Completo</label>
                <input
                  type="text"
                  value={mobName}
                  onChange={(e) => setMobName(e.target.value)}
                  className="mt-0.5 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400">WhatsApp (OTP)</label>
                  <input
                    type="text"
                    value={mobPhone}
                    onChange={(e) => setMobPhone(e.target.value)}
                    className="mt-0.5 w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Nº de Pessoas</label>
                  <select
                    value={mobSize}
                    onChange={(e) => setMobSize(Number(e.target.value))}
                    className="mt-0.5 w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                  >
                    {[1, 2, 3, 4, 6, 8, 12].map((n) => (
                      <option key={n} value={n}>
                        {n} pessoas
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {mobileTab === "RESERVE" && (
                <div>
                  <label className="text-[10px] text-slate-400">Horário Desejado Hoje</label>
                  <input
                    type="time"
                    value={mobTime}
                    onChange={(e) => setMobTime(e.target.value)}
                    className="mt-0.5 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white"
                  />
                </div>
              )}

              {/* Consentimentos Granulares LGPD no Ponto de Coleta (Seções 8 e 11) */}
              <div className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/70 p-2 text-[10px] text-slate-300">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mobConsentEnr}
                    onChange={(e) => setMobConsentEnr(e.target.checked)}
                  />
                  Aceito personalizar meu atendimento e carta de vinhos pelo CPF (Enriquecimento LGPD)
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mobConsentMkt}
                    onChange={(e) => setMobConsentMkt(e.target.checked)}
                  />
                  Aceito receber convites e ofertas via WhatsApp (Opt-in Marketing)
                </label>
              </div>

              {mobileTab === "WAITLIST" ? (
                <button
                  disabled={busy}
                  onClick={() =>
                    onAction({
                      action: "JOIN_WAITLIST",
                      cpf: mobCpf,
                      name: mobName,
                      phone: mobPhone,
                      partySize: mobSize,
                      preferredAreaId: "area-salao",
                      origin: "QR_PORTA",
                      consentMarketing: mobConsentMkt,
                      consentEnrichment: mobConsentEnr,
                    })
                  }
                  className="w-full rounded-xl bg-emerald-500 py-2.5 text-xs font-extrabold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400"
                >
                  Confirmar Entrada na Fila Virtual Agora
                </button>
              ) : (
                <button
                  disabled={busy}
                  onClick={() =>
                    onAction({
                      action: "CREATE_RESERVATION",
                      cpf: mobCpf,
                      name: mobName,
                      phone: mobPhone,
                      time: mobTime,
                      partySize: mobSize,
                      areaId: "area-salao",
                      origin: "QR_CODE",
                      consentMarketing: mobConsentMkt,
                      consentEnrichment: mobConsentEnr,
                    })
                  }
                  className="w-full rounded-xl bg-amber-500 py-2.5 text-xs font-extrabold text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400"
                >
                  Confirmar Reserva & Gerar Voucher QR
                </button>
              )}
            </div>
          </div>

          {/* Lista de QR Codes com Rastreamento UTM (Seção 6) */}
          <div className="space-y-2 border-t border-slate-800 pt-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              QR Codes Ativos & Conversão por Ponto de Colocação (UTM)
            </h4>
            {db.qrCodes.map((qr) => (
              <div
                key={qr.id}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/70 p-2.5 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <QrCode className="h-5 w-5 text-amber-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-white">{qr.title}</div>
                    <div className="font-mono text-[10px] text-slate-400">{qr.shortUrl}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-400">
                    {qr.conversionsCount} / {qr.scansCount} ({Math.round((qr.conversionsCount / qr.scansCount) * 100)}%)
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {qr.geofenceEnabled ? "Geofence Ativo" : "Aberto"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coluna Direita (7 cols): API Pública REST v1 Playground & Webhooks Assinados HMAC (Seção 9) */}
        <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/90 p-4 xl:col-span-7">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="flex items-center gap-2 text-base font-bold text-white">
                <Code2 className="h-4 w-4 text-amber-400" />
                API Pública REST <code className="text-amber-300">/v1</code> & Webhooks HMAC (Seção 9)
              </h3>
              <p className="text-xs text-slate-400">
                OAuth 2.0 · CPF nunca trafega em URL · Idempotency-Key · SLA Disponibilidade &lt; 500ms (p95)
              </p>
            </div>
            <span className="flex items-center gap-1 rounded bg-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
              <KeyRound className="h-3.5 w-3.5" /> Sandbox SDK Flutter Ready
            </span>
          </div>

          {/* Botões para Testar Endpoints Reais do Servidor */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              disabled={apiLoading}
              onClick={() =>
                runLiveApiTest(
                  `/api/v1/venues/${db.venue.id}/availability?date=${db.venue.activeDate}&party_size=4`
                )
              }
              className="flex flex-col items-start rounded-xl border border-slate-700 bg-slate-950 p-3 text-left transition hover:border-amber-400"
            >
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                GET /api/v1/venues/&#123;id&#125;/availability
              </span>
              <span className="mt-1.5 text-xs font-semibold text-white">
                Consultar Disponibilidade Hoje (c/ EPOC Live)
              </span>
            </button>

            <button
              disabled={apiLoading}
              onClick={() =>
                runLiveApiTest(
                  `/api/v1/venues/${db.venue.id}/availability?date=2026-10-24&party_size=4`
                )
              }
              className="flex flex-col items-start rounded-xl border border-slate-700 bg-slate-950 p-3 text-left transition hover:border-amber-400"
            >
              <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-cyan-300">
                GET /availability?date=2026-10-24
              </span>
              <span className="mt-1.5 text-xs font-semibold text-white">
                Data Futura (Só Planta + Reservas, s/ EPOC)
              </span>
            </button>

            <button
              disabled={apiLoading}
              onClick={() =>
                runLiveApiTest(`/api/v1/guests/${db.guests[0].id}/enrichment`, "GET")
              }
              className="flex flex-col items-start rounded-xl border border-slate-700 bg-slate-950 p-3 text-left transition hover:border-amber-400"
            >
              <span className="rounded bg-purple-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-purple-300">
                GET /api/v1/guests/&#123;id&#125;/enrichment
              </span>
              <span className="mt-1.5 text-xs font-semibold text-white">
                Consultar Cluster, SalesBox & IA Garçom
              </span>
            </button>
          </div>

          {apiResponseJson && (
            <div className="rounded-xl border border-slate-700 bg-slate-950 p-3">
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-mono text-emerald-400">HTTP 200 OK — Resposta Real da API Next.js</span>
                <button
                  onClick={() => setApiResponseJson("")}
                  className="text-slate-400 hover:text-white"
                >
                  Limpar
                </button>
              </div>
              <pre className="max-h-56 overflow-y-auto font-mono text-[11px] text-amber-200">
                {apiResponseJson}
              </pre>
            </div>
          )}

          {/* Lista de Eventos de Webhook Emitidos em Tempo Real com Assinatura HMAC */}
          <div className="border-t border-slate-800 pt-3">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Fila de Eventos de Webhook em Tempo Real (Assinados com HMAC-SHA256)
              </span>
              <span className="text-[11px] text-slate-400">
                {db.webhooks.length} eventos disparados
              </span>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {db.webhooks.map((wh) => (
                <div
                  key={wh.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-xs font-bold text-amber-300">
                        {wh.event}
                      </span>
                      <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300">
                        HTTP {wh.statusCode} ({wh.latencyMs}ms)
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">
                      X-Hub-Signature: {wh.hmacSignature.slice(0, 26)}...
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                    <ExternalLink className="h-3 w-3" />
                    <span>Destino: {wh.targetUrl}</span>
                  </div>
                  <pre className="mt-2 overflow-x-auto rounded bg-slate-900 p-2 font-mono text-[10px] text-slate-300">
                    {JSON.stringify(wh.payload, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
