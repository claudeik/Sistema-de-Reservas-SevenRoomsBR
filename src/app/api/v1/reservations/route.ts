import { NextRequest, NextResponse } from "next/server";
import { createReservationRecord, getDatabase } from "@/lib/db";

/**
 * GET /api/v1/reservations
 * POST /api/v1/reservations (Idempotente via Header Idempotency-Key)
 */
export async function GET() {
  const db = getDatabase();
  return NextResponse.json({
    count: db.reservations.length,
    items: db.reservations,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const headerIdem = req.headers.get("Idempotency-Key") || body.idempotencyKey;

  const result = createReservationRecord({
    cpf: body.cpf || "30841892044",
    name: body.name || "Cliente API v1",
    phone: body.phone || "+55 11 99999-0000",
    email: body.email,
    date: body.date || "2026-10-15",
    time: body.time || "20:30",
    partySize: Number(body.partySize || 2),
    areaId: body.areaId || "area-salao",
    origin: body.origin || "SUPERAPP",
    notes: body.notes,
    tags: body.tags,
    allergies: body.allergies,
    consentMarketing: body.consentMarketing,
    consentEnrichment: body.consentEnrichment,
    idempotencyKey: headerIdem,
  });

  // Regra 1 Seção 9: CPF nunca é devolvido em texto aberto na resposta pública; devolve identificador interno e CPF mascarado
  return NextResponse.json(
    {
      ok: result.ok,
      message: result.message,
      reservationId: result.reservation?.id,
      guestId: result.reservation?.guestId,
      guestCpfMasked: result.reservation?.guestCpfMasked,
      qrVoucherToken: result.reservation?.qrVoucherToken,
      assignedTableId: result.reservation?.tableId,
      status: result.reservation?.status,
    },
    { status: result.status }
  );
}
