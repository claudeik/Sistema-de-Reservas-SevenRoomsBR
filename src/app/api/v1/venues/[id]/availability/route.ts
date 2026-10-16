import { NextRequest, NextResponse } from "next/server";
import { computeTableVisualState, getDatabase } from "@/lib/db";

/**
 * GET /api/v1/venues/{id}/availability?date=2026-10-15&party_size=4&area=area-salao
 * Seção 9 e Seção 12:
 * - Reserva para hoje: planta, reservas e status atual do EPOC; mesas ocupadas entram com a previsão de liberação.
 * - Reserva para datas futuras: só planta e reservas; o EPOC não participa.
 * Meta de latência < 500ms (p95).
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const start = performance.now();
  const { id } = await context.params;
  const searchParams = req.nextUrl.searchParams;
  const date = searchParams.get("date") || "2026-10-15";
  const partySize = Number(searchParams.get("party_size") || 2);
  const areaFilter = searchParams.get("area");

  const db = getDatabase();
  const isToday = date === db.venue.activeDate;

  const areas = db.areas
    .filter((a) => !areaFilter || a.id === areaFilter)
    .map((area) => {
      const areaTables = db.tables.filter(
        (t) =>
          t.areaId === area.id &&
          !t.parentMergedIntoId &&
          !t.isLocked &&
          partySize >= t.minCapacity &&
          partySize <= t.maxCapacity
      );

      const immediatelyAvailableTables = areaTables.filter((t) => {
        if (!isToday) {
          const hasResOnDate = db.reservations.some(
            (r) =>
              r.date === date &&
              r.tableId === t.id &&
              ["REQUESTED", "CONFIRMED", "RECONFIRMED", "ARRIVED"].includes(r.status)
          );
          return !hasResOnDate;
        }
        return computeTableVisualState(t, db.reservations, db.venue) === "AVAILABLE";
      });

      const releasingSoonTables = isToday
        ? areaTables.filter((t) => t.epocStatus === "CLOSING" || t.epocStatus === "OPEN")
        : [];

      const slots = ["19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"].map((slot) => ({
        time: slot,
        available: immediatelyAvailableTables.length > 0 || releasingSoonTables.length > 0,
        freeTablesCount: immediatelyAvailableTables.length,
        epocPredictedReleaseCount: releasingSoonTables.length,
        overbookingMarginAvailable: db.venue.overbookingPercent > 0,
      }));

      return {
        areaId: area.id,
        epocAreaId: area.epocAreaId,
        name: area.name,
        avgStayMinutes: area.avgStayMinutes,
        compatibleTablesCount: areaTables.length,
        immediatelyFreeCount: immediatelyAvailableTables.length,
        epocRealTimeParticipates: isToday,
        slots,
      };
    });

  const latencyMs = Number((performance.now() - start).toFixed(2));
  return NextResponse.json({
    venueId: id,
    date,
    partySize,
    isTodayEpocLive: isToday,
    epocConnectionMode: db.venue.epocConnectionMode,
    latencyMs,
    slaTargetMs: 500,
    areas,
  });
}
