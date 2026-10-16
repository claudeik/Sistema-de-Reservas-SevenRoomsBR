// Domain Types — Plataforma Avançada de Reservas, Fila Virtual, CRM 360º & PDV EPOC

export type TableVisualState =
  | "AVAILABLE"           // Cinza: EPOC livre + sem reserva no intervalo
  | "RESERVED_ONLINE"     // Amarelo: Reserva online (App, QR, Site, Linkbio)
  | "RESERVED_MANUAL"     // Roxo: Reserva manual (Balcão, Telefone, WhatsApp)
  | "RESERVED_CONFIRMED"  // Laranja: Reserva reconfirmada / check-in próximo
  | "SEATED"              // Verde: Sentados (EPOC aberta e vinculada à reserva/fila)
  | "CLOSING"             // Âmbar piscante / Em fechamento (EPOC conta solicitada)
  | "OCCUPIED_WALKIN"     // Azul petróleo: Ocupada sem reserva (aberta direto no EPOC)
  | "LOCKED"              // Vermelho com cadeado: Travada manual ou bloqueio no EPOC
  | "STALE";              // Cinza hachurado: Sem resposta do EPOC há > 30s

export type EpocTableStatus = "FREE" | "OPEN" | "CLOSING" | "BLOCKED" | "STALE";

export type ReservationStatus =
  | "REQUESTED"
  | "CONFIRMED"
  | "RECONFIRMED"
  | "ARRIVED"
  | "SEATED"
  | "FINISHED"
  | "CANCELLED"
  | "NO_SHOW"
  | "EXPIRED";

export type ReservationOrigin =
  | "SUPERAPP"
  | "QR_CODE"
  | "SITE"
  | "LINKBIO"
  | "BALCAO"
  | "TELEFONE"
  | "WHATSAPP"
  | "API_PARTNER";

export type WaitlistStatus =
  | "WAITING"
  | "CALLED"
  | "SEATED"
  | "ABANDONED"
  | "NO_RESPONSE"
  | "REMOVED";

export type PartyBracket = "1-2" | "2-4" | "5-10" | "12+";

export type MarketingClusterName =
  | "Premium frequente"
  | "Alto potencial adormecido"
  | "Frequente do dia a dia"
  | "Celebrações e grupos"
  | "Cultural e experiências"
  | "Novo com potencial"
  | "Baixa aderência de contato";

export interface AreaFloorElement {
  id: string;
  type: "wall" | "stage" | "bar" | "pool" | "label" | "plant";
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

export interface Area {
  id: string;
  venueId: string;
  epocAreaId: string;
  name: string;
  maxCapacity: number;
  widthMeters: number;
  heightMeters: number;
  bgImageUrl?: string;
  avgStayMinutes: number;
  elements: AreaFloorElement[];
}

export interface EpocOrderItem {
  id: string;
  name: string;
  category: "VINHO" | "PRATO" | "ENTRADA" | "DRINK" | "COUVERT" | "SOBREMESA";
  qty: number;
  unitPrice: number;
  addedAt: string;
  waiterName: string;
}

export interface EpocOrder {
  id: string;
  epocTableId: string;
  tableId: string;
  reservationId?: string;
  waitlistId?: string;
  guestCpf?: string;
  guestName?: string;
  partySize: number;
  waiterName: string;
  status: "OPEN" | "CLOSING" | "CLOSED";
  openedAt: string;
  closedAt?: string;
  items: EpocOrderItem[];
  couvertTotal: number;
  serviceFeeTotal: number;
  subtotal: number;
  total: number;
  idempotencyKey?: string;
}

export interface TableNode {
  id: string;
  venueId: string;
  areaId: string;
  epocTableId: string;
  number: string; // Ex.: "01", "11", "11/04"
  name: string;
  minCapacity: number;
  maxCapacity: number;
  bracket: PartyBracket;
  shape: "square" | "round" | "rectangle" | "booth" | "stool";
  chairsTop: number;
  chairsBottom: number;
  chairsLeft: number;
  chairsRight: number;
  x: number; // Em metros no canvas (0 a widthMeters)
  y: number; // Em metros no canvas (0 a heightMeters)
  width: number; // Em metros
  height: number; // Em metros
  rotation: number;
  isLocked: boolean;
  lockReason?: string;
  mergedWithIds: string[]; // IDs originais quando unidas (ex: Mesa 11 + Mesa 04 -> Mesa 11/04)
  parentMergedIntoId?: string; // Se esta mesa foi absorvida temporariamente em outra
  // Estado vindo do EPOC / Operação
  epocStatus: EpocTableStatus;
  currentOrderId?: string;
  currentReservationId?: string;
  currentWaitlistId?: string;
  seatedAt?: string;
  expectedFreeAt?: string;
  expectedDurationMins: number;
  optimisticLockUntil?: string;
  optimisticLockBy?: string;
  lastEpocSyncAt: string;
}

export interface SalesBoxFunnelStep {
  step: number | "APOIO";
  apiName: string;
  purpose: string;
  status: "SUCCESS" | "SKIPPED" | "FILTERED_OUT" | "PENDING";
  costTier: "LOW" | "MEDIUM" | "HIGH";
  updatedAt: string;
  outputSummary: string;
  fieldsWritten: Record<string, string | number | boolean>;
}

export interface WaiterAiSuggestion {
  wineTier: "CARO (Premium R$ 480–R$ 1.200)" | "MÉDIO (Reserva R$ 220–R$ 420)" | "SIMPLES (Taça / Seleção R$ 110–R$ 190)";
  recommendedWines: string[];
  recommendedDishes: string[];
  avoidItems: string[];
  allergyAlert?: string;
  approachTip: string;
}

export interface GuestTimelineEvent {
  id: string;
  date: string;
  type: "RESERVA" | "FILA" | "CONSUMO_EPOC" | "NO_SHOW" | "CANCELAMENTO" | "AVALIACAO" | "WHATSAPP" | "ENRIQUECIMENTO";
  title: string;
  description: string;
  amount?: number;
}

export interface GuestProfile {
  id: string;
  cpf: string;
  cpfMasked: string;
  cpfHash: string;
  name: string;
  phone: string;
  email?: string;
  phoneVerified: boolean;
  // Consentimentos LGPD
  consents: {
    service: { granted: boolean; updatedAt: string; channel: string; legalBasis: "Execução de Contrato" };
    marketing: { granted: boolean; updatedAt: string; channel: string; legalBasis: "Consentimento" };
    enrichment: { granted: boolean; updatedAt: string; channel: string; legalBasis: "Consentimento / Legítimo Interesse" };
    dietaryHealth: { granted: boolean; updatedAt: string; channel: string; legalBasis: "Consentimento Específico (Art. 11 LGPD)" };
  };
  // Métricas CRM & RFV
  visitsCount: number;
  noShowCount: number;
  cancellationsCount: number;
  averageTicket: number;
  totalSpent: number;
  lastVisitAt?: string;
  recencyDays: number;
  rfvScore: string; // Ex.: "R5-F5-V5"
  // Preferências
  winePreference: string;
  proteinPreference: string;
  dietaryRestrictions: string[];
  allergies: string[];
  preferredAreaId?: string;
  preferredTableNumber?: string;
  specialOccasion?: string;
  tags: string[];
  // Enriquecimento Wangari Data Hub + SalesBox
  enrichmentStatus: "ENRICHED" | "PENDING" | "BLOCKED_LGPD" | "REJECTED_QUALITY";
  enrichedAt?: string;
  salesBoxAttributes?: {
    cpfSituation: string;
    ageBracket: string;
    cityNeighborhood: string;
    cepAdherenceScore: number; // 0-100
    cpfPhoneMatchScore: number; // 0-100
    isRecycledNumber: boolean;
    hasWhatsApp: boolean;
    isBotBehavior: boolean;
    presumedIncomeBracket: string; // Apenas faixa, nunca valor exato (LGPD)
    profession?: string;
    company?: string;
    psychographicGroup: string; // PeopleScope (9 grupos)
    consumptionAffinities: string[];
    consumptionPotentialScore: number; // 0-1000
    consumptionPotentialTier: "ALTO" | "MÉDIO" | "ENTRADA";
    preferredChannel: "WHATSAPP" | "PUSH_SUPERAPP" | "SMS" | "EMAIL" | "DO_NOT_CONTACT";
  };
  salesBoxFunnelLog: SalesBoxFunnelStep[];
  marketingCluster: MarketingClusterName;
  clusterHistory: { cluster: MarketingClusterName; date: string }[];
  waiterAi: WaiterAiSuggestion;
  timeline: GuestTimelineEvent[];
}

export interface Reservation {
  id: string;
  venueId: string;
  guestId: string;
  guestName: string;
  guestCpfMasked: string;
  guestPhone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  shift: "ALMOÇO" | "JANTAR" | "SUNSET_SHOW";
  partySize: number;
  bracket: PartyBracket;
  areaId: string;
  tableId?: string;
  suggestedTableId?: string;
  status: ReservationStatus;
  origin: ReservationOrigin;
  isManual: boolean; // Define se no mapa é Amarelo (Online) ou Roxo (Manual) antes de confirmar
  notes?: string;
  tags: string[];
  depositStatus: "NONE" | "AUTHORIZED" | "PAID" | "REFUNDED";
  depositAmount: number;
  qrVoucherToken: string;
  qrUsedAt?: string;
  idempotencyKey: string;
  epocOrderId?: string;
  toleranceMinutes: number;
  createdAt: string;
  updatedAt: string;
  history: { status: ReservationStatus; at: string; by: string; channel: string }[];
}

export interface WaitlistEntry {
  id: string;
  venueId: string;
  guestId: string;
  guestName: string;
  guestCpfMasked: string;
  guestPhone: string;
  partySize: number;
  bracket: PartyBracket;
  preferredAreaId?: string;
  needsAccessibility: boolean;
  isPriorityVip: boolean;
  priorityReason?: string;
  status: WaitlistStatus;
  origin: "QR_PORTA" | "SUPERAPP" | "HOST";
  positionInBracket: number;
  estimatedWaitMins: number;
  notifyWhenBelowMins?: number;
  suggestedTableId?: string;
  calledAt?: string;
  responseDeadlineAt?: string;
  seatedTableId?: string;
  epocOrderId?: string;
  createdAt: string;
}

export interface QrCampaignCode {
  id: string;
  venueId: string;
  type: "VENUE_PORTA" | "WAITLIST_TOTEM" | "RESERVATION_VOUCHER" | "EVENT_GUESTLIST" | "TABLE_QR";
  title: string;
  placement: string;
  utmSource: string;
  shortUrl: string;
  deepLink: string;
  geofenceEnabled: boolean;
  scansCount: number;
  conversionsCount: number;
}

export interface WebhookLog {
  id: string;
  event:
    | "reservation.created"
    | "reservation.confirmed"
    | "reservation.updated"
    | "reservation.cancelled"
    | "reservation.checked_in"
    | "reservation.no_show"
    | "waitlist.joined"
    | "waitlist.called"
    | "waitlist.seated"
    | "waitlist.abandoned"
    | "table.status_changed"
    | "guest.created"
    | "guest.updated"
    | "guest.enriched"
    | "guest.segment_changed"
    | "epoc.order_opened"
    | "epoc.order_closing"
    | "epoc.order_closed";
  timestamp: string;
  hmacSignature: string;
  targetUrl: string;
  statusCode: number;
  latencyMs: number;
  payload: Record<string, unknown>;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  role: "HOST" | "GARCOM" | "GERENTE" | "MARKETING" | "API_SUPERAPP" | "EPOC_ADAPTER" | "DATA_HUB_WANGARI";
  action: string;
  targetCpfMasked?: string;
  details: string;
}

export interface VenueConfig {
  id: string;
  brandName: string;
  name: string;
  slug: string;
  city: string;
  activeShift: "ALMOÇO" | "JANTAR" | "SUNSET_SHOW";
  activeDate: string;
  toleranceMinutes: number;
  overbookingPercent: number;
  overbookingMaxSeats: number;
  waitlistPaused: boolean;
  waitlistMaxGroups: number;
  epocConnectionMode: "ONLINE_WEBHOOK" | "ONLINE_POLLING" | "DEGRADED_OFFLINE";
  lastEpocReconciliationAt: string;
}

export interface DatabaseState {
  venue: VenueConfig;
  venuesList: VenueConfig[];
  areas: Area[];
  tables: TableNode[];
  guests: GuestProfile[];
  reservations: Reservation[];
  waitlist: WaitlistEntry[];
  epocOrders: EpocOrder[];
  qrCodes: QrCampaignCode[];
  webhooks: WebhookLog[];
  auditLogs: AuditLogEntry[];
}
