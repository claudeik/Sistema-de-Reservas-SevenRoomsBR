import fs from "fs";
import path from "path";
import {
  DatabaseState,
  EpocOrder,
  EpocOrderItem,
  GuestProfile,
  Reservation,
  ReservationOrigin,
  ReservationStatus,
  TableNode,
  TableVisualState,
  VenueConfig,
  WaitlistEntry,
  WebhookLog,
} from "@/types/domain";
import {
  cleanCpf,
  getPartyBracket,
  hashCpf,
  maskCpf,
  runWangariSalesBoxFunnel,
} from "./cpf-utils";
import { createInitialSeedState } from "./seed-data";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "reservation-epoc-db.json");

export function getDatabase(): DatabaseState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initial = createInitialSeedState();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf-8");
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(raw) as DatabaseState;
  } catch {
    return createInitialSeedState();
  }
}

export function saveDatabase(state: DatabaseState): DatabaseState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to persist DB:", err);
  }
  return state;
}

export function resetDatabaseToSeed(): DatabaseState {
  const initial = createInitialSeedState();
  return saveDatabase(initial);
}

import { computeTableVisualState } from "./floorplan-utils";
export { computeTableVisualState };

/**
 * Algoritmo de sugestão automática da melhor mesa (Best-Fit)
 * Respeita faixa mín/máx da mesa, travas, junções e disponibilidade real no EPOC.
 */
export function findBestTableForParty(
  db: DatabaseState,
  partySize: number,
  preferredAreaId?: string
): TableNode | undefined {
  const candidates = db.tables.filter((t) => {
    if (t.parentMergedIntoId) return false;
    if (t.isLocked || t.epocStatus !== "FREE") return false;
    const state = computeTableVisualState(t, db.reservations, db.venue);
    if (state !== "AVAILABLE") return false;
    return partySize >= t.minCapacity && partySize <= t.maxCapacity;
  });

  if (candidates.length === 0) {
    // Fallback: aceita mesa um pouco maior se não houver encaixe exato no mín/máx
    const fallback = db.tables
      .filter((t) => {
        if (t.parentMergedIntoId || t.isLocked || t.epocStatus !== "FREE") return false;
        return (
          computeTableVisualState(t, db.reservations, db.venue) === "AVAILABLE" &&
          t.maxCapacity >= partySize
        );
      })
      .sort((a, b) => a.maxCapacity - b.maxCapacity);
    return fallback[0];
  }

  candidates.sort((a, b) => {
    const aAreaMatch = preferredAreaId && a.areaId === preferredAreaId ? 0 : 1;
    const bAreaMatch = preferredAreaId && b.areaId === preferredAreaId ? 0 : 1;
    if (aAreaMatch !== bAreaMatch) return aAreaMatch - bAreaMatch;
    // Menor desperdício de lugares (melhor encaixe)
    return a.maxCapacity - partySize - (b.maxCapacity - partySize);
  });

  return candidates[0];
}

export function emitWebhook(
  db: DatabaseState,
  event: WebhookLog["event"],
  payload: Record<string, unknown>,
  targetUrl = "https://api.superapp.com.br/v1/webhooks/events"
) {
  const wh: WebhookLog = {
    id: `wh-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
    event,
    timestamp: new Date().toISOString(),
    hmacSignature: `sha256=${Math.random().toString(16).slice(2, 18)}${Date.now().toString(16)}`,
    targetUrl,
    statusCode: 200,
    latencyMs: Math.floor(Math.random() * 95) + 38,
    payload,
  };
  db.webhooks.unshift(wh);
  if (db.webhooks.length > 50) db.webhooks.pop();
}

export function appendAudit(
  db: DatabaseState,
  actor: string,
  role: DatabaseState["auditLogs"][0]["role"],
  action: string,
  details: string,
  targetCpfMasked?: string
) {
  db.auditLogs.unshift({
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    timestamp: new Date().toLocaleTimeString("pt-BR", { hour12: false }),
    actor,
    role,
    action,
    targetCpfMasked,
    details,
  });
  if (db.auditLogs.length > 60) db.auditLogs.pop();
}

/**
 * Seção 12 — Alocação de mesa pelo mapa + Abertura de Comanda no PDV EPOC (EPOC Adapter)
 * Com trava otimista de 30s e Idempotency-Key.
 */
export function seatPartyWithEpocAdapter(params: {
  tableId: string;
  reservationId?: string;
  waitlistId?: string;
  actorName?: string;
}): { ok: boolean; message: string; order?: EpocOrder; db: DatabaseState } {
  const db = getDatabase();
  const table = db.tables.find((t) => t.id === params.tableId);
  if (!table) {
    return { ok: false, message: "Mesa não encontrada na planta.", db };
  }
  if (table.isLocked || table.epocStatus === "BLOCKED") {
    return { ok: false, message: `Mesa ${table.number} está travada (${table.lockReason || "Bloqueio EPOC"}).`, db };
  }
  if (table.epocStatus === "OPEN" || table.epocStatus === "CLOSING") {
    return {
      ok: false,
      message: `Conflito 409: O PDV EPOC informa que a Mesa ${table.number} já está ocupada (${table.epocStatus}).`,
      db,
    };
  }

  // Verifica trava otimista de 30s de outro tablet de host
  if (
    table.optimisticLockUntil &&
    new Date(table.optimisticLockUntil).getTime() > Date.now() &&
    table.optimisticLockBy &&
    table.optimisticLockBy !== (params.actorName || "Host Tablet #1")
  ) {
    return {
      ok: false,
      message: `Trava otimista ativa: ${table.optimisticLockBy} já está alocando a Mesa ${table.number}.`,
      db,
    };
  }

  const nowIso = new Date().toISOString();
  let guest: GuestProfile | undefined;
  let partySize = 2;
  let idempotencyKey = `seat-${table.id}-${Date.now()}`;

  if (params.reservationId) {
    const res = db.reservations.find((r) => r.id === params.reservationId);
    if (!res) return { ok: false, message: "Reserva não localizada.", db };
    guest = db.guests.find((g) => g.id === res.guestId);
    partySize = res.partySize;
    idempotencyKey = res.id;

    // Libera mesa anterior se estava pré-alocada em outra
    db.tables.forEach((t) => {
      if (t.currentReservationId === res.id && t.id !== table.id) {
        t.currentReservationId = undefined;
      }
    });

    res.tableId = table.id;
    res.status = "SEATED";
    res.updatedAt = nowIso;
    res.history.push({
      status: "SEATED",
      at: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      by: params.actorName || "Host Tablet + EPOC Adapter",
      channel: "MAPA_HOST",
    });
    table.currentReservationId = res.id;
  } else if (params.waitlistId) {
    const wl = db.waitlist.find((w) => w.id === params.waitlistId);
    if (!wl) return { ok: false, message: "Registro da fila não localizado.", db };
    guest = db.guests.find((g) => g.id === wl.guestId);
    partySize = wl.partySize;
    idempotencyKey = wl.id;

    wl.status = "SEATED";
    wl.seatedTableId = table.id;
    table.currentWaitlistId = wl.id;
  }

  // Checa idempotência no EPOC Adapter
  let order = db.epocOrders.find((o) => o.idempotencyKey === idempotencyKey && o.status !== "CLOSED");
  if (!order) {
    const orderNum = Math.floor(9050 + Math.random() * 900);
    const couvertTotal = partySize * 35;
    order = {
      id: `EPOC-CMD-${orderNum}`,
      epocTableId: table.epocTableId,
      tableId: table.id,
      reservationId: params.reservationId,
      waitlistId: params.waitlistId,
      guestCpf: guest?.cpf,
      guestName: guest?.name || "Cliente Sentado pelo Host",
      partySize,
      waiterName: "Carlos Eduardo (Sommelier & Garçom)",
      status: "OPEN",
      openedAt: nowIso,
      items: [],
      couvertTotal,
      subtotal: couvertTotal,
      serviceFeeTotal: Number((couvertTotal * 0.13).toFixed(2)),
      total: Number((couvertTotal * 1.13).toFixed(2)),
      idempotencyKey,
    };
    db.epocOrders.unshift(order);
  }

  table.epocStatus = "OPEN";
  table.currentOrderId = order.id;
  table.seatedAt = nowIso;
  table.expectedFreeAt = new Date(Date.now() + table.expectedDurationMins * 60 * 1000).toISOString();
  table.lastEpocSyncAt = nowIso;

  if (params.reservationId) {
    const res = db.reservations.find((r) => r.id === params.reservationId);
    if (res) res.epocOrderId = order.id;
  }
  if (params.waitlistId) {
    const wl = db.waitlist.find((w) => w.id === params.waitlistId);
    if (wl) {
      wl.epocOrderId = order.id;
      emitWebhook(db, "waitlist.seated", {
        waitlistId: wl.id,
        tableNumber: table.number,
        epocOrderId: order.id,
      });
    }
  }

  emitWebhook(db, "epoc.order_opened", {
    tableId: table.id,
    epocTableId: table.epocTableId,
    epocOrderId: order.id,
    idempotencyKey,
    partySize,
    cpfLinked: Boolean(guest?.cpf),
  });

  emitWebhook(db, "table.status_changed", {
    tableId: table.id,
    number: table.number,
    status: "SEATED",
    epocStatus: "OPEN",
  });

  appendAudit(
    db,
    "EPOC Adapter",
    "EPOC_ADAPTER",
    "SEAT_AND_OPEN_EPOC_ORDER",
    `Mesa ${table.number} (${table.epocTableId}) aberta com comanda ${order.id} (Idempotency-Key=${idempotencyKey})`,
    guest?.cpfMasked
  );

  saveDatabase(db);
  return {
    ok: true,
    message: `Comanda ${order.id} aberta no PDV EPOC! ${guest?.name || "Grupo"} sentado na Mesa ${table.number}.`,
    order,
    db,
  };
}

/**
 * Seção 12 Fluxo #6 — Mesa aberta direto no terminal PDV EPOC sem passar pelo Host (Walk-in)
 * Marca 'Ocupada sem reserva' e, se havia reserva futura nessa mesa, realoca ou alerta o host.
 */
export function openWalkinDirectlyInEpoc(params: {
  tableId: string;
  partySize: number;
  guestName?: string;
  guestCpf?: string;
  waiterName?: string;
}): { ok: boolean; message: string; conflictAlert?: string; db: DatabaseState } {
  const db = getDatabase();
  const table = db.tables.find((t) => t.id === params.tableId);
  if (!table) return { ok: false, message: "Mesa não encontrada.", db };
  if (table.epocStatus === "OPEN" || table.epocStatus === "CLOSING") {
    return { ok: false, message: `Mesa ${table.number} já está aberta no EPOC.`, db };
  }

  const nowIso = new Date().toISOString();
  let conflictAlert: string | undefined;

  // Verifica se havia uma reserva atribuída para esta mesa
  if (table.currentReservationId) {
    const res = db.reservations.find((r) => r.id === table.currentReservationId);
    if (res && ["REQUESTED", "CONFIRMED", "RECONFIRMED", "ARRIVED"].includes(res.status)) {
      const replacement = findBestTableForParty(db, res.partySize, res.areaId);
      if (replacement && replacement.id !== table.id) {
        res.tableId = replacement.id;
        res.suggestedTableId = replacement.id;
        replacement.currentReservationId = res.id;
        conflictAlert = `ALERTA EPOC: A Mesa ${table.number} tinha a reserva de ${res.guestName}. O motor realocou automaticamente a reserva para a Mesa ${replacement.number}!`;
      } else {
        res.tableId = undefined;
        conflictAlert = `ALERTA CRÍTICO: A Mesa ${table.number} foi aberta direto no EPOC e tinha a reserva de ${res.guestName} (${res.partySize}p). Realocação manual necessária!`;
      }
    }
    table.currentReservationId = undefined;
  }

  const orderNum = Math.floor(9100 + Math.random() * 800);
  const couvertTotal = params.partySize * 35;
  const order: EpocOrder = {
    id: `EPOC-CMD-${orderNum}`,
    epocTableId: table.epocTableId,
    tableId: table.id,
    guestCpf: params.guestCpf ? cleanCpf(params.guestCpf) : undefined,
    guestName: params.guestName || "Walk-in Aberto no Terminal EPOC",
    partySize: params.partySize,
    waiterName: params.waiterName || "Rafael Mendes (Terminal POS)",
    status: "OPEN",
    openedAt: nowIso,
    items: [],
    couvertTotal,
    subtotal: couvertTotal,
    serviceFeeTotal: Number((couvertTotal * 0.13).toFixed(2)),
    total: Number((couvertTotal * 1.13).toFixed(2)),
  };

  db.epocOrders.unshift(order);
  table.epocStatus = "OPEN";
  table.currentOrderId = order.id;
  table.seatedAt = nowIso;
  table.expectedFreeAt = new Date(Date.now() + table.expectedDurationMins * 60 * 1000).toISOString();
  table.lastEpocSyncAt = nowIso;

  emitWebhook(db, "table.status_changed", {
    tableId: table.id,
    number: table.number,
    status: "OCCUPIED_WALKIN",
    epocOrderId: order.id,
  });

  appendAudit(
    db,
    params.waiterName || "Terminal PDV EPOC",
    "EPOC_ADAPTER",
    "WALKIN_OPENED_IN_EPOC",
    `Mesa ${table.number} aberta direto no PDV EPOC sem vínculo de reserva (${order.id}). ${conflictAlert || ""}`
  );

  saveDatabase(db);
  return {
    ok: true,
    message: `Mesa ${table.number} aberta direto no EPOC (${order.id}) como 'Ocupada sem reserva'.`,
    conflictAlert,
    db,
  };
}

/**
 * Adiciona item de consumo na comanda aberta do EPOC
 */
export function addEpocOrderItem(params: {
  orderId: string;
  name: string;
  category: EpocOrderItem["category"];
  qty: number;
  unitPrice: number;
  waiterName?: string;
}): { ok: boolean; message: string; db: DatabaseState } {
  const db = getDatabase();
  const order = db.epocOrders.find((o) => o.id === params.orderId);
  if (!order) return { ok: false, message: "Comanda EPOC não encontrada.", db };

  order.items.push({
    id: `item-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    name: params.name,
    category: params.category,
    qty: params.qty,
    unitPrice: params.unitPrice,
    addedAt: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    waiterName: params.waiterName || order.waiterName,
  });

  const itemsSum = order.items.reduce((acc, it) => acc + it.qty * it.unitPrice, 0);
  order.subtotal = order.couvertTotal + itemsSum;
  order.serviceFeeTotal = Number((order.subtotal * 0.13).toFixed(2));
  order.total = Number((order.subtotal + order.serviceFeeTotal).toFixed(2));

  saveDatabase(db);
  return {
    ok: true,
    message: `Item '${params.name}' lançado na comanda ${order.id} (Total: R$ ${order.total.toFixed(2)}).`,
    db,
  };
}

/**
 * Solicita fechamento de conta no EPOC (Estado 'Em fechamento' / CLOSING)
 */
export function requestBillInEpoc(tableId: string): {
  ok: boolean;
  message: string;
  suggestedWaitlistNext?: WaitlistEntry;
  db: DatabaseState;
} {
  const db = getDatabase();
  const table = db.tables.find((t) => t.id === tableId);
  if (!table) return { ok: false, message: "Mesa não encontrada.", db };

  table.epocStatus = "CLOSING";
  table.expectedFreeAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  table.lastEpocSyncAt = new Date().toISOString();

  if (table.currentOrderId) {
    const order = db.epocOrders.find((o) => o.id === table.currentOrderId);
    if (order) order.status = "CLOSING";
  }

  const nextInQueue = db.waitlist.find(
    (w) =>
      w.status === "WAITING" &&
      w.partySize >= table.minCapacity &&
      w.partySize <= table.maxCapacity
  );
  if (nextInQueue) {
    nextInQueue.suggestedTableId = table.id;
    nextInQueue.estimatedWaitMins = 5;
  }

  emitWebhook(db, "epoc.order_closing", {
    tableId: table.id,
    number: table.number,
    expectedFreeInMinutes: 5,
    nextWaitlistSuggestion: nextInQueue?.guestName,
  });

  saveDatabase(db);
  return {
    ok: true,
    message: `Conta solicitada no EPOC para a Mesa ${table.number}. Alerta de liberação iminente ativado no mapa!`,
    suggestedWaitlistNext: nextInQueue,
    db,
  };
}

/**
 * Fechamento definitivo da conta no PDV EPOC:
 * - Libera a mesa (FREE) e desfaz junção temporária se aplicável
 * - Finaliza a reserva (FINISHED)
 * - Envia os itens e o valor total para o CRM 360º pelo CPF, recalcula Ticket Médio e Cluster
 * - Sugere o próximo grupo da fila ou reserva compatível
 */
export function closeOrderInEpoc(tableId: string): {
  ok: boolean;
  message: string;
  nextSuggestion?: { type: "WAITLIST" | "RESERVATION"; name: string; partySize: number; id: string };
  db: DatabaseState;
} {
  const db = getDatabase();
  const table = db.tables.find((t) => t.id === tableId);
  if (!table) return { ok: false, message: "Mesa não encontrada.", db };

  const order = db.epocOrders.find((o) => o.id === table.currentOrderId);
  const nowIso = new Date().toISOString();

  if (order) {
    order.status = "CLOSED";
    order.closedAt = nowIso;

    // Sincroniza consumo de volta para o CRM 360º por CPF (Seção 12)
    let guest = db.guests.find(
      (g) =>
        (order.guestCpf && cleanCpf(g.cpf) === cleanCpf(order.guestCpf)) ||
        (table.currentReservationId &&
          db.reservations.find((r) => r.id === table.currentReservationId)?.guestId === g.id)
    );

    if (guest) {
      guest.visitsCount += 1;
      guest.totalSpent = Number((guest.totalSpent + order.total).toFixed(2));
      guest.averageTicket = Number((guest.totalSpent / guest.visitsCount).toFixed(2));
      guest.lastVisitAt = nowIso;
      guest.recencyDays = 0;

      const itemsDesc =
        order.items.length > 0
          ? order.items.map((i) => `${i.qty}x ${i.name}`).join(", ")
          : "Consumo balcão / couvert";

      guest.timeline.unshift({
        id: `tl-epoc-${Date.now()}`,
        date: new Date().toLocaleString("pt-BR"),
        type: "CONSUMO_EPOC",
        title: `Conta Fechada no EPOC (${order.id}) — Mesa ${table.number}`,
        description: `${order.partySize} pessoas · Itens: ${itemsDesc} · Garçom: ${order.waiterName}`,
        amount: order.total,
      });

      if (guest.averageTicket >= 400 && !guest.tags.includes("Ticket Alto")) {
        guest.tags.push("Ticket Alto");
      }
      if (guest.consents.enrichment.granted) {
        const refreshed = runWangariSalesBoxFunnel(guest);
        guest.marketingCluster = refreshed.marketingCluster;
        guest.waiterAi = refreshed.waiterAi;
      }
    }
  }

  if (table.currentReservationId) {
    const res = db.reservations.find((r) => r.id === table.currentReservationId);
    if (res) {
      res.status = "FINISHED";
      res.updatedAt = nowIso;
      res.history.push({
        status: "FINISHED",
        at: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        by: "EPOC POS Fechamento",
        channel: "EPOC_POS",
      });
    }
  }

  table.epocStatus = "FREE";
  table.currentOrderId = undefined;
  table.currentReservationId = undefined;
  table.currentWaitlistId = undefined;
  table.seatedAt = undefined;
  table.expectedFreeAt = undefined;
  table.lastEpocSyncAt = nowIso;

  // Sugere o próximo grupo da fila ou reserva compatível
  const nextWaitlist = db.waitlist.find(
    (w) =>
      (w.status === "WAITING" || w.status === "CALLED") &&
      w.partySize >= table.minCapacity &&
      w.partySize <= table.maxCapacity
  );

  let nextSuggestion:
    | { type: "WAITLIST" | "RESERVATION"; name: string; partySize: number; id: string }
    | undefined;

  if (nextWaitlist) {
    nextWaitlist.suggestedTableId = table.id;
    nextSuggestion = {
      type: "WAITLIST",
      name: nextWaitlist.guestName,
      partySize: nextWaitlist.partySize,
      id: nextWaitlist.id,
    };
  } else {
    const nextRes = db.reservations.find(
      (r) =>
        ["CONFIRMED", "RECONFIRMED", "ARRIVED"].includes(r.status) &&
        !r.tableId &&
        r.partySize >= table.minCapacity &&
        r.partySize <= table.maxCapacity
    );
    if (nextRes) {
      nextRes.suggestedTableId = table.id;
      nextSuggestion = {
        type: "RESERVATION",
        name: nextRes.guestName,
        partySize: nextRes.partySize,
        id: nextRes.id,
      };
    }
  }

  emitWebhook(db, "epoc.order_closed", {
    tableId: table.id,
    number: table.number,
    orderId: order?.id,
    totalPaid: order?.total || 0,
    nextSuggestion,
  });

  appendAudit(
    db,
    "EPOC Adapter",
    "EPOC_ADAPTER",
    "ORDER_CLOSED_AND_TABLE_FREED",
    `Comanda ${order?.id || "N/A"} fechada (R$ ${(order?.total || 0).toFixed(2)}). Mesa ${table.number} liberada e consumo sincronizado ao CRM.`
  );

  saveDatabase(db);
  return {
    ok: true,
    message: `Conta fechada no EPOC! Mesa ${table.number} liberada e consumo enviado ao CRM.${
      nextSuggestion
        ? ` Sugestão imediata: sentar ${nextSuggestion.name} (${nextSuggestion.partySize}p).`
        : ""
    }`,
    nextSuggestion,
    db,
  };
}

/**
 * Junção e Separação de Mesas (Seção 7 — ex.: Mesa 11/04)
 */
export function mergeTablesOnFloorplan(primaryTableId: string, secondaryTableId: string): {
  ok: boolean;
  message: string;
  db: DatabaseState;
} {
  const db = getDatabase();
  if (primaryTableId === secondaryTableId) {
    return { ok: false, message: "Selecione duas mesas distintas para juntar.", db };
  }
  const t1 = db.tables.find((t) => t.id === primaryTableId);
  const t2 = db.tables.find((t) => t.id === secondaryTableId);
  if (!t1 || !t2) return { ok: false, message: "Mesas não encontradas.", db };
  if (t1.areaId !== t2.areaId) {
    return { ok: false, message: "Só é permitido juntar mesas do mesmo ambiente.", db };
  }
  if (t1.epocStatus !== "FREE" || t2.epocStatus !== "FREE") {
    return { ok: false, message: "Ambas as mesas precisam estar livres no EPOC para junção.", db };
  }

  const combinedNumber = `${t1.number}/${t2.number}`;
  t1.number = combinedNumber;
  t1.name = `Mesa ${combinedNumber} (Junção)`;
  t1.minCapacity = t1.minCapacity + t2.minCapacity;
  t1.maxCapacity = t1.maxCapacity + t2.maxCapacity;
  t1.bracket = getPartyBracket(t1.maxCapacity);
  t1.width = Number(Math.min(4.5, t1.width + 1.4).toFixed(1));
  t1.shape = "rectangle";
  t1.mergedWithIds = [...new Set([...t1.mergedWithIds, t1.id, t2.id])];
  t2.parentMergedIntoId = t1.id;

  appendAudit(
    db,
    "Host Tablet",
    "HOST",
    "TABLE_MERGE",
    `Mesas unidas formando ${t1.name} (Capacidade ${t1.minCapacity}–${t1.maxCapacity} lugares)`
  );

  saveDatabase(db);
  return {
    ok: true,
    message: `Mesas unidas com sucesso em ${t1.name} (${t1.minCapacity}–${t1.maxCapacity} lugares)!`,
    db,
  };
}

export function unmergeTableOnFloorplan(tableId: string): {
  ok: boolean;
  message: string;
  db: DatabaseState;
} {
  const db = getDatabase();
  const t1 = db.tables.find((t) => t.id === tableId);
  if (!t1 || t1.mergedWithIds.length === 0) {
    return { ok: false, message: "Esta mesa não possui junção ativa.", db };
  }

  // Caso especial da Mesa 11/04 que já veio unida na semente: cria/restaura Mesa 11 e Mesa 04
  const absorbed = db.tables.filter((t) => t.parentMergedIntoId === t1.id);
  if (absorbed.length > 0) {
    absorbed.forEach((child) => {
      child.parentMergedIntoId = undefined;
    });
    const parts = t1.number.split("/");
    t1.number = parts[0] || "11";
    t1.name = `Mesa ${t1.number}`;
    t1.minCapacity = 2;
    t1.maxCapacity = 4;
    t1.bracket = "2-4";
    t1.width = 2.2;
    t1.mergedWithIds = [];
  } else {
    const parts = t1.number.split("/");
    const firstNum = parts[0] || "11";
    const secondNum = parts[1] || "04";
    t1.number = firstNum;
    t1.name = `Mesa ${firstNum}`;
    t1.minCapacity = 4;
    t1.maxCapacity = 6;
    t1.bracket = "5-10";
    t1.width = 2.4;
    t1.mergedWithIds = [];

    db.tables.push({
      id: `table-${secondNum}-${Date.now()}`,
      venueId: t1.venueId,
      areaId: t1.areaId,
      epocTableId: `EPOC-M${secondNum}`,
      number: secondNum,
      name: `Mesa ${secondNum}`,
      minCapacity: 4,
      maxCapacity: 6,
      bracket: "5-10",
      shape: "square",
      chairsTop: 2,
      chairsBottom: 2,
      chairsLeft: 1,
      chairsRight: 1,
      x: Math.min(13.2, t1.x + 2.5),
      y: t1.y,
      width: 2.2,
      height: 2.1,
      rotation: 0,
      isLocked: false,
      mergedWithIds: [],
      epocStatus: "FREE",
      expectedDurationMins: 95,
      lastEpocSyncAt: new Date().toISOString(),
    });
  }

  saveDatabase(db);
  return { ok: true, message: `Junção desfeita! Mesas voltaram à capacidade original.`, db };
}

/**
 * Cria ou recupera cliente por CPF (Chave Única Multi-Unidade) e opcionalmente dispara o Funil SalesBox
 */
export function upsertGuestByCpf(
  db: DatabaseState,
  input: {
    cpf: string;
    name: string;
    phone: string;
    email?: string;
    consentMarketing?: boolean;
    consentEnrichment?: boolean;
    consentDietary?: boolean;
    allergies?: string[];
    winePreference?: string;
    channel: string;
  }
): GuestProfile {
  const digits = cleanCpf(input.cpf);
  let guest = db.guests.find((g) => cleanCpf(g.cpf) === digits);
  const nowIso = new Date().toISOString();

  if (!guest) {
    guest = {
      id: `guest-${Date.now()}-${digits.slice(-4)}`,
      cpf: digits,
      cpfMasked: maskCpf(digits),
      cpfHash: hashCpf(digits),
      name: input.name,
      phone: input.phone,
      email: input.email,
      phoneVerified: true,
      consents: {
        service: { granted: true, updatedAt: nowIso, channel: input.channel, legalBasis: "Execução de Contrato" },
        marketing: {
          granted: Boolean(input.consentMarketing),
          updatedAt: nowIso,
          channel: input.channel,
          legalBasis: "Consentimento",
        },
        enrichment: {
          granted: Boolean(input.consentEnrichment),
          updatedAt: nowIso,
          channel: input.channel,
          legalBasis: "Consentimento / Legítimo Interesse",
        },
        dietaryHealth: {
          granted: Boolean(input.consentDietary ?? (input.allergies && input.allergies.length > 0)),
          updatedAt: nowIso,
          channel: input.channel,
          legalBasis: "Consentimento Específico (Art. 11 LGPD)",
        },
      },
      visitsCount: 0,
      noShowCount: 0,
      cancellationsCount: 0,
      averageTicket: 0,
      totalSpent: 0,
      recencyDays: 0,
      rfvScore: "R5-F1-V3",
      winePreference: input.winePreference || "Em descoberta (Primeira visita)",
      proteinPreference: "Gastronomia Contemporânea",
      dietaryRestrictions: [],
      allergies: input.allergies || [],
      tags: ["Novo Cadastro"],
      enrichmentStatus: input.consentEnrichment ? "ENRICHED" : "PENDING",
      enrichedAt: input.consentEnrichment ? nowIso : undefined,
      salesBoxFunnelLog: [],
      marketingCluster: "Novo com potencial",
      clusterHistory: [{ cluster: "Novo com potencial", date: nowIso.slice(0, 10) }],
      waiterAi: {
        wineTier: "MÉDIO (Reserva R$ 220–R$ 420)",
        recommendedWines: ["Provence Rosé Whispering Angel (R$ 360)"],
        recommendedDishes: ["Burrata Artesanal ao Pesto de Pistache (R$ 96)"],
        avoidItems: [],
        approachTip: "Dar boas-vindas calorosas e apresentar carta de drinks e vinhos em taça/garrafa.",
      },
      timeline: [
        {
          id: `tl-create-${Date.now()}`,
          date: new Date().toLocaleString("pt-BR"),
          type: "RESERVA",
          title: `Perfil 360º unificado por CPF via ${input.channel}`,
          description: `Consentimentos LGPD registrados: Enriquecimento=${Boolean(input.consentEnrichment)}, Marketing=${Boolean(input.consentMarketing)}`,
        },
      ],
    };

    if (input.consentEnrichment) {
      const enriched = runWangariSalesBoxFunnel(guest);
      guest.salesBoxAttributes = enriched.salesBoxAttributes;
      guest.salesBoxFunnelLog = enriched.salesBoxFunnelLog;
      guest.marketingCluster = enriched.marketingCluster;
      guest.waiterAi = enriched.waiterAi;
      emitWebhook(db, "guest.enriched", {
        guestId: guest.id,
        cpfHash: guest.cpfHash,
        cluster: guest.marketingCluster,
      });
    }

    db.guests.unshift(guest);
    emitWebhook(db, "guest.created", { guestId: guest.id, cpfHash: guest.cpfHash });
  } else {
    guest.name = input.name || guest.name;
    guest.phone = input.phone || guest.phone;
    if (input.email) guest.email = input.email;
    if (input.allergies && input.allergies.length > 0) {
      guest.allergies = Array.from(new Set([...guest.allergies, ...input.allergies]));
    }
    if (input.consentEnrichment && guest.enrichmentStatus !== "ENRICHED") {
      guest.consents.enrichment.granted = true;
      guest.consents.enrichment.updatedAt = nowIso;
      guest.enrichmentStatus = "ENRICHED";
      guest.enrichedAt = nowIso;
      const enriched = runWangariSalesBoxFunnel(guest);
      guest.salesBoxAttributes = enriched.salesBoxAttributes;
      guest.salesBoxFunnelLog = enriched.salesBoxFunnelLog;
      guest.marketingCluster = enriched.marketingCluster;
      guest.waiterAi = enriched.waiterAi;
    }
  }

  return guest;
}

/**
 * Criar nova reserva (Idempotente via Idempotency-Key, Seção 4 e Seção 9)
 */
export function createReservationRecord(input: {
  cpf: string;
  name: string;
  phone: string;
  email?: string;
  date: string;
  time: string;
  partySize: number;
  areaId: string;
  origin: ReservationOrigin;
  notes?: string;
  tags?: string[];
  allergies?: string[];
  consentMarketing?: boolean;
  consentEnrichment?: boolean;
  idempotencyKey?: string;
}): { ok: boolean; status: number; message: string; reservation?: Reservation; db: DatabaseState } {
  const db = getDatabase();
  const idemKey = input.idempotencyKey || `idem-${cleanCpf(input.cpf)}-${input.date}-${input.time}`;

  const existingByIdem = db.reservations.find((r) => r.idempotencyKey === idemKey);
  if (existingByIdem) {
    return {
      ok: true,
      status: 200,
      message: "Reserva recuperada via Idempotency-Key (sem duplicação).",
      reservation: existingByIdem,
      db,
    };
  }

  const digits = cleanCpf(input.cpf);
  // Regra 7 Seção 4: Limite por CPF por dia para evitar reservas duplicadas
  const sameDayActive = db.reservations.find(
    (r) =>
      db.guests.find((g) => g.id === r.guestId && cleanCpf(g.cpf) === digits) &&
      r.date === input.date &&
      ["REQUESTED", "CONFIRMED", "RECONFIRMED", "ARRIVED", "SEATED"].includes(r.status)
  );
  if (sameDayActive) {
    return {
      ok: false,
      status: 422,
      message: `Regra 422: Este CPF já possui uma reserva ativa para ${input.date} às ${sameDayActive.time} (Protocolo ${sameDayActive.qrVoucherToken}).`,
      db,
    };
  }

  const guest = upsertGuestByCpf(db, {
    cpf: digits,
    name: input.name,
    phone: input.phone,
    email: input.email,
    consentMarketing: input.consentMarketing ?? true,
    consentEnrichment: input.consentEnrichment ?? true,
    allergies: input.allergies,
    channel: input.origin,
  });

  // Regra 5 Seção 4: Bloqueio opcional após N faltas (exige depósito se noShowCount >= 3)
  const requiresDeposit = guest.noShowCount >= 3 || input.partySize >= 8;
  const bestTable = findBestTableForParty(db, input.partySize, input.areaId);
  const isManual = ["BALCAO", "TELEFONE", "WHATSAPP"].includes(input.origin);
  const voucher = `QRV-NB-${input.time.replace(":", "")}-${guest.name.split(" ")[0].toUpperCase()}-${Math.floor(100 + Math.random() * 899)}`;

  const res: Reservation = {
    id: `res-${Date.now()}`,
    venueId: db.venue.id,
    guestId: guest.id,
    guestName: guest.name,
    guestCpfMasked: guest.cpfMasked,
    guestPhone: guest.phone,
    date: input.date,
    time: input.time,
    shift: parseInt(input.time.split(":")[0], 10) < 16 ? "ALMOÇO" : "JANTAR",
    partySize: input.partySize,
    bracket: getPartyBracket(input.partySize),
    areaId: input.areaId,
    tableId: bestTable?.id,
    suggestedTableId: bestTable?.id,
    status: "CONFIRMED",
    origin: input.origin,
    isManual,
    notes: input.notes,
    tags: [
      ...(input.tags || []),
      ...(guest.allergies.length > 0 ? ["Alergia"] : []),
      ...(requiresDeposit ? ["Depósito Garantido"] : []),
    ],
    depositStatus: requiresDeposit ? "AUTHORIZED" : "NONE",
    depositAmount: requiresDeposit ? input.partySize * 50 : 0,
    qrVoucherToken: voucher,
    idempotencyKey: idemKey,
    toleranceMinutes: db.venue.toleranceMinutes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    history: [
      {
        status: "CONFIRMED",
        at: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        by: guest.name,
        channel: input.origin,
      },
    ],
  };

  if (bestTable && !bestTable.currentReservationId) {
    bestTable.currentReservationId = res.id;
  }

  db.reservations.unshift(res);
  emitWebhook(db, "reservation.created", {
    reservationId: res.id,
    qrVoucherToken: res.qrVoucherToken,
    tableAssigned: bestTable?.number || "OVERBOOKING_POOL",
    origin: res.origin,
  });

  saveDatabase(db);
  return {
    ok: true,
    status: 201,
    message: `Reserva confirmada! Voucher QR: ${res.qrVoucherToken}${
      bestTable ? ` · Mesa pré-alocada: ${bestTable.number}` : " · Alocação inteligente no turno"
    }.`,
    reservation: res,
    db,
  };
}

/**
 * Transição da máquina de estados da reserva (Confirmada -> Reconfirmada -> Chegou / Check-in -> Cancelada / No-show)
 */
export function transitionReservationStatus(params: {
  reservationId?: string;
  qrVoucherToken?: string;
  nextStatus: ReservationStatus;
  actor: string;
  channel: string;
}): { ok: boolean; message: string; reservation?: Reservation; db: DatabaseState } {
  const db = getDatabase();
  const res = db.reservations.find(
    (r) =>
      (params.reservationId && r.id === params.reservationId) ||
      (params.qrVoucherToken &&
        r.qrVoucherToken.toUpperCase() === params.qrVoucherToken.trim().toUpperCase())
  );

  if (!res) {
    return { ok: false, message: "Reserva ou Voucher QR não encontrado.", db };
  }

  if (params.qrVoucherToken && res.qrUsedAt && params.nextStatus === "ARRIVED") {
    return {
      ok: false,
      message: `Voucher QR (${res.qrVoucherToken}) é de uso único e já fez check-in às ${new Date(
        res.qrUsedAt
      ).toLocaleTimeString("pt-BR")}!`,
      reservation: res,
      db,
    };
  }

  const nowIso = new Date().toISOString();
  res.status = params.nextStatus;
  res.updatedAt = nowIso;
  if (params.nextStatus === "ARRIVED") {
    res.qrUsedAt = nowIso;
    emitWebhook(db, "reservation.checked_in", {
      reservationId: res.id,
      guestName: res.guestName,
      tableId: res.tableId,
    });
  }

  if (params.nextStatus === "CANCELLED" || params.nextStatus === "NO_SHOW" || params.nextStatus === "EXPIRED") {
    // Libera a mesa para a fila virtual imediatamente!
    db.tables.forEach((t) => {
      if (t.currentReservationId === res.id) {
        t.currentReservationId = undefined;
      }
    });

    const guest = db.guests.find((g) => g.id === res.guestId);
    if (guest) {
      if (params.nextStatus === "NO_SHOW") {
        guest.noShowCount += 1;
        if (!guest.tags.includes("Risco de No-Show")) guest.tags.push("Risco de No-Show");
        guest.timeline.unshift({
          id: `tl-ns-${Date.now()}`,
          date: new Date().toLocaleString("pt-BR"),
          type: "NO_SHOW",
          title: `No-show registrado (${guest.noShowCount}º no histórico)`,
          description: `Mesa liberada automaticamente para a Fila Virtual após tolerância de ${res.toleranceMinutes} min.`,
        });
        emitWebhook(db, "reservation.no_show", { reservationId: res.id, guestId: guest.id });
      } else if (params.nextStatus === "CANCELLED") {
        guest.cancellationsCount += 1;
        emitWebhook(db, "reservation.cancelled", { reservationId: res.id, guestId: guest.id });
      }
    }
  }

  res.history.push({
    status: params.nextStatus,
    at: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    by: params.actor,
    channel: params.channel,
  });

  saveDatabase(db);
  return {
    ok: true,
    message: `Reserva de ${res.guestName} atualizada para ${params.nextStatus}.`,
    reservation: res,
    db,
  };
}

/**
 * Entrada na Fila Virtual ao Vivo (Seção 5)
 */
export function joinVirtualWaitlist(input: {
  cpf: string;
  name: string;
  phone: string;
  partySize: number;
  preferredAreaId?: string;
  needsAccessibility?: boolean;
  isPriorityVip?: boolean;
  priorityReason?: string;
  origin: "QR_PORTA" | "SUPERAPP" | "HOST";
  consentMarketing?: boolean;
  consentEnrichment?: boolean;
}): { ok: boolean; message: string; entry?: WaitlistEntry; db: DatabaseState } {
  const db = getDatabase();
  if (db.venue.waitlistPaused) {
    return { ok: false, message: "A Fila Virtual está temporariamente pausada pela gerência.", db };
  }

  const guest = upsertGuestByCpf(db, {
    cpf: input.cpf,
    name: input.name,
    phone: input.phone,
    consentMarketing: input.consentMarketing ?? true,
    consentEnrichment: input.consentEnrichment ?? true,
    channel: input.origin,
  });

  const bracket = getPartyBracket(input.partySize);
  const currentInBracket = db.waitlist.filter(
    (w) => w.bracket === bracket && (w.status === "WAITING" || w.status === "CALLED")
  );
  const position = input.isPriorityVip ? 1 : currentInBracket.length + 1;

  // Estimativa de espera inteligente usando Histórico de Mesas e mesas CLOSING
  const closingTableCompatible = db.tables.find(
    (t) =>
      t.epocStatus === "CLOSING" &&
      input.partySize >= t.minCapacity &&
      input.partySize <= t.maxCapacity
  );
  const freeTableCompatible = findBestTableForParty(db, input.partySize, input.preferredAreaId);

  const estimatedWaitMins = freeTableCompatible
    ? 2
    : closingTableCompatible
      ? 6 * position
      : 14 * position;

  const entry: WaitlistEntry = {
    id: `wait-${Date.now()}`,
    venueId: db.venue.id,
    guestId: guest.id,
    guestName: guest.name,
    guestCpfMasked: guest.cpfMasked,
    guestPhone: guest.phone,
    partySize: input.partySize,
    bracket,
    preferredAreaId: input.preferredAreaId,
    needsAccessibility: Boolean(input.needsAccessibility),
    isPriorityVip: Boolean(input.isPriorityVip || guest.tags.includes("VIP")),
    priorityReason: input.priorityReason || (guest.tags.includes("VIP") ? "Cliente VIP CRM" : undefined),
    status: "WAITING",
    origin: input.origin,
    positionInBracket: position,
    estimatedWaitMins,
    suggestedTableId: freeTableCompatible?.id || closingTableCompatible?.id,
    createdAt: new Date().toISOString(),
  };

  if (entry.isPriorityVip) {
    db.waitlist.unshift(entry);
    appendAudit(
      db,
      input.origin,
      "HOST",
      "WAITLIST_PRIORITY_INSERT",
      `Prioridade atribuída na fila para ${guest.name} (${entry.priorityReason || "Acessibilidade/VIP"})`,
      guest.cpfMasked
    );
  } else {
    db.waitlist.push(entry);
  }

  emitWebhook(db, "waitlist.joined", {
    waitlistId: entry.id,
    guestName: entry.guestName,
    bracket: entry.bracket,
    position: entry.positionInBracket,
    estimatedWaitMins: entry.estimatedWaitMins,
  });

  saveDatabase(db);
  return {
    ok: true,
    message: `${guest.name} entrou na Fila Virtual (${bracket} lugares) · Posição #${position} · Espera estimada: ~${estimatedWaitMins} min.`,
    entry,
    db,
  };
}

/**
 * Chamar cliente da Fila Virtual via WhatsApp/SMS/Push com prazo de 5 min (Seção 5 Regra 4)
 */
export function callWaitlistParty(waitlistId: string, suggestedTableId?: string): {
  ok: boolean;
  message: string;
  entry?: WaitlistEntry;
  db: DatabaseState;
} {
  const db = getDatabase();
  const entry = db.waitlist.find((w) => w.id === waitlistId);
  if (!entry) return { ok: false, message: "Cliente não encontrado na fila.", db };

  const bestTable = suggestedTableId
    ? db.tables.find((t) => t.id === suggestedTableId)
    : findBestTableForParty(db, entry.partySize, entry.preferredAreaId);

  entry.status = "CALLED";
  entry.calledAt = new Date().toISOString();
  entry.responseDeadlineAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  if (bestTable) {
    entry.suggestedTableId = bestTable.id;
  }

  emitWebhook(db, "waitlist.called", {
    waitlistId: entry.id,
    guestName: entry.guestName,
    phone: entry.guestPhone,
    suggestedTable: bestTable?.number,
    buttons: ["ESTOU_INDO", "PASSAR_A_VEZ", "SAIR_DA_FILA"],
  });

  saveDatabase(db);
  return {
    ok: true,
    message: `Notificação enviada via WhatsApp & Push para ${entry.guestName}! Prazo de resposta: 5 min${
      bestTable ? ` (Mesa sugerida: ${bestTable.number})` : ""
    }.`,
    entry,
    db,
  };
}

/**
 * Resposta do cliente na Fila Virtual: "Estou indo" | "Passar a vez" | "Sair da fila"
 */
export function respondWaitlistCall(
  waitlistId: string,
  action: "COMING" | "PASS_TURN" | "LEAVE"
): { ok: boolean; message: string; db: DatabaseState } {
  const db = getDatabase();
  const entry = db.waitlist.find((w) => w.id === waitlistId);
  if (!entry) return { ok: false, message: "Registro da fila não encontrado.", db };

  if (action === "COMING") {
    entry.estimatedWaitMins = 0;
    saveDatabase(db);
    return {
      ok: true,
      message: `${entry.guestName} confirmou 'Estou indo!' pelo WhatsApp/App. Pronto para sentar no mapa.`,
      db,
    };
  }

  if (action === "PASS_TURN") {
    entry.status = "WAITING";
    entry.calledAt = undefined;
    entry.responseDeadlineAt = undefined;
    entry.positionInBracket += 1;
    entry.estimatedWaitMins += 10;
    saveDatabase(db);
    return {
      ok: true,
      message: `${entry.guestName} escolheu 'Passar a vez' e cedeu lugar para o próximo grupo da faixa ${entry.bracket}.`,
      db,
    };
  }

  entry.status = "ABANDONED";
  emitWebhook(db, "waitlist.abandoned", { waitlistId: entry.id, guestName: entry.guestName });
  saveDatabase(db);
  return {
    ok: true,
    message: `${entry.guestName} saiu da fila em 1 toque.`,
    db,
  };
}

/**
 * Executa ou atualiza o Funil Data Hub Wangari + 11 APIs SalesBox para um cliente (Seção 11)
 */
export function triggerWangariEnrichmentForGuest(guestId: string): {
  ok: boolean;
  message: string;
  guest?: GuestProfile;
  db: DatabaseState;
} {
  const db = getDatabase();
  const guest = db.guests.find((g) => g.id === guestId);
  if (!guest) return { ok: false, message: "Perfil não encontrado no CRM.", db };

  if (!guest.consents.enrichment.granted) {
    return {
      ok: false,
      message:
        "Bloqueio LGPD: O titular não concedeu consentimento para Enriquecimento de Dados. Ative a base legal antes de consultar o Data Hub.",
      guest,
      db,
    };
  }

  const oldCluster = guest.marketingCluster;
  const enriched = runWangariSalesBoxFunnel(guest);
  guest.enrichmentStatus = "ENRICHED";
  guest.enrichedAt = new Date().toISOString();
  guest.salesBoxAttributes = enriched.salesBoxAttributes;
  guest.salesBoxFunnelLog = enriched.salesBoxFunnelLog;
  guest.marketingCluster = enriched.marketingCluster;
  guest.waiterAi = enriched.waiterAi;

  guest.timeline.unshift({
    id: `tl-enr-${Date.now()}`,
    date: new Date().toLocaleString("pt-BR"),
    type: "ENRIQUECIMENTO",
    title: "Enriquecimento Wangari Data Hub + SalesBox (11 APIs em funil)",
    description: `Score Consumo ${enriched.salesBoxAttributes.consumptionPotentialScore}/1000 · Cluster: ${enriched.marketingCluster}`,
  });

  emitWebhook(db, "guest.enriched", {
    guestId: guest.id,
    cpfHash: guest.cpfHash,
    score: enriched.salesBoxAttributes.consumptionPotentialScore,
    cluster: guest.marketingCluster,
  });

  if (oldCluster !== guest.marketingCluster) {
    guest.clusterHistory.push({
      cluster: guest.marketingCluster,
      date: new Date().toISOString().slice(0, 10),
    });
    emitWebhook(db, "guest.segment_changed", {
      guestId: guest.id,
      previousCluster: oldCluster,
      newCluster: guest.marketingCluster,
    });
  }

  appendAudit(
    db,
    "Wangari Data Hub Connector",
    "DATA_HUB_WANGARI",
    "SALESBOX_FUNNEL_EXECUTION",
    `11 APIs avaliadas em funil para ${guest.name}. Cluster atribuído: ${guest.marketingCluster}.`,
    guest.cpfMasked
  );

  saveDatabase(db);
  return {
    ok: true,
    message: `Funil Wangari/SalesBox concluído para ${guest.name}! Cluster: ${guest.marketingCluster}.`,
    guest,
    db,
  };
}
