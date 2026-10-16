import { NextRequest, NextResponse } from "next/server";
import {
  addEpocOrderItem,
  appendAudit,
  callWaitlistParty,
  closeOrderInEpoc,
  createReservationRecord,
  getDatabase,
  joinVirtualWaitlist,
  mergeTablesOnFloorplan,
  openWalkinDirectlyInEpoc,
  requestBillInEpoc,
  resetDatabaseToSeed,
  respondWaitlistCall,
  saveDatabase,
  seatPartyWithEpocAdapter,
  transitionReservationStatus,
  triggerWangariEnrichmentForGuest,
  unmergeTableOnFloorplan,
} from "@/lib/db";
import { getPartyBracket } from "@/lib/cpf-utils";

export async function GET() {
  const db = getDatabase();
  return NextResponse.json(db);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "RESET_SEED": {
        const db = resetDatabaseToSeed();
        return NextResponse.json({
          ok: true,
          message: "Banco de dados restaurado para o cenário padrão Night Beach Club — Vila Mariana.",
          db,
        });
      }

      case "SEAT_PARTY": {
        const res = seatPartyWithEpocAdapter({
          tableId: body.tableId,
          reservationId: body.reservationId,
          waitlistId: body.waitlistId,
          actorName: body.actorName,
        });
        return NextResponse.json(res, { status: res.ok ? 200 : 409 });
      }

      case "EPOC_OPEN_WALKIN": {
        const res = openWalkinDirectlyInEpoc({
          tableId: body.tableId,
          partySize: Number(body.partySize || 2),
          guestName: body.guestName,
          guestCpf: body.guestCpf,
          waiterName: body.waiterName,
        });
        return NextResponse.json(res, { status: res.ok ? 200 : 409 });
      }

      case "EPOC_ADD_ITEM": {
        const res = addEpocOrderItem({
          orderId: body.orderId,
          name: body.name,
          category: body.category || "PRATO",
          qty: Number(body.qty || 1),
          unitPrice: Number(body.unitPrice || 100),
          waiterName: body.waiterName,
        });
        return NextResponse.json(res);
      }

      case "EPOC_REQUEST_BILL": {
        const res = requestBillInEpoc(body.tableId);
        return NextResponse.json(res);
      }

      case "EPOC_CLOSE_ORDER": {
        const res = closeOrderInEpoc(body.tableId);
        return NextResponse.json(res);
      }

      case "EPOC_SET_CONNECTION_MODE": {
        const db = getDatabase();
        db.venue.epocConnectionMode = body.mode;
        if (body.mode !== "DEGRADED_OFFLINE") {
          db.venue.lastEpocReconciliationAt = new Date().toISOString();
          db.tables.forEach((t) => {
            if (t.epocStatus === "STALE") t.epocStatus = "FREE";
            t.lastEpocSyncAt = new Date().toISOString();
          });
        }
        appendAudit(
          db,
          "Gerente / EPOC Adapter",
          "EPOC_ADAPTER",
          "CONNECTION_MODE_CHANGED",
          `Modo de conexão com PDV EPOC alterado para ${body.mode}`
        );
        saveDatabase(db);
        return NextResponse.json({
          ok: true,
          message:
            body.mode === "DEGRADED_OFFLINE"
              ? "Modo Degradado ativado: mesas exibidas como Desatualizadas (cinza hachurado). Host opera manualmente até reconciliação."
              : `Conexão EPOC restaurada (${body.mode}) e reconciliação de 60s executada!`,
          db,
        });
      }

      case "EPOC_RECONCILE_NOW": {
        const db = getDatabase();
        db.venue.lastEpocReconciliationAt = new Date().toISOString();
        db.tables.forEach((t) => {
          t.lastEpocSyncAt = new Date().toISOString();
        });
        appendAudit(
          db,
          "EPOC Adapter Cron (60s)",
          "EPOC_ADAPTER",
          "FULL_STATE_RECONCILIATION",
          `Reconciliação completa executada em ${db.tables.length} mesas. 0 divergências pendentes.`
        );
        saveDatabase(db);
        return NextResponse.json({
          ok: true,
          message: `Reconciliação completa Mapa ↔ PDV EPOC concluída para ${db.tables.length} mesas!`,
          db,
        });
      }

      case "TABLE_TOGGLE_LOCK": {
        const db = getDatabase();
        const table = db.tables.find((t) => t.id === body.tableId);
        if (!table) {
          return NextResponse.json({ ok: false, message: "Mesa não encontrada.", db }, { status: 404 });
        }
        table.isLocked = !table.isLocked;
        table.epocStatus = table.isLocked ? "BLOCKED" : "FREE";
        table.lockReason = table.isLocked
          ? body.reason || "Bloqueada manualmente pelo Host/Gerente"
          : undefined;
        saveDatabase(db);
        return NextResponse.json({
          ok: true,
          message: table.isLocked
            ? `Mesa ${table.number} travada (vermelho com cadeado) no Mapa e no EPOC.`
            : `Mesa ${table.number} destravada e disponível.`,
          db,
        });
      }

      case "TABLE_MERGE": {
        const res = mergeTablesOnFloorplan(body.primaryTableId, body.secondaryTableId);
        return NextResponse.json(res, { status: res.ok ? 200 : 422 });
      }

      case "TABLE_UNMERGE": {
        const res = unmergeTableOnFloorplan(body.tableId);
        return NextResponse.json(res, { status: res.ok ? 200 : 422 });
      }

      case "FLOORPLAN_UPDATE_TABLE": {
        const db = getDatabase();
        const table = db.tables.find((t) => t.id === body.tableId);
        if (!table) {
          return NextResponse.json({ ok: false, message: "Mesa não encontrada.", db }, { status: 404 });
        }
        if (typeof body.x === "number") table.x = Number(body.x.toFixed(2));
        if (typeof body.y === "number") table.y = Number(body.y.toFixed(2));
        if (typeof body.minCapacity === "number") table.minCapacity = body.minCapacity;
        if (typeof body.maxCapacity === "number") {
          table.maxCapacity = body.maxCapacity;
          table.bracket = getPartyBracket(body.maxCapacity);
        }
        if (body.shape) table.shape = body.shape;
        if (typeof body.rotation === "number") table.rotation = body.rotation;
        if (body.name) table.name = body.name;
        if (body.number) table.number = body.number;
        saveDatabase(db);
        return NextResponse.json({
          ok: true,
          message: `Planta atualizada: Mesa ${table.number} salva.`,
          db,
        });
      }

      case "FLOORPLAN_CREATE_TABLE": {
        const db = getDatabase();
        const num = body.number || String(db.tables.length + 10);
        const maxCap = Number(body.maxCapacity || 4);
        const newTable = {
          id: `table-custom-${Date.now()}`,
          venueId: db.venue.id,
          areaId: body.areaId || "area-salao",
          epocTableId: `EPOC-M${num}`,
          number: num,
          name: body.name || `Mesa ${num}`,
          minCapacity: Number(body.minCapacity || 2),
          maxCapacity: maxCap,
          bracket: getPartyBracket(maxCap),
          shape: body.shape || "square",
          chairsTop: Math.ceil(maxCap / 2),
          chairsBottom: Math.floor(maxCap / 2),
          chairsLeft: 0,
          chairsRight: 0,
          x: Number(body.x || 3.5),
          y: Number(body.y || 3.5),
          width: maxCap >= 6 ? 3.2 : 2.2,
          height: 2.1,
          rotation: 0,
          isLocked: false,
          mergedWithIds: [],
          epocStatus: "FREE" as const,
          expectedDurationMins: 90,
          lastEpocSyncAt: new Date().toISOString(),
        };
        db.tables.push(newTable);
        saveDatabase(db);
        return NextResponse.json({
          ok: true,
          message: `Nova ${newTable.name} criada no ambiente e mapeada como ${newTable.epocTableId}!`,
          db,
        });
      }

      case "CREATE_RESERVATION": {
        const res = createReservationRecord({
          cpf: body.cpf,
          name: body.name,
          phone: body.phone,
          email: body.email,
          date: body.date || "2026-10-15",
          time: body.time || "20:30",
          partySize: Number(body.partySize || 2),
          areaId: body.areaId || "area-salao",
          origin: body.origin || "QR_CODE",
          notes: body.notes,
          tags: body.tags,
          allergies: body.allergies,
          consentMarketing: body.consentMarketing,
          consentEnrichment: body.consentEnrichment,
          idempotencyKey: body.idempotencyKey,
        });
        return NextResponse.json(res, { status: res.status });
      }

      case "TRANSITION_RESERVATION": {
        const res = transitionReservationStatus({
          reservationId: body.reservationId,
          qrVoucherToken: body.qrVoucherToken,
          nextStatus: body.nextStatus,
          actor: body.actor || "Host Tablet",
          channel: body.channel || "HOST_PANEL",
        });
        return NextResponse.json(res, { status: res.ok ? 200 : 400 });
      }

      case "JOIN_WAITLIST": {
        const res = joinVirtualWaitlist({
          cpf: body.cpf,
          name: body.name,
          phone: body.phone,
          partySize: Number(body.partySize || 2),
          preferredAreaId: body.preferredAreaId,
          needsAccessibility: body.needsAccessibility,
          isPriorityVip: body.isPriorityVip,
          priorityReason: body.priorityReason,
          origin: body.origin || "QR_PORTA",
          consentMarketing: body.consentMarketing,
          consentEnrichment: body.consentEnrichment,
        });
        return NextResponse.json(res, { status: res.ok ? 201 : 422 });
      }

      case "CALL_WAITLIST": {
        const res = callWaitlistParty(body.waitlistId, body.suggestedTableId);
        return NextResponse.json(res);
      }

      case "RESPOND_WAITLIST": {
        const res = respondWaitlistCall(body.waitlistId, body.responseAction);
        return NextResponse.json(res);
      }

      case "ENRICH_GUEST_WANGARI": {
        const res = triggerWangariEnrichmentForGuest(body.guestId);
        return NextResponse.json(res, { status: res.ok ? 200 : 422 });
      }

      case "UPDATE_GUEST_CONSENTS": {
        const db = getDatabase();
        const guest = db.guests.find((g) => g.id === body.guestId);
        if (!guest) {
          return NextResponse.json({ ok: false, message: "Cliente não encontrado.", db }, { status: 404 });
        }
        const nowIso = new Date().toISOString();
        if (typeof body.marketing === "boolean") {
          guest.consents.marketing.granted = body.marketing;
          guest.consents.marketing.updatedAt = nowIso;
        }
        if (typeof body.enrichment === "boolean") {
          guest.consents.enrichment.granted = body.enrichment;
          guest.consents.enrichment.updatedAt = nowIso;
          if (!body.enrichment) {
            guest.enrichmentStatus = "BLOCKED_LGPD";
          }
        }
        if (typeof body.dietaryHealth === "boolean") {
          guest.consents.dietaryHealth.granted = body.dietaryHealth;
          guest.consents.dietaryHealth.updatedAt = nowIso;
        }
        appendAudit(
          db,
          "Portal do Titular LGPD",
          "MARKETING",
          "CONSENT_UPDATED",
          `Consentimentos de ${guest.name} atualizados (Marketing=${guest.consents.marketing.granted}, Enriquecimento=${guest.consents.enrichment.granted})`,
          guest.cpfMasked
        );
        saveDatabase(db);
        return NextResponse.json({
          ok: true,
          message: `Consentimentos LGPD de ${guest.name} atualizados com sucesso.`,
          db,
        });
      }

      case "SWITCH_VENUE": {
        const db = getDatabase();
        const found = db.venuesList.find((v) => v.id === body.venueId);
        if (found) {
          db.venue = { ...found };
          saveDatabase(db);
        }
        return NextResponse.json({
          ok: true,
          message: `Unidade ativa alterada para ${db.venue.name}.`,
          db,
        });
      }

      default:
        return NextResponse.json(
          { ok: false, message: `Ação desconhecida: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 }
    );
  }
}
