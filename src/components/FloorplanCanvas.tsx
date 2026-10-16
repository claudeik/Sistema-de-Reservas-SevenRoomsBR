"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Edit3,
  FileText,
  Filter,
  Layers,
  Link2,
  Lock,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Split,
  Tag,
  Unlock,
  UserCheck,
  UserPlus,
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

/**
 * Paleta SevenRooms Matte (fiel ao iPad da imagem enviada)
 * + Mapeamento completo para os estados Dguests e EPOC POS
 */
const SEVENROOMS_TABLE_STYLES: Record<
  TableVisualState,
  {
    label: string;
    dguestsLabel: string;
    tableBg: string;
    chairBg: string;
    textColor: string;
    ringColor: string;
    showCenterTarget: boolean;
    dotHex: string;
  }
> = {
  AVAILABLE: {
    label: "Disponível (EPOC Livre)",
    dguestsLabel: "Cinza Disponível",
    tableBg: "bg-[#c7c9cc] hover:bg-[#d6d8db]",
    chairBg: "bg-[#9a9c9f]",
    textColor: "text-[#2b2d31]",
    ringColor: "ring-white/60",
    showCenterTarget: false,
    dotHex: "#c7c9cc",
  },
  SEATED: {
    label: "Sentados (EPOC Aberta)",
    dguestsLabel: "Verde Sentados",
    tableBg: "bg-[#d4885c] hover:bg-[#df9469]", // Terracota/Laranja SevenRooms (Mesas 23, 32, 34)
    chairBg: "bg-[#b06d46]",
    textColor: "text-[#231915]",
    ringColor: "ring-[#f3b692]",
    showCenterTarget: true,
    dotHex: "#d4885c",
  },
  CLOSING: {
    label: "Em Fechamento (EPOC Conta)",
    dguestsLabel: "Conta Solicitada",
    tableBg: "bg-[#55b699] hover:bg-[#64c5a8]", // Verde-Menta SevenRooms (Mesa 36)
    chairBg: "bg-[#3f9178]",
    textColor: "text-[#122b23]",
    ringColor: "ring-[#8be4c9]",
    showCenterTarget: true,
    dotHex: "#55b699",
  },
  OCCUPIED_WALKIN: {
    label: "Ocupada s/ Reserva (EPOC)",
    dguestsLabel: "Walk-in EPOC",
    tableBg: "bg-[#4da1df] hover:bg-[#5eb0ed]", // Azul SevenRooms (Mesa 37)
    chairBg: "bg-[#387eb3]",
    textColor: "text-[#102536]",
    ringColor: "ring-[#93cbf5]",
    showCenterTarget: true,
    dotHex: "#4da1df",
  },
  LOCKED: {
    label: "Travada / VIP Sommelier",
    dguestsLabel: "Vermelho c/ Cadeado",
    tableBg: "bg-[#df6976] hover:bg-[#ea7885]", // Coral/Rosa SevenRooms (Mesa 33)
    chairBg: "bg-[#b54e5a]",
    textColor: "text-[#2b1115]",
    ringColor: "ring-[#f7a6af]",
    showCenterTarget: false,
    dotHex: "#df6976",
  },
  RESERVED_CONFIRMED: {
    label: "Chegou / Reconfirmada",
    dguestsLabel: "Laranja Confirmada",
    tableBg: "bg-[#d4885c] hover:bg-[#df9469]",
    chairBg: "bg-[#a86640]",
    textColor: "text-[#231915]",
    ringColor: "ring-orange-300",
    showCenterTarget: true,
    dotHex: "#fb923c",
  },
  RESERVED_ONLINE: {
    label: "Reserva Online (Pré-alocada)",
    dguestsLabel: "Amarelo Online",
    tableBg: "bg-[#c7c9cc] hover:bg-[#d6d8db]",
    chairBg: "bg-[#9a9c9f]",
    textColor: "text-[#2b2d31]",
    ringColor: "ring-yellow-400",
    showCenterTarget: false,
    dotHex: "#facc15",
  },
  RESERVED_MANUAL: {
    label: "Reserva Manual (Concierge)",
    dguestsLabel: "Roxo Manual",
    tableBg: "bg-[#c7c9cc] hover:bg-[#d6d8db]",
    chairBg: "bg-[#9a9c9f]",
    textColor: "text-[#2b2d31]",
    ringColor: "ring-purple-400",
    showCenterTarget: false,
    dotHex: "#c084fc",
  },
  STALE: {
    label: "Desatualizada (>30s s/ EPOC)",
    dguestsLabel: "Cinza Hachurado",
    tableBg: "bg-stale-hatched",
    chairBg: "bg-slate-700",
    textColor: "text-slate-200",
    ringColor: "ring-slate-400",
    showCenterTarget: false,
    dotHex: "#64748b",
  },
};

const DGUESTS_CLASSIC_OVERRIDES: Partial<
  Record<TableVisualState, { tableBg: string; chairBg: string; textColor: string }>
> = {
  AVAILABLE: {
    tableBg: "bg-[#9ca3af] hover:bg-[#b0b7c3]",
    chairBg: "bg-[#6b7280]",
    textColor: "text-slate-950",
  },
  RESERVED_ONLINE: {
    tableBg: "bg-[#eab308] hover:bg-[#facc15]",
    chairBg: "bg-[#a16207]",
    textColor: "text-slate-950",
  },
  RESERVED_MANUAL: {
    tableBg: "bg-[#9333ea] hover:bg-[#a855f7]",
    chairBg: "bg-[#6b21a8]",
    textColor: "text-white",
  },
  RESERVED_CONFIRMED: {
    tableBg: "bg-[#f97316] hover:bg-[#fb923c]",
    chairBg: "bg-[#c2410c]",
    textColor: "text-slate-950",
  },
  SEATED: {
    tableBg: "bg-[#22c55e] hover:bg-[#4ade80]",
    chairBg: "bg-[#15803d]",
    textColor: "text-slate-950",
  },
  LOCKED: {
    tableBg: "bg-[#e11d48] hover:bg-[#f43f5e]",
    chairBg: "bg-[#9f1239]",
    textColor: "text-white",
  },
};

function formatShortGuestName(fullName?: string): string {
  if (!fullName) return "";
  const clean = fullName.replace(/^Dra?\.\s+/i, "").trim();
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0][0]}. ${parts[parts.length - 1]}`;
}

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
  const [searchQuery, setSearchQuery] = useState("");
  const [paletteMode, setPaletteMode] = useState<"SEVENROOMS" | "DGUESTS">("SEVENROOMS");
  const [editorMode, setEditorMode] = useState(false);
  const [bracketFilter, setBracketFilter] = useState<PartyBracket | "ALL">("ALL");
  const [showInspector, setShowInspector] = useState(true);
  const [showRoomMenu, setShowRoomMenu] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState<string>("");

  // Seções retráteis estilo SevenRooms (ARRIVED, SEATED, WAITLIST, UPCOMING)
  const [openArrived, setOpenArrived] = useState(true);
  const [openSeated, setOpenSeated] = useState(true);
  const [openWaitlist, setOpenWaitlist] = useState(true);

  const [draggedPayload, setDraggedPayload] = useState<{
    type: "RESERVATION" | "WAITLIST";
    id: string;
    name: string;
    partySize: number;
  } | null>(null);

  // Novo formulário rápido para criar mesa no editor
  const [newTableNumber, setNewTableNumber] = useState("");
  const [newTableMaxCap, setNewTableMaxCap] = useState(4);
  const [newTableShape, setNewTableShape] = useState<"square" | "round" | "rectangle" | "booth" | "stool">("booth");

  const allActiveTables = db.tables.filter((t) => !t.parentMergedIntoId);
  const visibleTables = allActiveTables.filter((t) => {
    const areaMatch = selectedAreaId === "ALL" || t.areaId === selectedAreaId;
    const bracketMatch = bracketFilter === "ALL" || t.bracket === bracketFilter;
    return areaMatch && bracketMatch;
  });

  const currentArea =
    db.areas.find((a) => a.id === selectedAreaId) || db.areas[0];

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

  const getSeatedMinutes = (table: TableNode) => {
    if (!table.seatedAt) return 0;
    const diff = Date.now() - new Date(table.seatedAt).getTime();
    return Math.max(1, Math.floor(diff / 60000));
  };

  // Listas filtradas para a barra lateral esquerda estilo SevenRooms
  const q = searchQuery.trim().toLowerCase();
  const matchesSearch = (name: string, tableNum?: string) => {
    if (!q) return true;
    return name.toLowerCase().includes(q) || (tableNum && tableNum.toLowerCase().includes(q));
  };

  const arrivedAndUpcomingReservations = db.reservations.filter((r) => {
    const tbl = db.tables.find((t) => t.id === r.tableId);
    return (
      ["ARRIVED", "RECONFIRMED", "CONFIRMED", "REQUESTED"].includes(r.status) &&
      matchesSearch(r.guestName, tbl?.number)
    );
  });

  const activeWaitlist = db.waitlist.filter((w) => {
    const tbl = db.tables.find((t) => t.id === w.suggestedTableId);
    return ["WAITING", "CALLED"].includes(w.status) && matchesSearch(w.guestName, tbl?.number);
  });

  // Sentados combina reservas SEATED + comandas EPOC abertas + fila SEATED
  const seatedParties = allActiveTables
    .filter((t) => t.epocStatus === "OPEN" || t.epocStatus === "CLOSING")
    .map((t) => {
      const res = db.reservations.find((r) => r.id === t.currentReservationId);
      const wl = db.waitlist.find((w) => w.id === t.currentWaitlistId);
      const ord = db.epocOrders.find((o) => o.id === t.currentOrderId);
      const guestName =
        res?.guestName || wl?.guestName || ord?.guestName || `Walk-in Mesa ${t.number}`;
      const partySize = res?.partySize || wl?.partySize || ord?.partySize || t.minCapacity;
      const time =
        res?.time ||
        (t.seatedAt
          ? new Date(t.seatedAt).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "20:00");
      const tags = res?.tags || (wl?.isPriorityVip ? ["VIP"] : []);
      return {
        tableId: t.id,
        tableNumber: t.number,
        guestName,
        partySize,
        time,
        tags,
        hasNotes: Boolean(res?.notes),
        epocStatus: t.epocStatus,
        orderTotal: ord?.total,
      };
    })
    .filter((item) => matchesSearch(item.guestName, item.tableNumber));

  const arrivedPartiesCount = arrivedAndUpcomingReservations.reduce(
    (acc, r) => acc + r.partySize,
    0
  );
  const seatedGuestsCount = seatedParties.reduce((acc, s) => acc + s.partySize, 0);

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-[#32353c] bg-[#1c1d21] shadow-2xl">
      {/* BARRA SUPERIOR SEVENROOMS (Data, Filtro, Turno Jantar/Almoço, Botões Azuis de Walk-in e Reserva) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2e3138] bg-[#24262b] px-4 py-2.5">
        {/* Ícone Esquerdo + Contadores Rápidos */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2f3239] text-sky-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-300">
            <span className="rounded bg-[#2f3239] px-2.5 py-1 font-medium">
              Livre:{" "}
              <strong className="text-white">
                {
                  allActiveTables.filter(
                    (t) => computeTableVisualState(t, db.reservations, db.venue) === "AVAILABLE"
                  ).length
                }
              </strong>
            </span>
            <span className="rounded bg-[#2f3239] px-2.5 py-1 font-medium">
              Sentados (EPOC):{" "}
              <strong className="text-[#d4885c]">{seatedParties.length}</strong>
            </span>
            <span className="rounded bg-[#2f3239] px-2.5 py-1 font-medium">
              Fila:{" "}
              <strong className="text-[#55b699]">{activeWaitlist.length}</strong>
            </span>
          </div>
        </div>

        {/* Controle Segmentado Central (Idêntico ao topo do SevenRooms: < Qui, 15 Out > | Filtro | < Jantar >) */}
        <div className="flex items-center divide-x divide-[#383b43] rounded-md border border-[#383b43] bg-[#2d3037] text-xs font-medium text-slate-200 shadow-inner">
          <button className="px-2.5 py-1.5 hover:bg-[#383b43] text-slate-400 hover:text-white">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="px-4 py-1.5 font-semibold tracking-wide text-slate-100">
            Qui, 15 Out
          </span>
          <button className="px-2.5 py-1.5 hover:bg-[#383b43] text-slate-400 hover:text-white">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          {/* Botão de Filtro de Faixa de Capacidade */}
          <div className="relative flex items-center px-2.5 py-1">
            <Filter className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
            <select
              value={bracketFilter}
              onChange={(e) => setBracketFilter(e.target.value as PartyBracket | "ALL")}
              className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none"
            >
              <option value="ALL" className="bg-[#24262b]">
                Todas Capacidades
              </option>
              <option value="1-2" className="bg-[#24262b]">
                1–2 lugares
              </option>
              <option value="2-4" className="bg-[#24262b]">
                2–4 lugares
              </option>
              <option value="5-10" className="bg-[#24262b]">
                5–10 lugares
              </option>
              <option value="12+" className="bg-[#24262b]">
                12+ lugares (Grupo)
              </option>
            </select>
          </div>

          <button className="px-2.5 py-1.5 hover:bg-[#383b43] text-slate-400 hover:text-white">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="px-5 py-1.5 font-semibold tracking-wide text-slate-100">
            Dinner · Jantar
          </span>
          <button className="px-2.5 py-1.5 hover:bg-[#383b43] text-slate-400 hover:text-white">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Pílula Azul Direita (Walk-in no EPOC + Editor/Inspector) igual ao canto superior direito do SevenRooms */}
        <div className="flex items-center gap-2">
          <div className="flex items-center overflow-hidden rounded-full bg-[#3ea6d8] text-slate-950 shadow-md">
            <button
              disabled={busy || !selectedTable}
              onClick={() => {
                if (!selectedTable) return;
                onAction({
                  action: "EPOC_OPEN_WALKIN",
                  tableId: selectedTable.id,
                  partySize: selectedTable.minCapacity,
                  guestName: `Walk-in M${selectedTable.number}`,
                });
              }}
              title="Sentar Walk-in imediato na mesa selecionada (Abre Comanda EPOC)"
              className="flex items-center gap-1.5 border-r border-[#2b8bb8] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#3494c2] disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Walk-in</span>
            </button>
            <button
              onClick={() => setEditorMode(!editorMode)}
              title="Alternar Editor de Planta (Medidas em Metros / Adicionar Mesa)"
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white transition ${
                editorMode ? "bg-indigo-600" : "hover:bg-[#3494c2]"
              }`}
            >
              <CalendarPlus className="h-4 w-4" />
              <span className="hidden sm:inline">{editorMode ? "Sair Editor" : "Editor"}</span>
            </button>
          </div>

          <button
            onClick={() => setShowInspector(!showInspector)}
            className="flex items-center gap-1 rounded-lg border border-[#383b43] bg-[#2d3037] px-2.5 py-1.5 text-xs text-slate-200 hover:bg-[#383b43]"
            title="Mostrar/Ocultar Ficha da Mesa, IA Garçom e Comanda EPOC"
          >
            {showInspector ? (
              <PanelRightClose className="h-4 w-4 text-amber-400" />
            ) : (
              <PanelRightOpen className="h-4 w-4 text-slate-300" />
            )}
          </button>
        </div>
      </div>

      {/* Aviso de Modo Degradado EPOC */}
      {db.venue.epocConnectionMode === "DEGRADED_OFFLINE" && (
        <div className="flex items-center justify-between border-b border-amber-500/40 bg-amber-950/60 px-4 py-2 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 text-amber-400" />
            <span>
              <strong>MODO DEGRADADO ATIVO:</strong> Sem resposta do EPOC há mais de 30s. Mesas exibidas em cinza
              hachurado; o Host opera manualmente até a reconciliação.
            </span>
          </div>
          <button
            onClick={() => onAction({ action: "EPOC_SET_CONNECTION_MODE", mode: "ONLINE_WEBHOOK" })}
            className="rounded bg-amber-400 px-2.5 py-1 font-bold text-slate-950 hover:bg-amber-300"
          >
            Restaurar EPOC Online
          </button>
        </div>
      )}

      {/* CORPO PRINCIPAL: Lista Lateral SevenRooms (ARRIVED / WAITLIST / SEATED) + Canvas SevenRooms + Ficha Lateral */}
      <div className="grid min-h-[680px] grid-cols-1 lg:grid-cols-12">
        {/* COLUNA ESQUERDA (3 cols): Lista SevenRooms com Search, ARRIVED, WAITLIST e SEATED */}
        <div className="flex flex-col border-b border-[#2e3138] bg-[#25272c] lg:col-span-3 lg:border-b-0 lg:border-r">
          {/* Barra de Busca + Botão de Filtros igual ao SevenRooms */}
          <div className="flex items-center gap-2 border-b border-[#32353d] p-2.5">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guest or table..."
                className="w-full rounded-md bg-[#343740] py-1.5 pl-8 pr-3 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
              />
            </div>
            <button
              onClick={() => setBracketFilter(bracketFilter === "ALL" ? "2-4" : "ALL")}
              className="flex h-8 w-8 items-center justify-center rounded-md bg-[#343740] text-slate-300 hover:text-white"
              title="Alternar filtro rápido"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#30333a]">
            {/* SEÇÃO 1: ARRIVED & UPCOMING RESERVATIONS */}
            <div>
              <button
                onClick={() => setOpenArrived(!openArrived)}
                className="flex w-full items-center justify-between bg-[#1e2024] px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200"
              >
                <span>ARRIVED & RESERVAS</span>
                <span className="flex items-center gap-1.5 font-mono text-slate-300">
                  {arrivedPartiesCount} ({arrivedAndUpcomingReservations.length})
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${openArrived ? "" : "-rotate-90"}`}
                  />
                </span>
              </button>

              {openArrived && (
                <div className="divide-y divide-[#2e3138]">
                  {arrivedAndUpcomingReservations.map((r) => {
                    const assignedTable = db.tables.find((t) => t.id === r.tableId);
                    const hasAllergy = r.tags.some((t) => t.toLowerCase().includes("alergia"));
                    const hasVip = r.tags.some((t) => t.toLowerCase().includes("vip"));
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
                        onClick={() => {
                          if (assignedTable) onSelectTable(assignedTable.id);
                        }}
                        className="group flex cursor-grab items-center justify-between bg-[#25272c] px-3 py-2.5 transition hover:bg-[#2d3037] active:cursor-grabbing"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Ícone Redondo de Livro/Reserva estilo SevenRooms */}
                          <button
                            disabled={busy || !assignedTable}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!assignedTable) return;
                              onAction({
                                action: "SEAT_PARTY",
                                tableId: assignedTable.id,
                                reservationId: r.id,
                              });
                            }}
                            title="Clique para Sentar e Abrir Comanda no EPOC"
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${
                              r.status === "ARRIVED" || r.status === "RECONFIRMED"
                                ? "border-[#d4885c] bg-white text-[#231915] hover:scale-105"
                                : "border-slate-400 bg-slate-200 text-slate-900 hover:scale-105"
                            }`}
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                              <span className="font-semibold">{r.time}</span>
                              {hasAllergy && (
                                <Tag className="h-3 w-3 text-rose-400 fill-rose-400/30" />
                              )}
                              {hasVip && (
                                <Tag className="h-3 w-3 text-teal-400 fill-teal-400/30" />
                              )}
                              {r.notes && <FileText className="h-3 w-3 text-slate-400" />}
                            </div>
                            <div className="truncate text-xs font-bold text-white">
                              {r.guestName}
                            </div>
                          </div>
                        </div>

                        {/* Direita: Tamanho do Grupo + Quadrado com Número da Mesa igual ao SevenRooms */}
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-xs font-bold text-slate-200">{r.partySize}</span>
                          <div className="flex h-9 w-9 items-center justify-center rounded bg-[#1d1f23] font-mono text-xs font-bold text-slate-300 group-hover:bg-emerald-500 group-hover:text-slate-950 transition">
                            {assignedTable ? assignedTable.number : "--"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SEÇÃO 2: WAIT LIST / FILA VIRTUAL AO VIVO */}
            <div>
              <button
                onClick={() => setOpenWaitlist(!openWaitlist)}
                className="flex w-full items-center justify-between bg-[#1e2024] px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200"
              >
                <span>WAIT LIST · FILA VIRTUAL</span>
                <span className="flex items-center gap-1.5 font-mono text-slate-300">
                  {activeWaitlist.reduce((a, b) => a + b.partySize, 0)} ({activeWaitlist.length})
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${openWaitlist ? "" : "-rotate-90"}`}
                  />
                </span>
              </button>

              {openWaitlist && (
                <div className="divide-y divide-[#2e3138]">
                  {activeWaitlist.map((w) => {
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
                        className="group flex cursor-grab items-center justify-between bg-[#25272c] px-3 py-2.5 transition hover:bg-[#2d3037]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            disabled={busy}
                            onClick={() => {
                              if (sugTable && sugTable.epocStatus === "FREE") {
                                onAction({
                                  action: "SEAT_PARTY",
                                  tableId: sugTable.id,
                                  waitlistId: w.id,
                                });
                              } else {
                                onAction({
                                  action: "CALL_WAITLIST",
                                  waitlistId: w.id,
                                  suggestedTableId: w.suggestedTableId,
                                });
                              }
                            }}
                            title={
                              sugTable?.epocStatus === "FREE"
                                ? `Sentar na Mesa ${sugTable.number}`
                                : "Chamar via WhatsApp"
                            }
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                              w.status === "CALLED"
                                ? "border-[#55b699] bg-[#55b699]/20 text-[#55b699]"
                                : "border-amber-400/70 bg-amber-400/10 text-amber-300"
                            }`}
                          >
                            <Clock className="h-3.5 w-3.5" />
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                              <span>~{w.estimatedWaitMins}m</span>
                              <span className="text-[10px] text-slate-400">({w.bracket}p)</span>
                              {w.isPriorityVip && (
                                <span className="rounded bg-amber-500/20 px-1 text-[9px] font-bold text-amber-300">
                                  VIP
                                </span>
                              )}
                            </div>
                            <div className="truncate text-xs font-bold text-white">
                              {w.guestName}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-xs font-bold text-slate-200">{w.partySize}</span>
                          <div className="flex h-9 w-9 items-center justify-center rounded bg-[#1d1f23] font-mono text-xs font-bold text-[#55b699]">
                            {sugTable ? sugTable.number : "--"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SEÇÃO 3: SEATED (Círculo Azul Duplo idêntico ao SevenRooms + Quadrado da Mesa) */}
            <div>
              <button
                onClick={() => setOpenSeated(!openSeated)}
                className="flex w-full items-center justify-between bg-[#1e2024] px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200"
              >
                <span>SEATED · SENTADOS (EPOC)</span>
                <span className="flex items-center gap-1.5 font-mono text-slate-300">
                  {seatedGuestsCount} ({seatedParties.length})
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${openSeated ? "" : "-rotate-90"}`}
                  />
                </span>
              </button>

              {openSeated && (
                <div className="divide-y divide-[#2e3138]">
                  {seatedParties.map((s) => {
                    const isSelected = selectedTable?.id === s.tableId;
                    const hasAllergy = s.tags.some((t) => t.toLowerCase().includes("alergia"));
                    const hasVip = s.tags.some((t) => t.toLowerCase().includes("vip"));
                    return (
                      <div
                        key={s.tableId}
                        onClick={() => onSelectTable(s.tableId)}
                        className={`flex cursor-pointer items-center justify-between px-3 py-2.5 transition ${
                          isSelected ? "bg-[#31353f]" : "bg-[#25272c] hover:bg-[#2d3037]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Círculo Azul Duplo idêntico à seção SEATED do SevenRooms */}
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                              s.epocStatus === "CLOSING"
                                ? "border-[#55b699] p-0.5"
                                : "border-[#4da1df] p-0.5"
                            }`}
                          >
                            <div
                              className={`h-full w-full rounded-full ${
                                s.epocStatus === "CLOSING" ? "bg-[#55b699]" : "bg-[#4da1df]"
                              }`}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                              <span className="font-semibold">{s.time}</span>
                              {hasAllergy && (
                                <Tag className="h-3 w-3 text-rose-400 fill-rose-400/40" />
                              )}
                              {hasVip && (
                                <Tag className="h-3 w-3 text-teal-400 fill-teal-400/40" />
                              )}
                              {s.hasNotes && <FileText className="h-3 w-3 text-slate-300" />}
                            </div>
                            <div className="truncate text-xs font-bold text-white">
                              {s.guestName}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-xs font-bold text-slate-200">{s.partySize}</span>
                          <div className="flex h-9 w-9 items-center justify-center rounded bg-[#32353e] font-mono text-xs font-bold text-white shadow-inner">
                            {s.tableNumber}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLUNA CENTRAL: O MAPA DE CHÃO SEVENROOMS (Geometria fiel de Mesas, Cadeiras e Poltronas) */}
        <div
          className={`relative flex flex-col justify-between bg-[#202124] p-6 select-none ${
            showInspector ? "lg:col-span-5" : "lg:col-span-9"
          }`}
        >
          {/* Barra Flutuante do Modo Editor (quando ativo) */}
          {editorMode && (
            <div className="mb-4 z-30 flex flex-wrap items-end justify-between gap-2 rounded-xl border border-sky-500/40 bg-[#262930]/95 p-3 text-xs shadow-xl">
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400">Nº Mesa</label>
                  <input
                    type="text"
                    placeholder="Ex: 38"
                    value={newTableNumber}
                    onChange={(e) => setNewTableNumber(e.target.value)}
                    className="w-16 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400">Lugares</label>
                  <select
                    value={newTableMaxCap}
                    onChange={(e) => setNewTableMaxCap(Number(e.target.value))}
                    className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                  >
                    <option value={2}>2p (Bistrô c/ Poltronas)</option>
                    <option value={4}>4p (Redonda SevenRooms)</option>
                    <option value={6}>6p (Redonda Grande)</option>
                    <option value={12}>12p (Retangular Grupo)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400">Estilo SevenRooms</label>
                  <select
                    value={newTableShape}
                    onChange={(e) =>
                      setNewTableShape(
                        e.target.value as "square" | "round" | "rectangle" | "booth" | "stool"
                      )
                    }
                    className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                  >
                    <option value="booth">Redonda 4p + 2 Poltronas Superiores</option>
                    <option value="round">Redonda 4p Clássica</option>
                    <option value="stool">Bistrô 2p + 2 Poltronas Superiores</option>
                    <option value="rectangle">Retangular Grupo (Junção)</option>
                  </select>
                </div>
                <button
                  disabled={busy}
                  onClick={() => {
                    onAction({
                      action: "FLOORPLAN_CREATE_TABLE",
                      areaId: selectedAreaId === "ALL" ? "area-salao" : selectedAreaId,
                      number: newTableNumber || String(db.tables.length + 25),
                      minCapacity: Math.max(1, newTableMaxCap - 2),
                      maxCapacity: newTableMaxCap,
                      shape: newTableShape,
                      x: 8.5,
                      y: 7.4,
                    });
                    setNewTableNumber("");
                  }}
                  className="flex items-center gap-1 rounded bg-[#3ea6d8] px-3 py-1.5 font-bold text-white hover:bg-[#3494c2]"
                >
                  <Plus className="h-3.5 w-3.5" /> Criar Mesa
                </button>
              </div>
              <span className="text-[11px] text-slate-400">
                Planta: {currentArea.widthMeters}m × {currentArea.heightMeters}m ({currentArea.epocAreaId})
              </span>
            </div>
          )}

          {/* CANVAS SEVENROOMS DE ALTA PRECISÃO */}
          <div className="relative h-[580px] w-full overflow-hidden">
            {visibleTables.map((table, idx) => {
              const vState = computeTableVisualState(table, db.reservations, db.venue);
              const srMeta = SEVENROOMS_TABLE_STYLES[vState];
              const dgOverride =
                paletteMode === "DGUESTS" ? DGUESTS_CLASSIC_OVERRIDES[vState] : undefined;

              const tableBgClass = dgOverride?.tableBg || srMeta.tableBg;
              const chairBgClass = dgOverride?.chairBg || srMeta.chairBg;
              const textColorClass = dgOverride?.textColor || srMeta.textColor;

              const isSelected = selectedTable?.id === table.id;
              const seatedMins = getSeatedMinutes(table);

              const linkedRes = db.reservations.find(
                (r) =>
                  (r.id === table.currentReservationId || r.tableId === table.id) &&
                  !["CANCELLED", "NO_SHOW", "EXPIRED", "FINISHED"].includes(r.status)
              );
              const linkedWaitlist = db.waitlist.find((w) => w.id === table.currentWaitlistId);
              const linkedOrder = db.epocOrders.find((o) => o.id === table.currentOrderId);

              const rawGuestName =
                linkedRes?.guestName ||
                linkedWaitlist?.guestName ||
                linkedOrder?.guestName ||
                (table.isLocked ? "K. Levy" : "");

              const shortGuestLabel = formatShortGuestName(rawGuestName);

              const linkedGuest = linkedRes
                ? db.guests.find((g) => g.id === linkedRes.guestId)
                : undefined;
              const hasAllergy =
                (linkedGuest && linkedGuest.allergies.length > 0) ||
                linkedRes?.tags.some((t) => t.toLowerCase().includes("alergia"));

              // Posição no Canvas
              const leftPct =
                selectedAreaId === "ALL"
                  ? (idx % 4) * 24 + 5
                  : Math.min(82, (table.x / currentArea.widthMeters) * 100);
              const topPct =
                selectedAreaId === "ALL"
                  ? Math.floor(idx / 4) * 30 + 8
                  : Math.min(78, (table.y / currentArea.heightMeters) * 100);

              const hasUpperArmchairs = table.shape === "booth" || table.shape === "stool";
              const isTwoTopStool = table.shape === "stool" || table.maxCapacity <= 2;
              const isRectangleGroup = table.shape === "rectangle" || table.maxCapacity >= 8;
              const isLargeRound = !isRectangleGroup && table.maxCapacity >= 5;

              const circleSizePx = isLargeRound ? 92 : isTwoTopStool ? 72 : 82;

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
                    transform: `rotate(${table.rotation}deg)`,
                  }}
                  className="group absolute flex flex-col items-center cursor-pointer transition-transform duration-150 hover:scale-105"
                >
                  {/* 1. DUAS POLTRONAS ANGULADAS SUPERIORES (Idênticas às mesas 20, 21, 22 e 35, 36, 37 da foto do SevenRooms!) */}
                  {hasUpperArmchairs && (
                    <div className="mb-2.5 flex items-center justify-center gap-4 pointer-events-none">
                      {/* Poltrona Esquerda Inclinada (-24deg) */}
                      <div className="relative h-9 w-11 -rotate-[24deg] rounded-[3px] bg-[#55575c] p-1 shadow-md">
                        <div className="h-full w-full rounded-[2px] bg-[#76787e]" />
                      </div>
                      {/* Poltrona Direita Inclinada (+24deg) */}
                      <div className="relative h-9 w-11 rotate-[24deg] rounded-[3px] bg-[#55575c] p-1 shadow-md">
                        <div className="h-full w-full rounded-[2px] bg-[#76787e]" />
                      </div>
                    </div>
                  )}

                  {/* 2. CORPO DA MESA + CADEIRAS SALIENTES (SILHUETA SEVENROOMS) */}
                  {isRectangleGroup ? (
                    /* Mesa Retangular / Junção 11/04 com Cadeiras Salientes */
                    <div className="relative flex items-center justify-center px-3 py-3">
                      {/* Cadeiras Topo */}
                      <div className="pointer-events-none absolute top-0 left-5 right-5 flex justify-around">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-3.5 w-6 rounded-t-[4px] ${chairBgClass}`}
                          />
                        ))}
                      </div>
                      {/* Cadeiras Base */}
                      <div className="pointer-events-none absolute bottom-0 left-5 right-5 flex justify-around">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-3.5 w-6 rounded-b-[4px] ${chairBgClass}`}
                          />
                        ))}
                      </div>
                      {/* Cadeira Esquerda */}
                      <div
                        className={`pointer-events-none absolute left-0 h-8 w-3.5 rounded-l-[4px] ${chairBgClass}`}
                      />
                      {/* Cadeira Direita */}
                      <div
                        className={`pointer-events-none absolute right-0 h-8 w-3.5 rounded-r-[4px] ${chairBgClass}`}
                      />

                      {/* Tampo Retangular */}
                      <div
                        className={`relative z-10 flex h-[74px] w-[142px] flex-col items-center justify-center rounded-2xl shadow-lg transition ${tableBgClass} ${textColorClass} ${
                          isSelected ? `ring-2 ${srMeta.ringColor} ring-offset-2 ring-offset-[#202124]` : ""
                        }`}
                      >
                        <span className="text-xs font-extrabold tracking-tight">
                          {table.number}
                        </span>
                        <span className="text-[9px] font-bold uppercase opacity-75">
                          Junção {table.maxCapacity}p
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Mesa Redonda SevenRooms com 4 ou 2 Cadeiras Salientes formando a Cruz Clássica */
                    <div
                      style={{
                        width: `${circleSizePx + 24}px`,
                        height: `${circleSizePx + 24}px`,
                      }}
                      className="relative flex items-center justify-center"
                    >
                      {/* Cadeira Topo */}
                      <div
                        className={`pointer-events-none absolute top-0 h-4 w-9 rounded-t-[4px] transition ${chairBgClass}`}
                      />
                      {/* Cadeira Base */}
                      <div
                        className={`pointer-events-none absolute bottom-0 h-4 w-9 rounded-b-[4px] transition ${chairBgClass}`}
                      />
                      {/* Cadeiras Esquerda e Direita (para mesas de 4+ lugares) */}
                      {!isTwoTopStool && (
                        <>
                          <div
                            className={`pointer-events-none absolute left-0 h-9 w-4 rounded-l-[4px] transition ${chairBgClass}`}
                          />
                          <div
                            className={`pointer-events-none absolute right-0 h-9 w-4 rounded-r-[4px] transition ${chairBgClass}`}
                          />
                        </>
                      )}

                      {/* Tampo Circular da Mesa */}
                      <div
                        style={{
                          width: `${circleSizePx}px`,
                          height: `${circleSizePx}px`,
                        }}
                        className={`relative z-10 flex flex-col items-center justify-center rounded-full shadow-lg transition ${tableBgClass} ${textColorClass} ${
                          isSelected
                            ? `ring-2 ${srMeta.ringColor} ring-offset-2 ring-offset-[#202124]`
                            : ""
                        }`}
                      >
                        {/* Alerta de Alergia ou Cadeado */}
                        {hasAllergy && (
                          <span
                            title="Alerta de Alergia no CRM!"
                            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-white shadow"
                          >
                            <AlertTriangle className="h-2.5 w-2.5" />
                          </span>
                        )}
                        {vState === "LOCKED" && (
                          <span className="absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900/80 text-rose-300">
                            <Lock className="h-2.5 w-2.5" />
                          </span>
                        )}

                        {/* Indicador Concêntrico Central de Prato/Curso (Idêntico às mesas 23, 32, 34 do SevenRooms!) */}
                        {srMeta.showCenterTarget && (
                          <div className="mb-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/35">
                            <div className="h-2 w-2 rounded-full border border-white/60 bg-white/30" />
                          </div>
                        )}

                        {/* Número da Mesa */}
                        <span className="text-[11px] font-bold leading-none tracking-tight">
                          {table.number}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 3. NOME DO CLIENTE ABAIXO DA MESA (Exatamente como 'A. Martin', 'S. Ruby', 'T. McKenzie' na imagem!) */}
                  <div className="mt-1.5 flex flex-col items-center text-center">
                    {shortGuestLabel ? (
                      <span className="whitespace-nowrap text-[11px] font-bold tracking-wide text-slate-100 drop-shadow">
                        {shortGuestLabel}
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-500">
                        {table.minCapacity}–{table.maxCapacity}p
                      </span>
                    )}

                    {/* Sub-badge opcional discreto com Timer EPOC */}
                    {(vState === "SEATED" || vState === "CLOSING" || vState === "OCCUPIED_WALKIN") && (
                      <span className="mt-0.5 rounded bg-black/40 px-1.5 py-0.2 font-mono text-[9px] text-slate-300">
                        {seatedMins}m · {table.epocStatus === "CLOSING" ? "Conta" : "EPOC"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* RODAPÉ DO CANVAS: Legenda Compacta + Botão de Camadas (Layers) e Seletor 'Main Room' idênticos ao canto inferior direito do SevenRooms! */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 pt-2">
            {/* Legenda Interativa das Cores */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#c7c9cc]" /> Livre / Reserva
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#d4885c]" /> Sentados (EPOC)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#55b699]" /> Em Fechamento
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#4da1df]" /> Walk-in EPOC
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#df6976]" /> VIP / Travada
              </span>
            </div>

            {/* Canto Inferior Direito Idêntico ao SevenRooms: Botão Layers [🥞] + Botão [Main Room] */}
            <div className="relative flex items-center gap-2">
              <button
                onClick={() =>
                  setPaletteMode(paletteMode === "SEVENROOMS" ? "DGUESTS" : "SEVENROOMS")
                }
                title={`Paleta atual: ${paletteMode}. Clique para alternar entre SevenRooms e Dguests Clássico`}
                className="flex h-11 w-11 items-center justify-center rounded-md border border-slate-500/70 bg-[#26282e]/90 text-slate-200 shadow-lg hover:border-white hover:text-white"
              >
                <Layers className="h-5 w-5" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowRoomMenu(!showRoomMenu)}
                  className="flex h-11 min-w-[165px] items-center justify-center gap-2 rounded-md border border-slate-500/70 bg-[#26282e]/90 px-5 text-sm font-semibold text-white shadow-lg hover:border-white"
                >
                  <span>
                    {selectedAreaId === "ALL"
                      ? "All Rooms"
                      : currentArea.id === "area-salao"
                        ? "Main Room · Salão"
                        : currentArea.name}
                  </span>
                </button>

                {showRoomMenu && (
                  <div className="absolute bottom-13 right-0 z-40 w-56 rounded-xl border border-[#3a3d46] bg-[#25272c] p-1.5 shadow-2xl">
                    {db.areas.map((area) => (
                      <button
                        key={area.id}
                        onClick={() => {
                          onSelectArea(area.id);
                          setShowRoomMenu(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                          selectedAreaId === area.id
                            ? "bg-[#3ea6d8] text-white"
                            : "text-slate-300 hover:bg-[#32353d]"
                        }`}
                      >
                        <span>
                          {area.id === "area-salao" ? "Main Room (Salão)" : area.name}
                        </span>
                        <span className="text-[10px] opacity-80">{area.maxCapacity}p</span>
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        onSelectArea("ALL");
                        setShowRoomMenu(false);
                      }}
                      className={`mt-1 flex w-full items-center justify-between rounded-lg border-t border-[#343740] px-3 py-2 text-left text-xs font-semibold ${
                        selectedAreaId === "ALL"
                          ? "bg-[#3ea6d8] text-white"
                          : "text-slate-300 hover:bg-[#32353d]"
                      }`}
                    >
                      <span>Todos os Ambientes</span>
                      <span className="text-[10px] opacity-80">{allActiveTables.length} mesas</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA (4 cols): Ficha da Mesa Selecionada + IA para o Garçom + Comanda Viva PDV EPOC */}
        {showInspector && (
          <div className="flex flex-col gap-3 border-t border-[#2e3138] bg-[#25272c] p-4 lg:col-span-4 lg:border-l lg:border-t-0">
            {selectedTable ? (
              <>
                {/* Cabeçalho da Mesa Selecionada */}
                <div className="flex items-start justify-between gap-2 border-b border-[#343740] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">{selectedTable.name}</h3>
                      <span className="rounded bg-[#343740] px-2 py-0.5 text-[10px] font-bold text-slate-200">
                        {SEVENROOMS_TABLE_STYLES[selectedTableState].label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      PDV EPOC: <strong className="font-mono text-slate-200">{selectedTable.epocTableId}</strong> ·
                      Cap.:{" "}
                      <strong className="text-slate-200">
                        {selectedTable.minCapacity}–{selectedTable.maxCapacity}p
                      </strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={busy}
                      onClick={() => onAction({ action: "EPOC_RECONCILE_NOW" })}
                      className="rounded-lg border border-[#3a3d46] bg-[#2f323a] p-1.5 text-slate-300 hover:text-white"
                      title="Sincronizar status com PDV EPOC"
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
                    </button>
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
                          ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-200"
                          : "border-rose-500/40 bg-[#df6976]/20 text-rose-200"
                      }`}
                    >
                      {selectedTable.isLocked ? (
                        <>
                          <Unlock className="h-3.5 w-3.5" /> Destravar
                        </>
                      ) : (
                        <>
                          <Lock className="h-3.5 w-3.5" /> Travar
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Junção / Separação de Mesas (Ex: Mesa 11/04) */}
                <div className="rounded-lg border border-[#343740] bg-[#1e2024] p-2.5 text-xs">
                  {selectedTable.mergedWithIds.length > 0 ? (
                    <div className="flex items-center justify-between">
                      <span className="text-amber-300">
                        Junção ativa: <strong>Mesa {selectedTable.number}</strong> ({selectedTable.maxCapacity}p)
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
                        <Split className="h-3.5 w-3.5" /> Separar ({selectedTable.number})
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Juntar M{selectedTable.number} com:</span>
                      <div className="flex items-center gap-1.5">
                        <select
                          value={mergeTargetId}
                          onChange={(e) => setMergeTargetId(e.target.value)}
                          className="rounded border border-[#3a3d46] bg-[#25272c] px-2 py-1 text-xs text-white"
                        >
                          <option value="">Selecionar...</option>
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
                          className="flex items-center gap-1 rounded bg-[#3ea6d8]/20 border border-[#3ea6d8]/50 px-2.5 py-1 text-xs font-semibold text-sky-200 hover:bg-[#3ea6d8]/30 disabled:opacity-40"
                        >
                          <Link2 className="h-3.5 w-3.5" /> Juntar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bloco CRM 360º & IA para o Garçom */}
                {selectedGuest ? (
                  <div className="rounded-xl border border-[#d4885c]/40 bg-[#1e2024] p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="h-4 w-4 text-[#d4885c]" />
                          <span className="text-xs font-bold uppercase tracking-wider text-[#d4885c]">
                            Perfil Cliente & IA para o Garçom
                          </span>
                        </div>
                        <h4 className="mt-1 text-sm font-bold text-white">{selectedGuest.name}</h4>
                        <p className="text-[11px] text-slate-400">
                          CPF: <span className="font-mono text-slate-300">{selectedGuest.cpfMasked}</span> ·{" "}
                          {selectedGuest.visitsCount} visitas · Ticket Médio:{" "}
                          <strong className="text-[#55b699]">R$ {selectedGuest.averageTicket.toFixed(0)}</strong>
                        </p>
                      </div>
                      <button
                        onClick={() => onInspectGuest(selectedGuest.id)}
                        className="rounded-lg border border-[#d4885c]/40 bg-[#d4885c]/15 px-2.5 py-1 text-[11px] font-semibold text-[#f3b692] hover:bg-[#d4885c]/25"
                      >
                        Abrir CRM 360º
                      </button>
                    </div>

                    {selectedGuest.waiterAi.allergyAlert && (
                      <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-rose-500 bg-rose-950/70 px-3 py-2 text-xs font-bold text-rose-200">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                        <span>{selectedGuest.waiterAi.allergyAlert}</span>
                      </div>
                    )}

                    <div className="mt-2.5 space-y-2 text-xs">
                      <div className="rounded-lg bg-[#25272c] p-2.5">
                        <div className="flex items-center gap-1.5 font-semibold text-[#f3b692]">
                          <Wine className="h-3.5 w-3.5" />
                          <span>Sugestão de Vinho: {selectedGuest.waiterAi.wineTier}</span>
                        </div>
                        <ul className="mt-1 list-disc pl-4 text-[11px] text-slate-300 space-y-0.5">
                          {selectedGuest.waiterAi.recommendedWines.map((w) => (
                            <li key={w}>{w}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-lg bg-[#25272c] p-2.5">
                        <div className="flex items-center gap-1.5 font-semibold text-[#55b699]">
                          <Utensils className="h-3.5 w-3.5" />
                          <span>Pratos Recomendados</span>
                        </div>
                        <ul className="mt-1 list-disc pl-4 text-[11px] text-slate-300 space-y-0.5">
                          {selectedGuest.waiterAi.recommendedDishes.map((d) => (
                            <li key={d}>{d}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Botão Sentar Reserva quando a mesa está livre no EPOC */}
                {selectedTable.epocStatus === "FREE" && selectedTableReservation && (
                  <div className="rounded-xl border border-[#55b699]/50 bg-[#55b699]/15 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-[#8be4c9]">
                          Reserva Pronta ({selectedTableReservation.status})
                        </span>
                        <p className="text-[11px] text-slate-200">
                          {selectedTableReservation.guestName} · {selectedTableReservation.partySize}p às{" "}
                          {selectedTableReservation.time}
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
                        className="flex items-center gap-1.5 rounded-lg bg-[#55b699] px-3 py-2 text-xs font-bold text-slate-950 hover:bg-[#64c5a8]"
                      >
                        <UserCheck className="h-4 w-4" />
                        Sentar & Abrir EPOC
                      </button>
                    </div>
                  </div>
                )}

                {/* Comanda Viva do PDV EPOC */}
                {selectedTableOrder ? (
                  <div className="flex flex-col gap-2.5 rounded-xl border border-[#383b43] bg-[#1e2024] p-3.5">
                    <div className="flex items-center justify-between border-b border-[#30333a] pb-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-[#55b699]">
                          {selectedTableOrder.id}
                        </span>
                        <span className="ml-2 rounded bg-[#2d3037] px-2 py-0.5 text-[10px] text-slate-300">
                          {selectedTableOrder.status}
                        </span>
                      </div>
                      <span className="text-sm font-extrabold text-white">
                        R$ {selectedTableOrder.total.toFixed(2)}
                      </span>
                    </div>

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
                      <div className="flex justify-between border-t border-[#30333a] pt-1 text-[11px] text-slate-400">
                        <span>Taxa de Serviço (13%)</span>
                        <span>R$ {selectedTableOrder.serviceFeeTotal.toFixed(2)}</span>
                      </div>
                    </div>

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
                        className="rounded border border-[#d4885c]/50 bg-[#d4885c]/20 px-2.5 py-1 text-[11px] font-semibold text-[#f3b692] hover:bg-[#d4885c]/30"
                      >
                        + Lançar Vinho IA (EPOC)
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
                        className="rounded border border-[#383b43] bg-[#2d3037] px-2.5 py-1 text-[11px] text-slate-200 hover:bg-[#383b43]"
                      >
                        + Prato Wagyu (R$ 340)
                      </button>
                    </div>

                    <div className="mt-1 grid grid-cols-2 gap-2 border-t border-[#30333a] pt-2.5">
                      {selectedTable.epocStatus !== "CLOSING" && (
                        <button
                          disabled={busy}
                          onClick={() =>
                            onAction({
                              action: "EPOC_REQUEST_BILL",
                              tableId: selectedTable.id,
                            })
                          }
                          className="flex items-center justify-center gap-1.5 rounded-lg border border-[#55b699]/50 bg-[#55b699]/20 px-3 py-2 text-xs font-bold text-[#8be4c9] hover:bg-[#55b699]/30"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          Pedir Conta
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
                        className={`flex items-center justify-center gap-1.5 rounded-lg bg-[#55b699] px-3 py-2 text-xs font-bold text-slate-950 hover:bg-[#64c5a8] ${
                          selectedTable.epocStatus === "CLOSING" ? "col-span-2" : ""
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Fechar Conta EPOC & Liberar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-[#343740] bg-[#1e2024] p-3 text-xs text-slate-400">
                    <div className="flex items-center justify-between">
                      <span>Mesa livre no PDV EPOC.</span>
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
                          className="rounded bg-[#3ea6d8]/20 border border-[#3ea6d8]/40 px-2.5 py-1 text-[11px] font-semibold text-sky-300 hover:bg-[#3ea6d8]/30"
                        >
                          Abrir Walk-in EPOC
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-400">Selecione uma mesa no mapa.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
