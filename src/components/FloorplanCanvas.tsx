"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  Edit3,
  Link2,
  Lock,
  Plus,
  RefreshCw,
  Sparkles,
  Split,
  Unlock,
  UserCheck,
  Users,
  Utensils,
  Wine,
  WifiOff,
} from "lucide-react";
import {
  DatabaseState,
  PartyBracket,
  Reservation,
  TableNode,
  TableVisualState,
  WaitlistEntry,
} from "@/types/domain";
import { computeTableVisualState } from "@/lib/floorplan-utils";

interface FloorplanCanvasProps {
  db: DatabaseState;
  selectedAreaId: string;
  onSelectArea: (areaId: string) => void;
  selectedTableId: string | null;
  onSelectTable: (tableId: string) => void;
  onAction: (payload: Record<string, unknown>) => Promise<void>;
  onInspectGuest: (guestId: string) => void;
  busy: boolean;
}

const VISUAL_STATE_META: Record<
  TableVisualState,
  {
    label: string;
    bgClass: string;
    borderClass: string;
    badgeClass: string;
    dotColor: string;
  }
> = {
  AVAILABLE: {
    label: "Disponível (EPOC Livre)",
    bgClass: "bg-slate-800/90 hover:bg-slate-700/90 text-slate-100",
    borderClass: "border-slate-500/80",
    badgeClass: "bg-slate-700 text-slate-200",
    dotColor: "bg-slate-400",
  },
  RESERVED_ONLINE: {
    label: "Reserva Online",
    bgClass: "bg-amber-500/20 hover:bg-amber-500/30 text-amber-100",
    borderClass: "border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.2)]",
    badgeClass: "bg-yellow-500/30 text-yellow-200 border border-yellow-400/40",
    dotColor: "bg-yellow-400",
  },
  RESERVED_MANUAL: {
    label: "Reserva Manual",
    bgClass: "bg-purple-600/25 hover:bg-purple-600/35 text-purple-100",
    borderClass: "border-purple-400 shadow-[0_0_15px_rgba(192,132,252,0.2)]",
    badgeClass: "bg-purple-500/30 text-purple-200 border border-purple-400/40",
    dotColor: "bg-purple-400",
  },
  RESERVED_CONFIRMED: {
    label: "Reserva Confirmada",
    bgClass: "bg-orange-500/25 hover:bg-orange-500/35 text-orange-100",
    borderClass: "border-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.25)]",
    badgeClass: "bg-orange-500/30 text-orange-200 border border-orange-400/40",
    dotColor: "bg-orange-400",
  },
  SEATED: {
    label: "Sentados (EPOC Aberta)",
    bgClass: "bg-emerald-600/25 hover:bg-emerald-600/35 text-emerald-50",
    borderClass: "border-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.28)]",
    badgeClass: "bg-emerald-500/30 text-emerald-200 border border-emerald-400/40",
    dotColor: "bg-emerald-400",
  },
  CLOSING: {
    label: "Em Fechamento (EPOC Conta)",
    bgClass: "bg-amber-600/30 hover:bg-amber-600/40 text-amber-50 animate-pulse",
    borderClass: "border-amber-300 shadow-[0_0_20px_rgba(252,211,77,0.35)]",
    badgeClass: "bg-amber-400/30 text-amber-100 border border-amber-300/50",
    dotColor: "bg-amber-300",
  },
  OCCUPIED_WALKIN: {
    label: "Ocupada s/ Reserva (EPOC)",
    bgClass: "bg-cyan-600/25 hover:bg-cyan-600/35 text-cyan-50",
    borderClass: "border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.25)]",
    badgeClass: "bg-cyan-500/30 text-cyan-200 border border-cyan-400/40",
    dotColor: "bg-cyan-400",
  },
  LOCKED: {
    label: "Travada (Cadeado)",
    bgClass: "bg-rose-900/40 hover:bg-rose-900/55 text-rose-100",
    borderClass: "border-rose-500 shadow-[0_0_14px_rgba(244,63,94,0.25)]",
    badgeClass: "bg-rose-500/30 text-rose-200 border border-rose-400/40",
    dotColor: "bg-rose-500",
  },
  STALE: {
    label: "Desatualizada (>30s s/ EPOC)",
    bgClass: "bg-stale-hatched text-slate-200",
    borderClass: "border-dashed border-slate-400",
    badgeClass: "bg-slate-700 text-slate-300 border border-slate-500",
    dotColor: "bg-slate-400",
  },
};

export default function FloorplanCanvas({
  db,
  selectedAreaId,
  onSelectArea,
  selectedTableId,
  onSelectTable,
  onAction,
  onInspectGuest,
  busy,
}: FloorplanCanvasProps) {
  const [editorMode, setEditorMode] = useState(false);
  const [bracketFilter, setBracketFilter] = useState<PartyBracket | "ALL">("ALL");
  const [mergeTargetId, setMergeTargetId] = useState<string>("");
  const [draggedPayload, setDraggedPayload] = useState<{
    type: "RESERVATION" | "WAITLIST";
    id: string;
    name: string;
    partySize: number;
  } | null>(null);

  // Novo formulário rápido para criar mesa no editor
  const [newTableNumber, setNewTableNumber] = useState("");
  const [newTableMaxCap, setNewTableMaxCap] = useState(4);
  const [newTableShape, setNewTableShape] = useState<"square" | "round" | "rectangle" | "booth">("round");

  const visibleTables = db.tables.filter((t) => {
    if (t.parentMergedIntoId) return false;
    const areaMatch = selectedAreaId === "ALL" || t.areaId === selectedAreaId;
    const bracketMatch = bracketFilter === "ALL" || t.bracket === bracketFilter;
    return areaMatch && bracketMatch;
  });

  const allActiveTables = db.tables.filter((t) => !t.parentMergedIntoId);
  const currentArea =
    db.areas.find((a) => a.id === selectedAreaId) || db.areas[0];

  // Contadores operacionais por estado
  const counts = allActiveTables.reduce(
    (acc, t) => {
      const st = computeTableVisualState(t, db.reservations, db.venue);
      acc.total += 1;
      if (st === "AVAILABLE") acc.available += 1;
      else if (st === "LOCKED") acc.locked += 1;
      else if (st === "SEATED" || st === "CLOSING" || st === "OCCUPIED_WALKIN") acc.occupied += 1;
      else if (
        st === "RESERVED_ONLINE" ||
        st === "RESERVED_MANUAL" ||
        st === "RESERVED_CONFIRMED"
      )
        acc.reserved += 1;
      return acc;
    },
    { total: 0, available: 0, reserved: 0, occupied: 0, locked: 0 }
  );

  const selectedTable: TableNode | undefined =
    db.tables.find((t) => t.id === selectedTableId) || visibleTables[0];

  const selectedTableState = selectedTable
    ? computeTableVisualState(selectedTable, db.reservations, db.venue)
    : "AVAILABLE";

  const selectedTableReservation: Reservation | undefined = selectedTable
    ? db.reservations.find(
        (r) =>
          (r.id === selectedTable.currentReservationId || r.tableId === selectedTable.id) &&
          !["CANCELLED", "NO_SHOW", "EXPIRED", "FINISHED"].includes(r.status)
      )
    : undefined;

  const selectedTableWaitlist: WaitlistEntry | undefined = selectedTable
    ? db.waitlist.find((w) => w.id === selectedTable.currentWaitlistId)
    : undefined;

  const selectedTableOrder = selectedTable?.currentOrderId
    ? db.epocOrders.find((o) => o.id === selectedTable.currentOrderId)
    : undefined;

  const selectedGuest =
    db.guests.find((g) => g.id === selectedTableReservation?.guestId) ||
    db.guests.find((g) => g.id === selectedTableWaitlist?.guestId) ||
    (selectedTableOrder?.guestCpf
      ? db.guests.find((g) => g.cpf === selectedTableOrder.guestCpf)
      : undefined);

  // Calcula tempo sentado em minutos
  const getSeatedMinutes = (table: TableNode) => {
    if (!table.seatedAt) return 0;
    const diff = Date.now() - new Date(table.seatedAt).getTime();
    return Math.max(1, Math.floor(diff / 60000));
  };

  // Reservas e Fila prontas para alocação rápida por Drag & Drop na barra lateral esquerda do mapa
  const readyReservations = db.reservations.filter((r) =>
    ["CONFIRMED", "RECONFIRMED", "ARRIVED"].includes(r.status)
  );
  const readyWaitlist = db.waitlist.filter((w) =>
    ["WAITING", "CALLED"].includes(w.status)
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Barra Superior de Contadores & Legenda Oficial Dguests + EPOC */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 shadow-lg">
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs">
            <span className="text-slate-400">Total Mesas:</span>{" "}
            <strong className="text-sm text-white">{counts.total}</strong>
          </div>
          <div className="rounded-lg border border-slate-600/50 bg-slate-800/50 px-3 py-1.5 text-xs">
            <span className="inline-block h-2 w-2 rounded-full bg-slate-400 mr-1.5" />
            <span className="text-slate-300">Disponíveis:</span>{" "}
            <strong className="text-sm text-white">{counts.available}</strong>
          </div>
          <div className="rounded-lg border border-orange-500/30 bg-orange-950/30 px-3 py-1.5 text-xs">
            <span className="inline-block h-2 w-2 rounded-full bg-orange-400 mr-1.5" />
            <span className="text-orange-200">Reservadas:</span>{" "}
            <strong className="text-sm text-orange-300">{counts.reserved}</strong>
          </div>
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-1.5 text-xs">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 mr-1.5" />
            <span className="text-emerald-200">Ocupadas (EPOC):</span>{" "}
            <strong className="text-sm text-emerald-300">{counts.occupied}</strong>
          </div>
          <div className="rounded-lg border border-rose-500/30 bg-rose-950/30 px-3 py-1.5 text-xs">
            <span className="inline-block h-2 w-2 rounded-full bg-rose-500 mr-1.5" />
            <span className="text-rose-200">Travadas:</span>{" "}
            <strong className="text-sm text-rose-300">{counts.locked}</strong>
          </div>
        </div>

        {/* Legenda de Cores Dguests + EPOC */}
        <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-300">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-slate-500" /> Cinza: Disponível
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-yellow-400" /> Amarelo: Online
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-purple-400" /> Roxo: Manual
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-orange-400" /> Laranja: Confirmada
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" /> Verde: Sentados
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-300" /> Em Fechamento
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-cyan-400" /> Walk-in EPOC
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" /> Travada
          </span>
        </div>
      </div>

      {/* Abas de Ambientes (Dguests Baseline: Salão Principal, Varanda Social, Lounge 88, Terraço Sunset, Mezanino) + Controles */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {db.areas.map((area) => {
            const active = selectedAreaId === area.id;
            const areaTables = allActiveTables.filter((t) => t.areaId === area.id);
            const occupiedInArea = areaTables.filter((t) =>
              ["OPEN", "CLOSING"].includes(t.epocStatus)
            ).length;
            return (
              <button
                key={area.id}
                onClick={() => onSelectArea(area.id)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition ${
                  active
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                    : "border border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:bg-slate-800"
                }`}
              >
                <span>{area.name}</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] ${
                    active ? "bg-slate-950/20 text-slate-950 font-bold" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {occupiedInArea}/{areaTables.length} mesas · máx {area.maxCapacity}p
                </span>
              </button>
            );
          })}
          <button
            onClick={() => onSelectArea("ALL")}
            className={`rounded-lg px-3.5 py-2 text-xs font-medium transition ${
              selectedAreaId === "ALL"
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
            }`}
          >
            Todos os Ambientes ({allActiveTables.length})
          </button>
        </div>

        {/* Filtro por Faixa de Capacidade & Modo Editor */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900 p-1 text-xs">
            <span className="px-2 text-slate-400">Faixa:</span>
            {(["ALL", "1-2", "2-4", "5-10", "12+"] as const).map((br) => (
              <button
                key={br}
                onClick={() => setBracketFilter(br)}
                className={`rounded px-2 py-1 text-xs font-medium transition ${
                  bracketFilter === br
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {br === "ALL" ? "Todas" : `${br}p`}
              </button>
            ))}
          </div>

          <button
            onClick={() => setEditorMode(!editorMode)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
              editorMode
                ? "border-indigo-400 bg-indigo-500/20 text-indigo-200"
                : "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
            }`}
          >
            <Edit3 className="h-3.5 w-3.5" />
            {editorMode ? "Sair do Editor de Planta" : "Editor de Planta (Metros / Junção)"}
          </button>
        </div>
      </div>

      {/* Aviso se o EPOC estiver em Modo Degradado Offline */}
      {db.venue.epocConnectionMode === "DEGRADED_OFFLINE" && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/50 bg-amber-950/40 px-4 py-3 text-xs text-amber-200">
          <div className="flex items-center gap-2.5">
            <WifiOff className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              <strong>MODO DEGRADADO ATIVO (EPOC sem resposta &gt; 30s):</strong> As mesas estão exibidas em{" "}
              <span className="underline">cinza hachurado (Desatualizadas)</span>. O Host pode continuar sentando
              manualmente; o EPOC Adapter reconciliará todas as comandas assim que a conexão voltar.
            </span>
          </div>
          <button
            onClick={() => onAction({ action: "EPOC_SET_CONNECTION_MODE", mode: "ONLINE_WEBHOOK" })}
            className="rounded-lg bg-amber-400 px-3 py-1.5 font-semibold text-slate-950 hover:bg-amber-300"
          >
            Restaurar EPOC Online & Reconciliar
          </button>
        </div>
      )}

      {/* Grid Principal: Coluna Esquerda (Arrastar Reserva/Fila) + Centro (Mapa de Chão Interativo) + Direita (Cartão da Mesa, IA Garçom & Comanda EPOC) */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Coluna 1 (3 cols): Fila & Reservas para Arrastar e Sentar */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 xl:col-span-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Alocação Rápida (Host)
              </h3>
              <p className="text-[11px] text-slate-400">
                Arraste sobre uma mesa livre ou clique em &ldquo;Sentar no EPOC&rdquo;
              </p>
            </div>
            <Users className="h-4 w-4 text-slate-400" />
          </div>

          {/* Lista de Fila Virtual Aguardando */}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>Fila Virtual ao Vivo ({readyWaitlist.length})</span>
              <span className="text-[10px] text-emerald-400">Prioridade c/ Check-in</span>
            </div>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {readyWaitlist.length === 0 ? (
                <p className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-2.5 text-center text-xs text-slate-500">
                  Nenhum grupo aguardando na fila.
                </p>
              ) : (
                readyWaitlist.map((w) => {
                  const sugTable = db.tables.find((t) => t.id === w.suggestedTableId);
                  return (
                    <div
                      key={w.id}
                      draggable
                      onDragStart={() =>
                        setDraggedPayload({
                          type: "WAITLIST",
                          id: w.id,
                          name: w.guestName,
                          partySize: w.partySize,
                        })
                      }
                      onDragEnd={() => setDraggedPayload(null)}
                      className="cursor-grab active:cursor-grabbing rounded-lg border border-slate-700/80 bg-slate-800/70 p-2.5 transition hover:border-amber-500/60"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs text-white">{w.guestName}</span>
                            {w.isPriorityVip && (
                              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                                VIP
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400">
                            {w.partySize} pessoas (Faixa {w.bracket}) · Espera ~{w.estimatedWaitMins} min
                          </p>
                        </div>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            w.status === "CALLED"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : "bg-slate-700 text-slate-300"
                          }`}
                        >
                          {w.status === "CALLED" ? "CHAMADO" : `#${w.positionInBracket}`}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-1.5">
                        {sugTable ? (
                          <span className="text-[10px] text-amber-300">
                            Sugestão IA: <strong>Mesa {sugTable.number}</strong>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Aguardando giro</span>
                        )}
                        <div className="flex items-center gap-1">
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
                              className="rounded bg-slate-700 px-2 py-1 text-[10px] font-medium text-slate-200 hover:bg-slate-600"
                            >
                              Chamar WhatsApp
                            </button>
                          )}
                          {sugTable && sugTable.epocStatus === "FREE" && !sugTable.isLocked && (
                            <button
                              disabled={busy}
                              onClick={() =>
                                onAction({
                                  action: "SEAT_PARTY",
                                  tableId: sugTable.id,
                                  waitlistId: w.id,
                                })
                              }
                              className="rounded bg-emerald-500 px-2 py-1 text-[10px] font-bold text-slate-950 hover:bg-emerald-400"
                            >
                              Sentar M{sugTable.number}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Lista de Reservas do Turno para Sentar */}
          <div className="mt-1 border-t border-slate-800 pt-2.5">
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>Reservas Aguardando Sentar ({readyReservations.length})</span>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {readyReservations.map((r) => {
                const assignedTable = db.tables.find((t) => t.id === r.tableId);
                return (
                  <div
                    key={r.id}
                    draggable
                    onDragStart={() =>
                      setDraggedPayload({
                        type: "RESERVATION",
                        id: r.id,
                        name: r.guestName,
                        partySize: r.partySize,
                      })
                    }
                    onDragEnd={() => setDraggedPayload(null)}
                    className="cursor-grab active:cursor-grabbing rounded-lg border border-slate-700/80 bg-slate-800/70 p-2.5 transition hover:border-amber-500/60"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-semibold text-xs text-white">{r.guestName}</span>
                        <p className="text-[11px] text-slate-400">
                          {r.time} · {r.partySize}p · {r.origin}
                        </p>
                      </div>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          r.status === "RECONFIRMED" || r.status === "ARRIVED"
                            ? "bg-orange-500/25 text-orange-300"
                            : r.isManual
                              ? "bg-purple-500/25 text-purple-300"
                              : "bg-yellow-500/25 text-yellow-300"
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>

                    {r.tags.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {r.tags.map((tg) => (
                          <span
                            key={tg}
                            className={`rounded px-1.5 py-0.5 text-[10px] ${
                              tg.toLowerCase().includes("alergia")
                                ? "bg-rose-500/30 text-rose-200 font-bold"
                                : "bg-slate-700/80 text-slate-300"
                            }`}
                          >
                            {tg}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-slate-300">
                        Mesa:{" "}
                        <strong className="text-amber-300">
                          {assignedTable ? `#${assignedTable.number}` : "Auto"}
                        </strong>
                      </span>
                      {assignedTable && (
                        <button
                          disabled={busy}
                          onClick={() =>
                            onAction({
                              action: "SEAT_PARTY",
                              tableId: assignedTable.id,
                              reservationId: r.id,
                            })
                          }
                          className="rounded bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-slate-950 hover:bg-emerald-400"
                        >
                          Sentar & Abrir EPOC
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Coluna 2 (5 cols): Canvas do Mapa de Chão Interativo em Metros */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-4 xl:col-span-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">
                  {selectedAreaId === "ALL" ? "Visão Consolidada — Todos os Ambientes" : currentArea.name}
                </h2>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
                  Planta: {currentArea.widthMeters}m × {currentArea.heightMeters}m
                </span>
                <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[11px] text-indigo-300">
                  {currentArea.epocAreaId}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {draggedPayload
                  ? `Solte sobre uma mesa compatível para sentar ${draggedPayload.name} (${draggedPayload.partySize}p) e abrir comanda no EPOC`
                  : "Clique em uma mesa para ver Cartão CRM, Sugestões de IA para o Garçom e Comanda EPOC ao vivo"}
              </p>
            </div>

            <button
              disabled={busy}
              onClick={() => onAction({ action: "EPOC_RECONCILE_NOW" })}
              className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] text-slate-200 hover:bg-slate-700"
              title="Executar reconciliação de 60s Mapa <-> EPOC"
            >
              <RefreshCw className="h-3 w-3 text-emerald-400" />
              Sync EPOC
            </button>
          </div>

          {/* Barra de Ferramentas do Editor de Planta (visível quando editorMode = true) */}
          {editorMode && (
            <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/30 p-3 text-xs">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-bold text-indigo-200">
                  Editor de Planta (Medidas em Metros · Rascunho & Publicação Instantânea)
                </span>
                <span className="text-[11px] text-indigo-300">
                  Grade: 1 célula = 1m × 1m
                </span>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label className="block text-[10px] text-slate-300">Nº Nova Mesa</label>
                  <input
                    type="text"
                    placeholder="Ex: 14"
                    value={newTableNumber}
                    onChange={(e) => setNewTableNumber(e.target.value)}
                    className="w-20 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-300">Cap. Máx</label>
                  <select
                    value={newTableMaxCap}
                    onChange={(e) => setNewTableMaxCap(Number(e.target.value))}
                    className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                  >
                    <option value={2}>2 lugares (1-2)</option>
                    <option value={4}>4 lugares (2-4)</option>
                    <option value={6}>6 lugares (5-10)</option>
                    <option value={8}>8 lugares (5-10)</option>
                    <option value={12}>12 lugares (12+)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-300">Formato</label>
                  <select
                    value={newTableShape}
                    onChange={(e) =>
                      setNewTableShape(e.target.value as "square" | "round" | "rectangle" | "booth")
                    }
                    className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                  >
                    <option value="round">Redonda</option>
                    <option value="square">Quadrada</option>
                    <option value="rectangle">Retangular</option>
                    <option value="booth">Booth / Sofá</option>
                  </select>
                </div>
                <button
                  disabled={busy}
                  onClick={() => {
                    onAction({
                      action: "FLOORPLAN_CREATE_TABLE",
                      areaId: selectedAreaId === "ALL" ? "area-salao" : selectedAreaId,
                      number: newTableNumber || String(db.tables.length + 12),
                      minCapacity: Math.max(1, newTableMaxCap - 2),
                      maxCapacity: newTableMaxCap,
                      shape: newTableShape,
                      x: 6.0,
                      y: 4.5,
                    });
                    setNewTableNumber("");
                  }}
                  className="flex items-center gap-1 rounded bg-indigo-500 px-3 py-1.5 font-semibold text-white hover:bg-indigo-400"
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar Mesa na Planta
                </button>
              </div>
            </div>
          )}

          {/* Área Gráfica do Salão (Canvas Interativo com Escala em Metros) */}
          <div className="relative min-h-[490px] w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950 floorplan-metric-grid p-3">
            {/* Régua Métrica Superior */}
            <div className="mb-2 flex justify-between border-b border-slate-800/80 pb-1 text-[10px] font-mono text-slate-500">
              <span>0m</span>
              <span>4m</span>
              <span>8m</span>
              <span>12m</span>
              <span>{currentArea.widthMeters}m</span>
            </div>

            {/* Elementos arquitetônicos do ambiente (Bar, Palco DJ, Deck, Jardim) */}
            {selectedAreaId !== "ALL" &&
              currentArea.elements.map((el) => {
                const leftPct = (el.x / currentArea.widthMeters) * 100;
                const topPct = (el.y / currentArea.heightMeters) * 100;
                const widthPct = (el.width / currentArea.widthMeters) * 100;
                const heightPct = (el.height / currentArea.heightMeters) * 100;
                return (
                  <div
                    key={el.id}
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      width: `${widthPct}%`,
                      height: `${heightPct}%`,
                    }}
                    className="pointer-events-none absolute flex items-center justify-center rounded-lg border border-slate-700/60 bg-slate-900/80 px-2 text-center text-[10px] font-medium uppercase tracking-wider text-slate-400"
                  >
                    {el.label}
                  </div>
                );
              })}

            {/* Renderização das Mesas */}
            <div className="relative h-[430px] w-full">
              {visibleTables.map((table, idx) => {
                const vState = computeTableVisualState(table, db.reservations, db.venue);
                const meta = VISUAL_STATE_META[vState];
                const isSelected = selectedTable?.id === table.id;
                const seatedMins = getSeatedMinutes(table);
                const isOverstaying = seatedMins > table.expectedDurationMins;

                const linkedRes = db.reservations.find(
                  (r) =>
                    (r.id === table.currentReservationId || r.tableId === table.id) &&
                    !["CANCELLED", "NO_SHOW", "EXPIRED", "FINISHED"].includes(r.status)
                );
                const linkedGuest = linkedRes
                  ? db.guests.find((g) => g.id === linkedRes.guestId)
                  : undefined;
                const hasAllergy =
                  (linkedGuest && linkedGuest.allergies.length > 0) ||
                  linkedRes?.tags.some((t) => t.toLowerCase().includes("alergia"));

                // Posicionamento proporcional em metros (ou em grade se "ALL")
                const leftPct =
                  selectedAreaId === "ALL"
                    ? (idx % 4) * 24 + 3
                    : Math.min(82, (table.x / currentArea.widthMeters) * 100);
                const topPct =
                  selectedAreaId === "ALL"
                    ? Math.floor(idx / 4) * 23 + 4
                    : Math.min(78, (table.y / currentArea.heightMeters) * 100);
                const widthPx =
                  table.maxCapacity >= 10 ? 158 : table.maxCapacity >= 6 ? 128 : 108;
                const heightPx = table.shape === "round" ? 96 : 88;

                return (
                  <div
                    key={table.id}
                    onClick={() => onSelectTable(table.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (!draggedPayload) return;
                      onAction({
                        action: "SEAT_PARTY",
                        tableId: table.id,
                        reservationId:
                          draggedPayload.type === "RESERVATION" ? draggedPayload.id : undefined,
                        waitlistId:
                          draggedPayload.type === "WAITLIST" ? draggedPayload.id : undefined,
                      });
                      setDraggedPayload(null);
                    }}
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      width: `${widthPx}px`,
                      height: `${heightPx}px`,
                      transform: `rotate(${table.rotation}deg)`,
                    }}
                    className={`group absolute flex cursor-pointer flex-col justify-between border-2 p-2 transition-all ${
                      table.shape === "round" ? "rounded-3xl" : "rounded-xl"
                    } ${meta.bgClass} ${meta.borderClass} ${
                      isSelected ? "ring-2 ring-white ring-offset-2 ring-offset-slate-950 z-20 scale-[1.03]" : "z-10"
                    }`}
                  >
                    {/* Cadeiras Visuais Superiores */}
                    <div className="pointer-events-none absolute -top-2 left-3 right-3 flex justify-around">
                      {Array.from({ length: Math.min(5, table.chairsTop) }).map((_, i) => (
                        <span
                          key={i}
                          className="h-1.5 w-4 rounded-t-sm bg-slate-500/70"
                        />
                      ))}
                    </div>

                    {/* Cadeiras Visuais Inferiores */}
                    <div className="pointer-events-none absolute -bottom-2 left-3 right-3 flex justify-around">
                      {Array.from({ length: Math.min(5, table.chairsBottom) }).map((_, i) => (
                        <span
                          key={i}
                          className="h-1.5 w-4 rounded-b-sm bg-slate-500/70"
                        />
                      ))}
                    </div>

                    {/* Linha Superior da Mesa: Número, Junção, Cadeado, Alergia */}
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs font-extrabold tracking-tight">
                          M{table.number}
                        </span>
                        {table.mergedWithIds.length > 0 && (
                          <span
                            title="Mesa unida (Junção ativa)"
                            className="rounded bg-amber-400/30 px-1 text-[9px] font-bold text-amber-200"
                          >
                            JUNÇÃO
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {hasAllergy && (
                          <span
                            title="Alerta de Alergia registrado no CRM!"
                            className="rounded-full bg-rose-500 p-0.5 text-white animate-bounce"
                          >
                            <AlertTriangle className="h-2.5 w-2.5" />
                          </span>
                        )}
                        {vState === "LOCKED" && <Lock className="h-3 w-3 text-rose-400" />}
                        <span className="text-[10px] font-semibold opacity-80">
                          {table.minCapacity}-{table.maxCapacity}p
                        </span>
                      </div>
                    </div>

                    {/* Centro: Nome do Cliente / Status EPOC */}
                    <div className="my-auto truncate text-[10px] leading-tight">
                      {vState === "SEATED" || vState === "CLOSING" ? (
                        <>
                          <div className="truncate font-bold">
                            {linkedRes?.guestName ||
                              db.epocOrders.find((o) => o.id === table.currentOrderId)?.guestName ||
                              "Cliente Sentado"}
                          </div>
                          <div className="flex items-center gap-1 text-[9px] opacity-90">
                            <Clock className="h-2.5 w-2.5" />
                            <span className={isOverstaying ? "text-rose-300 font-bold" : ""}>
                              {seatedMins}m / {table.expectedDurationMins}m
                            </span>
                          </div>
                        </>
                      ) : vState === "OCCUPIED_WALKIN" ? (
                        <>
                          <div className="truncate font-bold text-cyan-200">Walk-in (EPOC)</div>
                          <div className="text-[9px] text-cyan-100/80">Sem reserva · {seatedMins}m</div>
                        </>
                      ) : linkedRes ? (
                        <>
                          <div className="truncate font-semibold">{linkedRes.guestName}</div>
                          <div className="text-[9px] opacity-85">
                            {linkedRes.time} · {linkedRes.partySize}p
                          </div>
                        </>
                      ) : vState === "LOCKED" ? (
                        <div className="truncate text-[9px] text-rose-200">
                          {table.lockReason || "Bloqueada"}
                        </div>
                      ) : (
                        <div className="text-[9px] text-slate-400">Livre no EPOC</div>
                      )}
                    </div>

                    {/* Rodapé da Mesa: ID no EPOC ou Comanda */}
                    <div className="flex items-center justify-between text-[9px] opacity-80">
                      <span className="font-mono">{table.epocTableId}</span>
                      {table.currentOrderId && (
                        <span className="rounded bg-black/30 px-1 font-mono text-[8px]">
                          {table.currentOrderId.replace("EPOC-CMD-", "#")}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Coluna 3 (4 cols): Cartão Operacional da Mesa + IA para o Garçom + Comanda PDV EPOC */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-4 xl:col-span-4">
          {selectedTable ? (
            <>
              {/* Cabeçalho da Mesa Selecionada */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{selectedTable.name}</h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${VISUAL_STATE_META[selectedTableState].badgeClass}`}
                    >
                      {VISUAL_STATE_META[selectedTableState].label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    ID PDV EPOC: <strong className="font-mono text-slate-200">{selectedTable.epocTableId}</strong> ·
                    Capacidade:{" "}
                    <strong className="text-slate-200">
                      {selectedTable.minCapacity} a {selectedTable.maxCapacity} lugares
                    </strong>{" "}
                    (Faixa {selectedTable.bracket})
                  </p>
                </div>

                <button
                  disabled={busy}
                  onClick={() =>
                    onAction({
                      action: "TABLE_TOGGLE_LOCK",
                      tableId: selectedTable.id,
                    })
                  }
                  className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                    selectedTable.isLocked
                      ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
                      : "border-rose-500/40 bg-rose-500/20 text-rose-200 hover:bg-rose-500/30"
                  }`}
                >
                  {selectedTable.isLocked ? (
                    <>
                      <Unlock className="h-3.5 w-3.5" /> Destravar
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" /> Travar Mesa
                    </>
                  )}
                </button>
              </div>

              {/* Controles de Junção / Separação de Mesas (Ex.: Mesa 11/04) e Posição no Editor */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 text-xs">
                {selectedTable.mergedWithIds.length > 0 ? (
                  <div className="flex w-full items-center justify-between">
                    <span className="text-amber-300">
                      Junção ativa: <strong>Mesa {selectedTable.number}</strong> ({selectedTable.maxCapacity} lugares)
                    </span>
                    <button
                      disabled={busy}
                      onClick={() =>
                        onAction({
                          action: "TABLE_UNMERGE",
                          tableId: selectedTable.id,
                        })
                      }
                      className="flex items-center gap-1 rounded bg-amber-500/20 border border-amber-400/40 px-2.5 py-1 text-xs font-semibold text-amber-200 hover:bg-amber-500/30"
                    >
                      <Split className="h-3.5 w-3.5" /> Separar Mesas ({selectedTable.number})
                    </button>
                  </div>
                ) : (
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="text-slate-400">Juntar M{selectedTable.number} com:</span>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={mergeTargetId}
                        onChange={(e) => setMergeTargetId(e.target.value)}
                        className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                      >
                        <option value="">Selecionar mesa...</option>
                        {visibleTables
                          .filter(
                            (t) =>
                              t.id !== selectedTable.id &&
                              t.areaId === selectedTable.areaId &&
                              t.epocStatus === "FREE"
                          )
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              Mesa {t.number} ({t.minCapacity}-{t.maxCapacity}p)
                            </option>
                          ))}
                      </select>
                      <button
                        disabled={busy || !mergeTargetId}
                        onClick={() => {
                          if (!mergeTargetId) return;
                          onAction({
                            action: "TABLE_MERGE",
                            primaryTableId: selectedTable.id,
                            secondaryTableId: mergeTargetId,
                          });
                          setMergeTargetId("");
                        }}
                        className="flex items-center gap-1 rounded bg-indigo-500/20 border border-indigo-400/40 px-2.5 py-1 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/30 disabled:opacity-40"
                      >
                        <Link2 className="h-3.5 w-3.5" /> Juntar
                      </button>
                    </div>
                  </div>
                )}

                {editorMode && (
                  <div className="mt-2 grid w-full grid-cols-3 gap-2 border-t border-slate-800 pt-2">
                    <div>
                      <label className="text-[10px] text-slate-400">Pos X (m)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={selectedTable.x}
                        onChange={(e) =>
                          onAction({
                            action: "FLOORPLAN_UPDATE_TABLE",
                            tableId: selectedTable.id,
                            x: Number(e.target.value),
                          })
                        }
                        className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Pos Y (m)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={selectedTable.y}
                        onChange={(e) =>
                          onAction({
                            action: "FLOORPLAN_UPDATE_TABLE",
                            tableId: selectedTable.id,
                            y: Number(e.target.value),
                          })
                        }
                        className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Cap. Máx</label>
                      <input
                        type="number"
                        value={selectedTable.maxCapacity}
                        onChange={(e) =>
                          onAction({
                            action: "FLOORPLAN_UPDATE_TABLE",
                            tableId: selectedTable.id,
                            maxCapacity: Number(e.target.value),
                          })
                        }
                        className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Bloco CRM & IA para o Garçom (Seção 8) */}
              {selectedGuest ? (
                <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-amber-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                          Ficha CRM 360º & IA para o Garçom
                        </span>
                      </div>
                      <h4 className="mt-1 text-sm font-bold text-white">{selectedGuest.name}</h4>
                      <p className="text-[11px] text-slate-400">
                        CPF: <span className="font-mono text-slate-300">{selectedGuest.cpfMasked}</span> ·{" "}
                        {selectedGuest.visitsCount} visitas · Ticket Médio:{" "}
                        <strong className="text-emerald-300">R$ {selectedGuest.averageTicket.toFixed(0)}</strong>
                      </p>
                    </div>
                    <button
                      onClick={() => onInspectGuest(selectedGuest.id)}
                      className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/20"
                    >
                      Ver CRM 360º
                    </button>
                  </div>

                  {/* Alerta de Alergia em Destaque Vermelho */}
                  {selectedGuest.waiterAi.allergyAlert && (
                    <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-rose-500 bg-rose-950/70 px-3 py-2 text-xs font-bold text-rose-200">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                      <span>{selectedGuest.waiterAi.allergyAlert}</span>
                    </div>
                  )}

                  {/* Sugestões de Vinho e Prato */}
                  <div className="mt-2.5 space-y-2 text-xs">
                    <div className="rounded-lg bg-slate-950/70 p-2.5">
                      <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                        <Wine className="h-3.5 w-3.5" />
                        <span>Carta Sugerida: {selectedGuest.waiterAi.wineTier}</span>
                      </div>
                      <ul className="mt-1 list-disc pl-4 text-[11px] text-slate-300 space-y-0.5">
                        {selectedGuest.waiterAi.recommendedWines.map((w) => (
                          <li key={w}>{w}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-lg bg-slate-950/70 p-2.5">
                      <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
                        <Utensils className="h-3.5 w-3.5" />
                        <span>Pratos Recomendados & Dica de Abordagem</span>
                      </div>
                      <ul className="mt-1 list-disc pl-4 text-[11px] text-slate-300 space-y-0.5">
                        {selectedGuest.waiterAi.recommendedDishes.map((d) => (
                          <li key={d}>{d}</li>
                        ))}
                      </ul>
                      <p className="mt-1.5 border-t border-slate-800 pt-1.5 text-[11px] italic text-slate-400">
                        &ldquo;{selectedGuest.waiterAi.approachTip}&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              ) : selectedTableReservation ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs">
                  <p className="font-semibold text-white">Reserva: {selectedTableReservation.guestName}</p>
                  <p className="text-slate-400">
                    Horário: {selectedTableReservation.time} · {selectedTableReservation.partySize} pessoas
                  </p>
                </div>
              ) : null}

              {/* Se a mesa tem Reserva atribuída e está LIVRE no EPOC: Botão principal para Sentar e Abrir Comanda EPOC */}
              {selectedTable.epocStatus === "FREE" && selectedTableReservation && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/25 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-emerald-300">
                        Reserva Pronta para Sentar
                      </span>
                      <p className="text-[11px] text-slate-300">
                        {selectedTableReservation.guestName} ({selectedTableReservation.partySize}p às{" "}
                        {selectedTableReservation.time})
                      </p>
                    </div>
                    <button
                      disabled={busy}
                      onClick={() =>
                        onAction({
                          action: "SEAT_PARTY",
                          tableId: selectedTable.id,
                          reservationId: selectedTableReservation.id,
                        })
                      }
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400"
                    >
                      <UserCheck className="h-4 w-4" />
                      Sentar & Abrir Comanda EPOC
                    </button>
                  </div>
                </div>
              )}

              {/* Comanda Viva do PDV EPOC (Seção 12) */}
              {selectedTableOrder ? (
                <div className="flex flex-col gap-2.5 rounded-xl border border-slate-700 bg-slate-950/90 p-3.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-emerald-400">
                        {selectedTableOrder.id}
                      </span>
                      <span className="ml-2 rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                        Status EPOC: {selectedTableOrder.status}
                      </span>
                    </div>
                    <span className="text-sm font-extrabold text-white">
                      R$ {selectedTableOrder.total.toFixed(2)}
                    </span>
                  </div>

                  {/* Lista de Itens Consumidos no EPOC */}
                  <div className="max-h-36 space-y-1.5 overflow-y-auto pr-1 text-xs">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Couvert Artístico ({selectedTableOrder.partySize}x)</span>
                      <span>R$ {selectedTableOrder.couvertTotal.toFixed(2)}</span>
                    </div>
                    {selectedTableOrder.items.map((it) => (
                      <div key={it.id} className="flex justify-between text-slate-200">
                        <span className="truncate pr-2">
                          {it.qty}x {it.name}
                        </span>
                        <span className="font-mono shrink-0">
                          R$ {(it.qty * it.unitPrice).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-slate-800/80 pt-1 text-[11px] text-slate-400">
                      <span>Taxa de Serviço (13%)</span>
                      <span>R$ {selectedTableOrder.serviceFeeTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Atalhos rápidos para lançar sugestão da IA na Comanda EPOC ou Fechar Conta */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      disabled={busy}
                      onClick={() =>
                        onAction({
                          action: "EPOC_ADD_ITEM",
                          orderId: selectedTableOrder.id,
                          name:
                            selectedGuest?.waiterAi.recommendedWines[0]?.split(" (")[0] ||
                            "Brunello di Montalcino DOCG",
                          category: "VINHO",
                          qty: 1,
                          unitPrice: 790,
                        })
                      }
                      className="rounded border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/25"
                    >
                      + Lançar Vinho Sugerido (EPOC)
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        onAction({
                          action: "EPOC_ADD_ITEM",
                          orderId: selectedTableOrder.id,
                          name: "Prime Rib Wagyu A5 c/ Trufas",
                          category: "PRATO",
                          qty: 1,
                          unitPrice: 340,
                        })
                      }
                      className="rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
                    >
                      + Lançar Prato (R$ 340)
                    </button>
                  </div>

                  <div className="mt-1 grid grid-cols-2 gap-2 border-t border-slate-800 pt-2.5">
                    {selectedTable.epocStatus !== "CLOSING" && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          onAction({
                            action: "EPOC_REQUEST_BILL",
                            tableId: selectedTable.id,
                          })
                        }
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-400/50 bg-amber-500/20 px-3 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/30"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        Pedir Conta (Em Fechamento)
                      </button>
                    )}
                    <button
                      disabled={busy}
                      onClick={() =>
                        onAction({
                          action: "EPOC_CLOSE_ORDER",
                          tableId: selectedTable.id,
                        })
                      }
                      className={`flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 ${
                        selectedTable.epocStatus === "CLOSING" ? "col-span-2" : ""
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Fechar Conta EPOC & Liberar Mesa
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 text-xs text-slate-400">
                  <div className="flex items-center justify-between">
                    <span>Nenhuma comanda aberta no EPOC para esta mesa.</span>
                    {!selectedTable.isLocked && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          onAction({
                            action: "EPOC_OPEN_WALKIN",
                            tableId: selectedTable.id,
                            partySize: selectedTable.minCapacity,
                            guestName: `Walk-in Mesa ${selectedTable.number}`,
                          })
                        }
                        className="rounded border border-cyan-500/40 bg-cyan-500/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/25"
                      >
                        Simular Walk-in Direto no EPOC
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-400">Selecione uma mesa no mapa para inspecionar.</p>
          )}
        </div>
      </div>
    </div>
  );
}
