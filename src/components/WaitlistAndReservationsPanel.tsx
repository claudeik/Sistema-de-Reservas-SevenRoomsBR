"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  MessageSquare,
  PlusCircle,
  QrCode,
  Send,
  ShieldAlert,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { DatabaseState, PartyBracket, ReservationOrigin } from "@/types/domain";
import { formatCpf, validateCpfMod11 } from "@/lib/cpf-utils";

interface WaitlistAndReservationsPanelProps {
  db: DatabaseState;
  onAction: (payload: Record<string, unknown>) => Promise<void>;
  onInspectGuest: (guestId: string) => void;
  busy: boolean;
}

export default function WaitlistAndReservationsPanel({
  db,
  onAction,
  onInspectGuest,
  busy,
}: WaitlistAndReservationsPanelProps) {
  // Leitor de QR Code de Reserva (Voucher Assinado de Uso Único)
  const [qrInputToken, setQrInputToken] = useState("QRV-NB-2030-MARIANA");

  // Formulário Nova Reserva
  const [resName, setResName] = useState("");
  const [resCpf, setResCpf] = useState("");
  const [resPhone, setResPhone] = useState("+55 11 9");
  const [resTime, setResTime] = useState("21:00");
  const [resPartySize, setResPartySize] = useState(4);
  const [resAreaId, setResAreaId] = useState("area-salao");
  const [resOrigin, setResOrigin] = useState<ReservationOrigin>("SUPERAPP");
  const [resNotes, setResNotes] = useState("");
  const [resAllergy, setResAllergy] = useState("");

  // Formulário Entrada na Fila Virtual
  const [wlName, setWlName] = useState("");
  const [wlCpf, setWlCpf] = useState("");
  const [wlPhone, setWlPhone] = useState("+55 11 9");
  const [wlPartySize, setWlPartySize] = useState(2);
  const [wlAreaId, setWlAreaId] = useState("area-salao");
  const [wlVip, setWlVip] = useState(false);
  const [wlAccessibility, setWlAccessibility] = useState(false);

  const [bracketTab, setBracketTab] = useState<PartyBracket | "ALL">("ALL");

  const filteredWaitlist = db.waitlist.filter(
    (w) => bracketTab === "ALL" || w.bracket === bracketTab
  );

  const cpfValidation = resCpf ? validateCpfMod11(resCpf) : null;

  return (
    <div className="space-y-6">
      {/* Topo: Leitor de Check-in por QR Code (Voucher Assinado de Uso Único) & Política de Overbooking/No-show */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-slate-900 to-amber-950/25 p-4 lg:col-span-7">
          <div className="flex items-center gap-2 text-amber-300">
            <QrCode className="h-5 w-5" />
            <h3 className="text-sm font-bold uppercase tracking-wider">
              Leitor de Check-in QR Code (Voucher de Uso Único — Seção 6)
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-300">
            Escaneie ou valide o token do voucher da reserva. O voucher é assinado, expira após o uso e atualiza o
            status da reserva para <strong>ARRIVED (Laranja no mapa)</strong> imediatamente.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={qrInputToken}
              onChange={(e) => setQrInputToken(e.target.value)}
              placeholder="Ex: QRV-NB-2030-MARIANA"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-amber-200"
            />
            <button
              disabled={busy || !qrInputToken}
              onClick={() =>
                onAction({
                  action: "TRANSITION_RESERVATION",
                  qrVoucherToken: qrInputToken,
                  nextStatus: "ARRIVED",
                  actor: "Leitor QR Host Tablet",
                  channel: "QR_VOUCHER_SCANNER",
                })
              }
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
            >
              <CheckCircle2 className="h-4 w-4" />
              Validar Check-in QR
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-400">
            <span>Vouchers ativos para testar:</span>
            {db.reservations.map((r) => (
              <button
                key={r.id}
                onClick={() => setQrInputToken(r.qrVoucherToken)}
                className="rounded border border-slate-700 bg-slate-800/80 px-2 py-0.5 font-mono text-[10px] text-amber-300 hover:bg-slate-700"
              >
                {r.qrVoucherToken} ({r.status})
              </button>
            ))}
          </div>
        </div>

        {/* Painel de Regras de Overbooking & Política de No-Show (Seção 4) */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 lg:col-span-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Política de Overbooking & No-Show Ativa
            </span>
            <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
              Teto Seguro: +{db.venue.overbookingPercent}% ({db.venue.overbookingMaxSeats} lugares)
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2.5">
              <div className="text-[10px] text-slate-400">Tolerância</div>
              <div className="mt-0.5 text-sm font-bold text-white">
                {db.venue.toleranceMinutes} min
              </div>
              <div className="text-[10px] text-slate-500">Libera p/ Fila</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2.5">
              <div className="text-[10px] text-slate-400">Bloqueio Auto</div>
              <div className="mt-0.5 text-sm font-bold text-amber-300">3 No-shows</div>
              <div className="text-[10px] text-slate-500">Exige Depósito</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2.5">
              <div className="text-[10px] text-slate-400">Anti-Duplicidade</div>
              <div className="mt-0.5 text-sm font-bold text-emerald-300">1 / CPF / Dia</div>
              <div className="text-[10px] text-slate-500">HTTP 422</div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Módulo de Reservas (Esquerda) e Fila Virtual ao Vivo (Direita) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* MÓDULO DE RESERVAS (7 Colunas) */}
        <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/90 p-4 xl:col-span-7">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="flex items-center gap-2 text-base font-bold text-white">
                <Calendar className="h-4 w-4 text-amber-400" />
                Módulo de Reservas & Máquina de Estados (Seção 4)
              </h3>
              <p className="text-xs text-slate-400">
                Solicitada → Confirmada → Reconfirmada → Chegou (Check-in) → Sentada (EPOC) → Finalizada
              </p>
            </div>
            <span className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
              {db.reservations.length} reservas no turno
            </span>
          </div>

          {/* Formulário para Criar Reserva (Testa Online vs Manual, CPF e Idempotência) */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300">
                + Nova Reserva (Atribuição Automática de Melhor Mesa + Enriquecimento CPF)
              </span>
              {cpfValidation && (
                <span
                  className={`text-[10px] font-semibold ${
                    cpfValidation.valid ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {cpfValidation.valid
                    ? `CPF válido (${formatCpf(resCpf)})`
                    : "Digite 11 dígitos de CPF"}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <input
                type="text"
                placeholder="Nome completo do cliente"
                value={resName}
                onChange={(e) => setResName(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
              />
              <input
                type="text"
                placeholder="CPF (11 dígitos - chave única)"
                value={resCpf}
                onChange={(e) => setResCpf(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-xs text-white"
              />
              <input
                type="text"
                placeholder="Celular WhatsApp"
                value={resPhone}
                onChange={(e) => setResPhone(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
              />
              <div className="flex gap-2">
                <input
                  type="time"
                  value={resTime}
                  onChange={(e) => setResTime(e.target.value)}
                  className="w-1/2 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                />
                <select
                  value={resPartySize}
                  onChange={(e) => setResPartySize(Number(e.target.value))}
                  className="w-1/2 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white"
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "pessoa" : "pessoas"}
                    </option>
                  ))}
                </select>
              </div>
              <select
                value={resAreaId}
                onChange={(e) => setResAreaId(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
              >
                {db.areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <select
                value={resOrigin}
                onChange={(e) => setResOrigin(e.target.value as ReservationOrigin)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
              >
                <option value="SUPERAPP">SuperApp (Amarelo Online)</option>
                <option value="QR_CODE">QR Code Porta (Amarelo Online)</option>
                <option value="LINKBIO">Linkbio Instagram (Amarelo Online)</option>
                <option value="TELEFONE">Telefone Concierge (Roxo Manual)</option>
                <option value="BALCAO">Balcão Host (Roxo Manual)</option>
                <option value="WHATSAPP">WhatsApp Manual (Roxo Manual)</option>
              </select>
              <input
                type="text"
                placeholder="Alergias (ex: Camarão, Glúten)"
                value={resAllergy}
                onChange={(e) => setResAllergy(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
              />
              <input
                type="text"
                placeholder="Notas (Aniversário, Cadeira de bebê...)"
                value={resNotes}
                onChange={(e) => setResNotes(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
              />
              <button
                disabled={busy || !resName || !resCpf}
                onClick={() => {
                  onAction({
                    action: "CREATE_RESERVATION",
                    name: resName,
                    cpf: resCpf,
                    phone: resPhone,
                    time: resTime,
                    partySize: resPartySize,
                    areaId: resAreaId,
                    origin: resOrigin,
                    notes: resNotes,
                    allergies: resAllergy ? [resAllergy] : [],
                    tags: resNotes ? ["Nota Especial"] : [],
                  });
                  setResName("");
                  setResCpf("");
                  setResNotes("");
                  setResAllergy("");
                }}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-40"
              >
                <PlusCircle className="h-4 w-4" />
                Criar Reserva
              </button>
            </div>
          </div>

          {/* Lista Detalhada de Reservas e Ações de Transição de Estado */}
          <div className="space-y-3">
            {db.reservations.map((r) => {
              const table = db.tables.find((t) => t.id === r.tableId);
              const area = db.areas.find((a) => a.id === r.areaId);
              return (
                <div
                  key={r.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 transition hover:border-slate-700"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onInspectGuest(r.guestId)}
                          className="text-sm font-bold text-white hover:text-amber-300 underline decoration-slate-600"
                        >
                          {r.guestName}
                        </button>
                        <span className="font-mono text-xs text-slate-400">{r.guestCpfMasked}</span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            r.status === "SEATED"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : r.status === "RECONFIRMED" || r.status === "ARRIVED"
                                ? "bg-orange-500/20 text-orange-300 border border-orange-500/40"
                                : r.status === "NO_SHOW" || r.status === "CANCELLED"
                                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                  : r.isManual
                                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                                    : "bg-yellow-500/20 text-yellow-300 border border-yellow-500/40"
                          }`}
                        >
                          {r.status} ({r.isManual ? "Roxo Manual" : "Amarelo Online"})
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-300">
                        Horário: <strong>{r.time}</strong> · <strong>{r.partySize} pessoas</strong> (Faixa{" "}
                        {r.bracket}) · Ambiente: <strong>{area?.name}</strong> · Mesa:{" "}
                        <strong className="text-amber-300">
                          {table ? `Mesa ${table.number} (${table.epocTableId})` : "Sem mesa fixa"}
                        </strong>
                      </p>
                      {r.notes && (
                        <p className="mt-1 text-xs italic text-slate-400">
                          &ldquo;{r.notes}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="text-right text-[11px]">
                      <div className="font-mono text-amber-300">{r.qrVoucherToken}</div>
                      <div className="text-slate-400">Origem: {r.origin}</div>
                      {r.depositAmount > 0 && (
                        <div className="text-emerald-400 font-semibold">
                          Depósito: R$ {r.depositAmount} ({r.depositStatus})
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Barra de Ações da Máquina de Estados */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5">
                    <div className="flex flex-wrap gap-1.5 text-[10px] text-slate-400">
                      {r.history.map((h, i) => (
                        <span key={i} className="rounded bg-slate-900 px-2 py-0.5">
                          {h.status} às {h.at} ({h.channel})
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {r.status === "CONFIRMED" && (
                        <button
                          disabled={busy}
                          onClick={() =>
                            onAction({
                              action: "TRANSITION_RESERVATION",
                              reservationId: r.id,
                              nextStatus: "RECONFIRMED",
                              actor: "Cliente (WhatsApp Bot)",
                              channel: "WHATSAPP",
                            })
                          }
                          className="rounded border border-orange-500/40 bg-orange-500/15 px-2.5 py-1 text-[11px] font-semibold text-orange-200 hover:bg-orange-500/25"
                        >
                          Reconfirmar (Laranja)
                        </button>
                      )}
                      {["CONFIRMED", "RECONFIRMED"].includes(r.status) && (
                        <button
                          disabled={busy}
                          onClick={() =>
                            onAction({
                              action: "TRANSITION_RESERVATION",
                              reservationId: r.id,
                              nextStatus: "ARRIVED",
                              actor: "Host Recepção",
                              channel: "QR_CHECKIN",
                            })
                          }
                          className="rounded border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/25"
                        >
                          Check-in Chegou
                        </button>
                      )}
                      {["CONFIRMED", "RECONFIRMED", "ARRIVED"].includes(r.status) && table && (
                        <button
                          disabled={busy}
                          onClick={() =>
                            onAction({
                              action: "SEAT_PARTY",
                              tableId: table.id,
                              reservationId: r.id,
                            })
                          }
                          className="flex items-center gap-1 rounded bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-slate-950 hover:bg-emerald-400"
                        >
                          <UserCheck className="h-3.5 w-3.5" /> Sentar na M{table.number} (EPOC)
                        </button>
                      )}
                      {["CONFIRMED", "RECONFIRMED"].includes(r.status) && (
                        <button
                          disabled={busy}
                          onClick={() =>
                            onAction({
                              action: "TRANSITION_RESERVATION",
                              reservationId: r.id,
                              nextStatus: "NO_SHOW",
                              actor: "Motor de Tolerância (15m)",
                              channel: "AUTO_POLICY",
                            })
                          }
                          className="flex items-center gap-1 rounded border border-rose-500/40 bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/25"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Marcar No-Show (Libera Mesa)
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* MÓDULO DE FILA VIRTUAL AO VIVO (5 Colunas — Seção 5) */}
        <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/90 p-4 xl:col-span-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="flex items-center gap-2 text-base font-bold text-white">
                <Users className="h-4 w-4 text-emerald-400" />
                Fila Virtual Inteligente ao Vivo (Seção 5)
              </h3>
              <p className="text-xs text-slate-400">
                Dividida por faixa (1–2, 2–4, 5–10, 12+) com previsão alimentada pelo giro do EPOC
              </p>
            </div>
          </div>

          {/* Formulário rápido para incluir cliente na Fila Virtual */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
            <span className="text-xs font-bold text-emerald-300">
              + Incluir Grupo na Fila Virtual (QR Porta / SuperApp / Host)
            </span>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="text"
                placeholder="Nome do cliente"
                value={wlName}
                onChange={(e) => setWlName(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
              />
              <input
                type="text"
                placeholder="CPF (11 dígitos)"
                value={wlCpf}
                onChange={(e) => setWlCpf(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-xs text-white"
              />
              <input
                type="text"
                placeholder="Celular WhatsApp"
                value={wlPhone}
                onChange={(e) => setWlPhone(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
              />
              <div className="flex gap-2">
                <select
                  value={wlPartySize}
                  onChange={(e) => setWlPartySize(Number(e.target.value))}
                  className="w-1/2 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white"
                >
                  {[1, 2, 3, 4, 6, 8, 12].map((n) => (
                    <option key={n} value={n}>
                      {n} pessoas
                    </option>
                  ))}
                </select>
                <select
                  value={wlAreaId}
                  onChange={(e) => setWlAreaId(e.target.value)}
                  className="w-1/2 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white"
                >
                  {db.areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wlVip}
                    onChange={(e) => setWlVip(e.target.checked)}
                    className="rounded border-slate-600"
                  />
                  Prioridade VIP (Grava Log)
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wlAccessibility}
                    onChange={(e) => setWlAccessibility(e.target.checked)}
                    className="rounded border-slate-600"
                  />
                  Acessibilidade
                </label>
              </div>
              <button
                disabled={busy || !wlName || !wlCpf}
                onClick={() => {
                  onAction({
                    action: "JOIN_WAITLIST",
                    name: wlName,
                    cpf: wlCpf,
                    phone: wlPhone,
                    partySize: wlPartySize,
                    preferredAreaId: wlAreaId,
                    isPriorityVip: wlVip,
                    needsAccessibility: wlAccessibility,
                    origin: "HOST",
                  });
                  setWlName("");
                  setWlCpf("");
                }}
                className="rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-40"
              >
                Entrar na Fila
              </button>
            </div>
          </div>

          {/* Abas por Faixa de Grupo */}
          <div className="flex items-center gap-1.5">
            {(["ALL", "1-2", "2-4", "5-10", "12+"] as const).map((br) => (
              <button
                key={br}
                onClick={() => setBracketTab(br)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  bracketTab === br
                    ? "bg-emerald-500 text-slate-950"
                    : "border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800"
                }`}
              >
                {br === "ALL" ? "Todas Faixas" : `Faixa ${br}p`}
              </button>
            ))}
          </div>

          {/* Cartões da Fila Virtual com Simulador de Chamada WhatsApp e Resposta do Cliente */}
          <div className="space-y-3">
            {filteredWaitlist.map((w) => {
              const sugTable = db.tables.find((t) => t.id === w.suggestedTableId);
              return (
                <div
                  key={w.id}
                  className={`rounded-xl border p-3.5 ${
                    w.status === "CALLED"
                      ? "border-emerald-500/60 bg-emerald-950/20"
                      : "border-slate-800 bg-slate-950/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-xs font-bold text-amber-300">
                          #{w.positionInBracket} ({w.bracket}p)
                        </span>
                        <button
                          onClick={() => onInspectGuest(w.guestId)}
                          className="text-sm font-bold text-white hover:text-amber-300 underline"
                        >
                          {w.guestName}
                        </button>
                        {w.isPriorityVip && (
                          <span className="rounded bg-amber-500/25 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                            PRIORIDADE VIP
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-300">
                        <strong>{w.partySize} pessoas</strong> · Origem: {w.origin} · Espera estimada:{" "}
                        <strong className="text-emerald-300">~{w.estimatedWaitMins} min</strong>
                      </p>
                      {sugTable && (
                        <p className="mt-0.5 text-[11px] text-amber-300">
                          Sugestão automática de mesa: <strong>Mesa {sugTable.number}</strong> (
                          {sugTable.epocStatus === "CLOSING"
                            ? "Em fechamento no EPOC — libera em ~5 min"
                            : sugTable.epocStatus === "FREE"
                              ? "Livre agora no EPOC!"
                              : sugTable.epocStatus}
                          )
                        </p>
                      )}
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        w.status === "CALLED"
                          ? "bg-emerald-500/30 text-emerald-200 animate-pulse"
                          : w.status === "SEATED"
                            ? "bg-sky-500/30 text-sky-200"
                            : w.status === "ABANDONED"
                              ? "bg-rose-500/30 text-rose-200"
                              : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {w.status}
                    </span>
                  </div>

                  {/* Ações do Host e Simulação dos 3 Botões do Cliente no WhatsApp/App */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      {w.status === "WAITING" && (
                        <button
                          disabled={busy}
                          onClick={() =>
                            onAction({
                              action: "CALL_WAITLIST",
                              waitlistId: w.id,
                              suggestedTableId: w.suggestedTableId,
                            })
                          }
                          className="flex items-center gap-1 rounded bg-amber-500 px-2.5 py-1 text-xs font-bold text-slate-950 hover:bg-amber-400"
                        >
                          <Send className="h-3 w-3" /> Chamar via WhatsApp/Push (Prazo 5 min)
                        </button>
                      )}

                      {sugTable && sugTable.epocStatus === "FREE" && w.status !== "SEATED" && (
                        <button
                          disabled={busy}
                          onClick={() =>
                            onAction({
                              action: "SEAT_PARTY",
                              tableId: sugTable.id,
                              waitlistId: w.id,
                            })
                          }
                          className="flex items-center gap-1 rounded bg-emerald-500 px-2.5 py-1 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                        >
                          <UserCheck className="h-3.5 w-3.5" /> Sentar na M{sugTable.number} (Abre EPOC)
                        </button>
                      )}
                    </div>

                    {/* Botões que o cliente vê no WhatsApp / SuperApp (Seção 5 Regra 4) */}
                    {(w.status === "CALLED" || w.status === "WAITING") && (
                      <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1">
                        <span className="px-1.5 text-[10px] text-slate-400">
                          <MessageSquare className="inline h-3 w-3 mr-1 text-emerald-400" />
                          Simular resposta cliente:
                        </span>
                        <button
                          disabled={busy}
                          onClick={() =>
                            onAction({
                              action: "RESPOND_WAITLIST",
                              waitlistId: w.id,
                              responseAction: "COMING",
                            })
                          }
                          className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/30"
                        >
                          Estou indo
                        </button>
                        <button
                          disabled={busy}
                          onClick={() =>
                            onAction({
                              action: "RESPOND_WAITLIST",
                              waitlistId: w.id,
                              responseAction: "PASS_TURN",
                            })
                          }
                          className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300 hover:bg-amber-500/30"
                        >
                          Passar a vez
                        </button>
                        <button
                          disabled={busy}
                          onClick={() =>
                            onAction({
                              action: "RESPOND_WAITLIST",
                              waitlistId: w.id,
                              responseAction: "LEAVE",
                            })
                          }
                          className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-300 hover:bg-rose-500/30"
                        >
                          Sair da fila
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
