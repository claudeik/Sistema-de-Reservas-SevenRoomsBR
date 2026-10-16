import {
  Reservation,
  TableNode,
  TableVisualState,
  VenueConfig,
} from "@/types/domain";

/**
 * Regra oficial de Estado e Cor da Mesa (Seções 3, 7 e 12 da Especificação)
 * O status físico do EPOC sempre prevalece sobre o mapa em caso de divergência.
 */
export function computeTableVisualState(
  table: TableNode,
  reservations: Reservation[],
  venue: VenueConfig
): TableVisualState {
  if (venue.epocConnectionMode === "DEGRADED_OFFLINE" || table.epocStatus === "STALE") {
    return "STALE";
  }
  if (table.isLocked || table.epocStatus === "BLOCKED") {
    return "LOCKED";
  }
  if (table.epocStatus === "CLOSING") {
    return "CLOSING";
  }
  if (table.epocStatus === "OPEN") {
    if (table.currentReservationId || table.currentWaitlistId) {
      return "SEATED";
    }
    return "OCCUPIED_WALKIN";
  }

  // EPOC informa LIVRE (FREE) -> verificar se há reserva comprometida para esta mesa
  const activeRes = reservations.find(
    (r) =>
      r.tableId === table.id &&
      ["REQUESTED", "CONFIRMED", "RECONFIRMED", "ARRIVED"].includes(r.status)
  );

  if (activeRes) {
    if (activeRes.status === "RECONFIRMED" || activeRes.status === "ARRIVED") {
      return "RESERVED_CONFIRMED"; // Laranja
    }
    if (activeRes.isManual) {
      return "RESERVED_MANUAL"; // Roxo
    }
    return "RESERVED_ONLINE"; // Amarelo
  }

  return "AVAILABLE"; // Cinza
}
