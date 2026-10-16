"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Crown,
  Flame,
  Filter,
  Gift,
  Layers,
  Megaphone,
  MessageSquare,
  Palette,
  Percent,
  PlusCircle,
  Send,
  ShoppingBag,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Utensils,
  Wine,
  Zap,
} from "lucide-react";
import { DatabaseState, GuestProfile } from "@/types/domain";

interface CampaignsAndYieldPanelProps {
  db: DatabaseState;
  onAction: (payload: Record<string, unknown>) => Promise<void>;
  onInspectGuest: (guestId: string) => void;
  busy: boolean;
}

export interface YieldSlot {
  id: string;
  dayIndex: number; // 0 = Seg, 1 = Ter, 2 = Qua, 3 = Qui, 4 = Sex, 5 = Sab, 6 = Dom
  dayLabel: string;
  dayShort: string;
  dateIso: string;
  timeSlot: string;
  shiftLabel: string;
  totalTables: number;
  bookedTables: number;
  idleTableNames: string[];
  avgSlotTicket: number;
  recommendedTheme: "WINE_CONNOISSEUR" | "EXECUTIVE_HOLDING" | "FASHION_TRUNK" | "CULTURE_VERNISSAGE" | "WINBACK_VIP";
}

interface GuestPropensityEvaluation {
  guest: GuestProfile;
  propensityScore: number; // 0 - 99
  recencyDays: number;
  avgTicket: number;
  favoriteEpocItem: string;
  epocCategory: string;
  rfvSegment: "CHAMPION" | "LOYAL_VIP" | "WINBACK_RISK" | "POTENTIAL";
  lifestyleTag: "FASHION" | "CULTURE" | "WINE" | "EXECUTIVE";
  matchReasons: string[];
  expectedSpend: number;
  recommendedTable: string;
  personalizedHook: string;
}

interface LaunchedCampaignRecord {
  id: string;
  title: string;
  slotLabel: string;
  channel: "WHATSAPP_CONCIERGE" | "SMS_VIP" | "EMAIL_PRIVATE";
  audienceCount: number;
  avgPropensity: number;
  expectedConversions: number;
  projectedRevenue: number;
  tablesFilled: number;
  createdAt: string;
  incentive: string;
}

const DAYS_META = [
  { index: 0, short: "SEG", label: "Segunda-feira", dateIso: "2026-10-19" },
  { index: 1, short: "TER", label: "Terça-feira", dateIso: "2026-10-20" },
  { index: 2, short: "QUA", label: "Quarta-feira", dateIso: "2026-10-21" },
  { index: 3, short: "QUI", label: "Quinta-feira", dateIso: "2026-10-22" },
  { index: 4, short: "SEX", label: "Sexta-feira", dateIso: "2026-10-23" },
  { index: 5, short: "SÁB", label: "Sábado", dateIso: "2026-10-24" },
  { index: 6, short: "DOM", label: "Domingo", dateIso: "2026-10-25" },
];

const SHIFT_SLOTS = [
  {
    timeSlot: "12:00 - 14:30",
    shiftLabel: "Almoço Executivo",
    baseBookings: [4, 5, 6, 8, 11, 12, 11],
    themes: [
      "EXECUTIVE_HOLDING",
      "EXECUTIVE_HOLDING",
      "EXECUTIVE_HOLDING",
      "EXECUTIVE_HOLDING",
      "WINE_CONNOISSEUR",
      "FASHION_TRUNK",
      "CULTURE_VERNISSAGE",
    ] as const,
  },
  {
    timeSlot: "15:00 - 17:30",
    shiftLabel: "Late Lunch & Sunset",
    baseBookings: [2, 2, 3, 4, 7, 10, 9],
    themes: [
      "FASHION_TRUNK",
      "FASHION_TRUNK",
      "CULTURE_VERNISSAGE",
      "FASHION_TRUNK",
      "FASHION_TRUNK",
      "CULTURE_VERNISSAGE",
      "WINBACK_VIP",
    ] as const,
  },
  {
    timeSlot: "18:00 - 19:30",
    shiftLabel: "Early Dinner / Aperitivo",
    baseBookings: [3, 3, 4, 5, 9, 11, 8],
    themes: [
      "CULTURE_VERNISSAGE",
      "WINE_CONNOISSEUR",
      "CULTURE_VERNISSAGE",
      "WINE_CONNOISSEUR",
      "WINE_CONNOISSEUR",
      "FASHION_TRUNK",
      "WINBACK_VIP",
    ] as const,
  },
  {
    timeSlot: "20:00 - 22:00",
    shiftLabel: "Prime Dinner",
    baseBookings: [4, 5, 7, 10, 12, 12, 7],
    themes: [
      "WINBACK_VIP",
      "WINE_CONNOISSEUR",
      "WINBACK_VIP",
      "WINE_CONNOISSEUR",
      "WINE_CONNOISSEUR",
      "WINE_CONNOISSEUR",
      "WINBACK_VIP",
    ] as const,
  },
  {
    timeSlot: "22:15 - 23:45",
    shiftLabel: "Late Night & Digestivo",
    baseBookings: [2, 2, 3, 6, 10, 11, 3],
    themes: [
      "WINBACK_VIP",
      "CULTURE_VERNISSAGE",
      "WINE_CONNOISSEUR",
      "FASHION_TRUNK",
      "FASHION_TRUNK",
      "WINE_CONNOISSEUR",
      "WINBACK_VIP",
    ] as const,
  },
];

const ALL_SEVENROOMS_TABLES = [
  "20",
  "21",
  "22",
  "23",
  "31",
  "32",
  "33",
  "34",
  "35",
  "36",
  "37",
  "04",
];

export default function CampaignsAndYieldPanel({
  db,
  onAction,
  onInspectGuest,
  busy,
}: CampaignsAndYieldPanelProps) {
  // Slot selecionado no mapa de baixa alocação (Default: Terça 18:00 - 19:30 com 25% de ocupação)
  const [selectedSlotId, setSelectedSlotId] = useState<string>("slot-1-18:00 - 19:30");
  const [segmentFilter, setSegmentFilter] = useState<
    "ALL" | "HIGH_PROPENSITY_75" | "WINBACK_RISK" | "WINE_LOVERS" | "FASHION_CULTURE"
  >("ALL");
  const [selectedChannel, setSelectedChannel] = useState<
    "WHATSAPP_CONCIERGE" | "SMS_VIP" | "EMAIL_PRIVATE"
  >("WHATSAPP_CONCIERGE");
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const [customIncentive, setCustomIncentive] = useState<string>("");
  const [customCampaignTitle, setCustomCampaignTitle] = useState<string>("");
  const [slotBookedBoost, setSlotBookedBoost] = useState<Record<string, number>>({});
  const [launchedCampaigns, setLaunchedCampaigns] = useState<LaunchedCampaignRecord[]>([
    {
      id: "camp-hist-1",
      title: "Terça Brunello & Decanter — Mesa Garantida",
      slotLabel: "Terça-feira · 20:00 - 22:00",
      channel: "WHATSAPP_CONCIERGE",
      audienceCount: 18,
      avgPropensity: 86,
      expectedConversions: 6,
      projectedRevenue: 8640,
      tablesFilled: 5,
      createdAt: "Semana passada",
      incentive: "Isenção de 1ª Rolha ou Taça Brunello Riserva Cortesia do Sommelier",
    },
  ]);

  // Constrói a matriz completa de 7 dias x 5 faixas de horário
  const yieldSlots = useMemo<YieldSlot[]>(() => {
    const totalTables = ALL_SEVENROOMS_TABLES.length; // 12 mesas no mapa SevenRooms
    const list: YieldSlot[] = [];

    SHIFT_SLOTS.forEach((shift) => {
      DAYS_META.forEach((day) => {
        const id = `slot-${day.index}-${shift.timeSlot}`;
        const boost = slotBookedBoost[id] ?? 0;
        const bookedTables = Math.min(
          totalTables,
          shift.baseBookings[day.index] + boost
        );
        const idleCount = Math.max(0, totalTables - bookedTables);
        const idleTableNames = ALL_SEVENROOMS_TABLES.slice(0, idleCount);

        list.push({
          id,
          dayIndex: day.index,
          dayLabel: day.label,
          dayShort: day.short,
          dateIso: day.dateIso,
          timeSlot: shift.timeSlot,
          shiftLabel: shift.shiftLabel,
          totalTables,
          bookedTables,
          idleTableNames,
          avgSlotTicket:
            shift.timeSlot.startsWith("12:")
              ? 680
              : shift.timeSlot.startsWith("15:")
                ? 820
                : 1380,
          recommendedTheme: shift.themes[day.index],
        });
      });
    });

    return list;
  }, [slotBookedBoost]);

  const activeSlot = useMemo(
    () => yieldSlots.find((s) => s.id === selectedSlotId) ?? yieldSlots[0],
    [yieldSlots, selectedSlotId]
  );

  // Sumário de gargalos de baixa alocação (< 45% ocupação)
  const lowAllocationSlots = useMemo(
    () =>
      yieldSlots
        .filter((s) => s.bookedTables / s.totalTables <= 0.45)
        .sort((a, b) => a.bookedTables / a.totalTables - b.bookedTables / b.totalTables),
    [yieldSlots]
  );

  // Motor de Propensão por Cliente para o Slot Selecionado
  const guestEvaluations = useMemo<GuestPropensityEvaluation[]>(() => {
    return db.guests
      .map((guest, idx) => {
        const guestOrders = db.epocOrders.filter(
          (o) => o.guestCpf === guest.cpf || o.guestName === guest.name
        );
        const allItems = guestOrders.flatMap((o) => o.items);
        const favoriteItem =
          allItems.sort((a, b) => b.unitPrice - a.unitPrice)[0]?.name ??
          (guest.tags.some((t) => t.toLowerCase().includes("vinho"))
            ? "Brunello di Montalcino Riserva"
            : "Wagyu A5 Miyazaki & Trufas");

        const epocCategory = allItems.some((i) => i.category === "VINHO")
          ? "Vinhos de Guarda & Sommelier"
          : allItems.some((i) => i.category === "DRINK")
            ? "Alta Coquetelaria Autor"
            : "Alta Gastronomia & Cortes Nobres";

        const avgTicket =
          guest.visitsCount > 0
            ? Math.round(guest.totalSpent / guest.visitsCount)
            : guest.averageTicket || 650;

        // Recência baseada no histórico do guest
        const hasOpenOrder = guestOrders.some((o) => o.status !== "CLOSED");
        const recencyDays = hasOpenOrder
          ? 2
          : guest.recencyDays > 0
            ? guest.recencyDays
            : 18 + idx * 6;

        const isWineLover =
          guest.tags.some((t) =>
            /vinho|wine|brunello|barolo|sommelier|champagne/i.test(t)
          ) || epocCategory.includes("Vinho");

        const profession = guest.salesBoxAttributes?.profession ?? "";
        const potentialScore =
          guest.salesBoxAttributes?.consumptionPotentialScore ?? 820;

        const isExecutive =
          Boolean(profession.match(/Sócio|CEO|Diretor|Board|Invest|Executivo/i)) ||
          potentialScore >= 900;

        const isFashion =
          Boolean(
            guest.salesBoxAttributes?.consumptionAffinities?.some((a) =>
              /moda|luxo|fashion|arte|joia/i.test(a)
            )
          ) || guest.tags.some((t) => /fashion|champagne|jardins|vip/i.test(t));

        const rfvSegment: GuestPropensityEvaluation["rfvSegment"] =
          recencyDays > 21 && avgTicket >= 550
            ? "WINBACK_RISK"
            : guest.visitsCount >= 8 && avgTicket >= 600
              ? "CHAMPION"
              : guest.visitsCount >= 4
                ? "LOYAL_VIP"
                : "POTENTIAL";

        const lifestyleTag: GuestPropensityEvaluation["lifestyleTag"] = isWineLover
          ? "WINE"
          : isFashion
            ? "FASHION"
            : isExecutive
              ? "EXECUTIVE"
              : "CULTURE";

        // Cálculo Matemático de Propensão (0 - 99%) específico para o activeSlot
        let score = 58;
        const reasons: string[] = [];

        // 1. Fit com o Tema do Slot Ocioso
        if (activeSlot.recommendedTheme === "WINE_CONNOISSEUR" && isWineLover) {
          score += 19;
          reasons.push("Alta afinidade com Vinhos de Guarda no turno de baixa ocupação");
        } else if (activeSlot.recommendedTheme === "EXECUTIVE_HOLDING" && isExecutive) {
          score += 21;
          reasons.push(
            `Perfil C-Level (${profession || "Holding"}) ideal para ${activeSlot.shiftLabel}`
          );
        } else if (activeSlot.recommendedTheme === "FASHION_TRUNK" && isFashion) {
          score += 18;
          reasons.push("Cluster Fashion/Luxury Jardins compatível com horário alternativo");
        } else if (activeSlot.recommendedTheme === "CULTURE_VERNISSAGE") {
          score += 15;
          reasons.push("Afinidade Cultural SP-Arte / Galeria pós-expediente");
        } else if (
          activeSlot.recommendedTheme === "WINBACK_VIP" &&
          rfvSegment === "WINBACK_RISK"
        ) {
          score += 22;
          reasons.push(`Janela crítica de Win-Back (${recencyDays} dias sem visita)`);
        } else {
          score += 9;
        }

        // 2. Janela de Recência (Ciclo de Recompra)
        if (recencyDays >= 12 && recencyDays <= 35) {
          score += 12;
          reasons.push(`Ciclo de retorno ideal (${recencyDays}d desde última visita)`);
        } else if (recencyDays > 35) {
          score += 8;
          reasons.push(`Cliente inativo há ${recencyDays}d — sensível a convite VIP`);
        } else {
          score += 5;
          reasons.push("Cliente ativo com alta lembrança de marca");
        }

        // 3. Fit Financeiro / Wangari Data Hub
        if (potentialScore >= 850) {
          score += 7;
          reasons.push(
            `Renda ${guest.salesBoxAttributes?.presumedIncomeBracket ?? "Alta"} · Ticket R$ ${avgTicket}`
          );
        }

        const clampedScore = Math.min(98, Math.max(52, score));
        const recommendedTable =
          activeSlot.idleTableNames[idx % Math.max(1, activeSlot.idleTableNames.length)] ??
          "04";

        const personalizedHook =
          activeSlot.recommendedTheme === "WINE_CONNOISSEUR"
            ? `Reserva da Mesa ${recommendedTable} com abertura de ${favoriteItem} em taça/Magnum sem taxa de rolha.`
            : activeSlot.recommendedTheme === "EXECUTIVE_HOLDING"
              ? `Mesa executiva reservada (${recommendedTable}) com Menu Business & Sommelier Express.`
              : activeSlot.recommendedTheme === "FASHION_TRUNK"
                ? `Private Trunk Show Jardins + Taça Franciacorta cortesia ao chegar na Mesa ${recommendedTable}.`
                : activeSlot.recommendedTheme === "CULTURE_VERNISSAGE"
                  ? `Acesso Private Viewing Galeria + Menu Harmonizado com ${favoriteItem} às ${activeSlot.timeSlot.split(" ")[0]}.`
                  : `Convite Win-Back Sommelier: ${favoriteItem} preparado para seu retorno na Mesa ${recommendedTable}.`;

        return {
          guest,
          propensityScore: clampedScore,
          recencyDays,
          avgTicket,
          favoriteEpocItem: favoriteItem,
          epocCategory,
          rfvSegment,
          lifestyleTag,
          matchReasons: reasons,
          expectedSpend: Math.round(avgTicket * 2.1),
          recommendedTable,
          personalizedHook,
        };
      })
      .sort((a, b) => b.propensityScore - a.propensityScore);
  }, [db.guests, db.epocOrders, activeSlot]);

  // Aplica o filtro de segmentação
  const filteredEvaluations = useMemo(() => {
    return guestEvaluations.filter((item) => {
      if (segmentFilter === "HIGH_PROPENSITY_75") return item.propensityScore >= 75;
      if (segmentFilter === "WINBACK_RISK")
        return item.rfvSegment === "WINBACK_RISK" || item.recencyDays >= 18;
      if (segmentFilter === "WINE_LOVERS") return item.lifestyleTag === "WINE";
      if (segmentFilter === "FASHION_CULTURE")
        return item.lifestyleTag === "FASHION" || item.lifestyleTag === "CULTURE";
      return true;
    });
  }, [guestEvaluations, segmentFilter]);

  // Clientes efetivamente marcados (se vazio, usa todos os filtrados)
  const targetedEvaluations = useMemo(() => {
    if (selectedGuestIds.length === 0) return filteredEvaluations;
    return filteredEvaluations.filter((e) => selectedGuestIds.includes(e.guest.id));
  }, [filteredEvaluations, selectedGuestIds]);

  // Recomendação automática de campanha baseada no slot ocioso selecionado
  const blueprint = useMemo(() => {
    const theme = activeSlot.recommendedTheme;
    if (theme === "WINE_CONNOISSEUR") {
      return {
        badge: "Bourbon, Wine & Blues (SevenRooms Style)",
        title: `Bourbon Tasting & Blues (${activeSlot.dayLabel} · ${activeSlot.timeSlot})`,
        emailSubject: `You’re invited! Bourbon Tasting & Blues is back at Five Figs · ${db.venue.name}`,
        heroHeadline: "Bourbon & Blues",
        brandLabel: "FIVE FIGS",
        heroImageUrl:
          "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=900&q=85",
        defaultIncentive:
          "Flight de Bourbon Single Barrel & Brunello Riserva + Isenção de 1ª Rolha",
        strategyReason:
          "Horário com mesas de 4 lugares ociosas. Eventos sensoriais como 'Bourbon Tasting & Blues' ou degustação vertical aumentam em 89% a conversão de clientes de alto LTV em terças e quartas.",
      };
    }
    if (theme === "EXECUTIVE_HOLDING") {
      return {
        badge: "C-Level & Holdings (Wangari)",
        title: `Executive Table & Private Deal (${activeSlot.dayLabel} · ${activeSlot.timeSlot})`,
        emailSubject: `You’re invited! Private Executive Table & Sommelier Express at Five Figs`,
        heroHeadline: "Executive Table",
        brandLabel: "FIVE FIGS",
        heroImageUrl:
          "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=900&q=85",
        defaultIncentive:
          "Mesa privativa com acústica reservada + Café Especial & Petit Four cortesia",
        strategyReason:
          "Baixa ocupação no almoço de início de semana. Sócios e executivos mapeados via Wangari respondem a convites de conciergerie com confirmação em 1 clique.",
      };
    }
    if (theme === "FASHION_TRUNK") {
      return {
        badge: "Cross-Sell Fashion & Luxury",
        title: `Champagne & Private Styling (${activeSlot.dayLabel} · ${activeSlot.timeSlot})`,
        emailSubject: `You’re invited! Afternoon Champagne & Trunk Show at Five Figs Jardins`,
        heroHeadline: "Champagne & Couture",
        brandLabel: "FIVE FIGS",
        heroImageUrl:
          "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=900&q=85",
        defaultIncentive:
          "Welcome Glass de Franciacorta Satèn + Gift Card Ateliê Parceiro Jardins",
        strategyReason:
          "Faixa da tarde (15h–17h30) com alta ociosidade no salão. Conectar vitrine de moda/joalheria transforma mesas vazias em consumo de alto ticket.",
      };
    }
    if (theme === "CULTURE_VERNISSAGE") {
      return {
        badge: "Cross-Sell Arte & Cultura",
        title: `Bourbon Tasting, Jazz & Vernissage (${activeSlot.dayLabel} · ${activeSlot.timeSlot})`,
        emailSubject: `You’re invited! Bourbon Tasting & Blues is back at Five Figs`,
        heroHeadline: "Bourbon & Blues",
        brandLabel: "FIVE FIGS",
        heroImageUrl:
          "https://images.unsplash.com/photo-1527281400683-1aae777175f8?auto=format&fit=crop&w=900&q=85",
        defaultIncentive:
          "Menu Harmonizado em 3 tempos + Degustação Bourbon Single Barrel & Jazz Live",
        strategyReason:
          "Aloca as mesas no primeiro giro (18h00–19h30) ou Late Night com experiência cultural/musical, dobrando o giro das mesas ociosas.",
      };
    }
    return {
      badge: "Retenção RFV & Win-Back VIP",
      title: `Bourbon & Chef's Table (${activeSlot.dayLabel} · ${activeSlot.timeSlot})`,
      emailSubject: `You’re invited! Bourbon Tasting & Blues is back at Five Figs`,
      heroHeadline: "Bourbon & Blues",
      brandLabel: "FIVE FIGS",
      heroImageUrl:
        "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=900&q=85",
      defaultIncentive:
        "Prato assinatura favorito no EPOC + Welcome Bourbon Old Fashioned Defumado",
      strategyReason:
        "Recupera clientes de alto LTV que passaram da janela média de retorno, direcionando-os para preencher mesas ociosas.",
    };
  }, [activeSlot, db.venue.name]);

  // Métricas preditivas da campanha atual
  const campaignMetrics = useMemo(() => {
    const count = targetedEvaluations.length;
    if (count === 0) {
      return {
        avgPropensity: 0,
        expectedConversions: 0,
        tablesToFill: 0,
        newOccupancyPct: Math.round(
          (activeSlot.bookedTables / activeSlot.totalTables) * 100
        ),
        projectedRevenue: 0,
      };
    }
    const avgPropensity = Math.round(
      targetedEvaluations.reduce((acc, item) => acc + item.propensityScore, 0) / count
    );
    // Cada cliente convertido traz em média 1 mesa (2 a 4 pessoas)
    const expectedConversions = Math.max(
      1,
      Math.round(
        targetedEvaluations.reduce(
          (acc, item) => acc + item.propensityScore / 100,
          0
        )
      )
    );
    const tablesToFill = Math.min(activeSlot.idleTableNames.length, expectedConversions);
    const newOccupancyPct = Math.min(
      100,
      Math.round(
        ((activeSlot.bookedTables + tablesToFill) / activeSlot.totalTables) * 100
      )
    );
    const projectedRevenue = targetedEvaluations
      .slice(0, tablesToFill)
      .reduce((acc, item) => acc + item.expectedSpend, 0);

    return {
      avgPropensity,
      expectedConversions,
      tablesToFill,
      newOccupancyPct,
      projectedRevenue,
    };
  }, [targetedEvaluations, activeSlot]);

  const toggleGuestSelection = (guestId: string) => {
    setSelectedGuestIds((prev) =>
      prev.includes(guestId) ? prev.filter((id) => id !== guestId) : [...prev, guestId]
    );
  };

  // Dispara a campanha e opcionalmente gera reservas reais no sistema para preencher o slot ocioso
  const handleLaunchCampaign = async (autoAllocateReservations: boolean) => {
    const title = customCampaignTitle.trim() || blueprint.title;
    const incentive = customIncentive.trim() || blueprint.defaultIncentive;

    const newRecord: LaunchedCampaignRecord = {
      id: `camp-${Date.now()}`,
      title,
      slotLabel: `${activeSlot.dayLabel} · ${activeSlot.timeSlot}`,
      channel: selectedChannel,
      audienceCount: targetedEvaluations.length,
      avgPropensity: campaignMetrics.avgPropensity,
      expectedConversions: campaignMetrics.expectedConversions,
      projectedRevenue: campaignMetrics.projectedRevenue,
      tablesFilled: campaignMetrics.tablesToFill,
      createdAt: "Agora mesmo",
      incentive,
    };

    setLaunchedCampaigns((prev) => [newRecord, ...prev]);
    setSlotBookedBoost((prev) => ({
      ...prev,
      [activeSlot.id]: (prev[activeSlot.id] ?? 0) + campaignMetrics.tablesToFill,
    }));

    if (autoAllocateReservations && targetedEvaluations.length > 0) {
      const topGuest = targetedEvaluations[0];
      const slotHour = activeSlot.timeSlot.split(" - ")[0] || "19:00";
      await onAction({
        action: "CREATE_RESERVATION",
        guestName: topGuest.guest.name,
        cpf: topGuest.guest.cpf,
        phone: topGuest.guest.phone,
        partySize: 2,
        reservationTime: `${activeSlot.dateIso}T${slotHour}:00`,
        notes: `[CAMPANHA IA ${campaignMetrics.avgPropensity}% PROPENSÃO] ${title} · Benefício: ${incentive} · Favorito EPOC: ${topGuest.favoriteEpocItem}`,
      });
    }
  };

  const currentOccupancyPct = Math.round(
    (activeSlot.bookedTables / activeSlot.totalTables) * 100
  );

  return (
    <div className="space-y-4">
      {/* HEADER EXECUTIVO DE YIELD MANAGEMENT & CAMPANHAS DE ALTA PROPENSÃO */}
      <div className="rounded-2xl border border-[#2c2f36] bg-gradient-to-r from-[#1d2026] via-[#21252d] to-[#1d2026] p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#3ea6d8]/40 bg-[#3ea6d8]/15 px-3 py-0.5 text-[11px] font-bold text-[#7fd3fa]">
                <Sparkles className="h-3.5 w-3.5" /> Yield Management × CRM 360º Propensity AI
              </span>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
                {lowAllocationSlots.length} janelas de baixa alocação detectadas na semana
              </span>
            </div>
            <h1 className="mt-1.5 text-lg sm:text-xl font-black tracking-tight text-white">
              Motor de Campanhas por Baixa Alocação de Mesas &amp; Propensão de Clientes
            </h1>
            <p className="mt-0.5 text-xs text-slate-400">
              Identifique dias e horários com mesas ociosas no Floorplan e dispare convites hiperpersonalizados para o segmento com maior probabilidade matemática de conversão.
            </p>
          </div>

          {/* KPIs Globais de Oportunidade de Receita */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="rounded-xl border border-[#30343d] bg-[#16181c] px-3.5 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Mesas Ociosas (Slot Atual)
              </div>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className="font-mono text-lg font-black text-rose-400">
                  {activeSlot.idleTableNames.length}
                </span>
                <span className="text-[11px] text-slate-400">
                  de {activeSlot.totalTables} mesas ({100 - currentOccupancyPct}% vagas)
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-[#30343d] bg-[#16181c] px-3.5 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Propensão Média do Segmento
              </div>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className="font-mono text-lg font-black text-emerald-400">
                  {campaignMetrics.avgPropensity}%
                </span>
                <span className="text-[11px] text-slate-400">
                  score preditivo RFV + EPOC
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-[#55b699]/40 bg-[#55b699]/10 px-3.5 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#8be4c9]">
                Receita Incremental Estimada
              </div>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className="font-mono text-lg font-black text-white">
                  R$ {campaignMetrics.projectedRevenue.toLocaleString("pt-BR")}
                </span>
                <span className="text-[11px] text-[#8be4c9]">
                  (+{campaignMetrics.tablesToFill} mesas preenchidas)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO 1: HEATMAP DE ALOCAÇÃO DE MESAS POR DIA E HORÁRIO */}
      <div className="rounded-2xl border border-[#2c2f36] bg-[#1c1d21] p-4 shadow-lg">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
              <Calendar className="h-4 w-4 text-[#3ea6d8]" />
              1. Visão de Alocação de Mesas (Dia da Semana × Faixa de Horário)
            </h2>
            <p className="text-xs text-slate-400">
              Clique em qualquer janela com <strong className="text-rose-400">Baixa Alocação (Vermelho/Âmbar)</strong> para calcular os clientes com maior propensão de preencher essas mesas.
            </p>
          </div>

          {/* Legenda de Ocupação */}
          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5 text-rose-300">
              <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" /> Crítico (&le;35% ocup.)
            </span>
            <span className="flex items-center gap-1.5 text-amber-300">
              <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> Ocioso (36%–55%)
            </span>
            <span className="flex items-center gap-1.5 text-sky-300">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#3ea6d8]" /> Saudável (56%–80%)
            </span>
            <span className="flex items-center gap-1.5 text-emerald-300">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Alta Demanda (&gt;80%)
            </span>
          </div>
        </div>

        {/* Matriz Responsiva */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-separate border-spacing-1.5 text-left text-xs">
            <thead>
              <tr>
                <th className="w-44 rounded-lg bg-[#151619] px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Turno / Horário
                </th>
                {DAYS_META.map((day) => (
                  <th
                    key={day.index}
                    className="rounded-lg bg-[#151619] px-2.5 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-300"
                  >
                    <div>{day.short}</div>
                    <div className="font-mono text-[9px] font-normal text-slate-500">
                      {day.dateIso.slice(8, 10)}/10
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SHIFT_SLOTS.map((shift) => (
                <tr key={shift.timeSlot}>
                  <td className="rounded-xl border border-[#2a2d34] bg-[#16181c] px-3 py-2.5">
                    <div className="font-bold text-slate-200">{shift.shiftLabel}</div>
                    <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
                      <Clock className="h-3 w-3 text-[#3ea6d8]" /> {shift.timeSlot}
                    </div>
                  </td>

                  {DAYS_META.map((day) => {
                    const slotId = `slot-${day.index}-${shift.timeSlot}`;
                    const slot = yieldSlots.find((s) => s.id === slotId)!;
                    const occPct = Math.round(
                      (slot.bookedTables / slot.totalTables) * 100
                    );
                    const idleCount = slot.idleTableNames.length;
                    const isSelected = slot.id === activeSlot.id;

                    const colorClasses =
                      occPct <= 35
                        ? "border-rose-500/50 bg-rose-950/40 text-rose-100 hover:bg-rose-900/50"
                        : occPct <= 55
                          ? "border-amber-500/40 bg-amber-950/35 text-amber-100 hover:bg-amber-900/45"
                          : occPct <= 80
                            ? "border-[#3ea6d8]/35 bg-[#3ea6d8]/10 text-sky-100 hover:bg-[#3ea6d8]/20"
                            : "border-emerald-500/35 bg-emerald-950/30 text-emerald-100 hover:bg-emerald-900/40";

                    return (
                      <td key={slot.id} className="p-0">
                        <button
                          type="button"
                          onClick={() => setSelectedSlotId(slot.id)}
                          className={`group relative flex w-full flex-col justify-between rounded-xl border p-2 text-left transition ${colorClasses} ${
                            isSelected
                              ? "ring-2 ring-white shadow-lg scale-[1.02]"
                              : "opacity-90 hover:opacity-100"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono text-xs font-black">
                              {occPct}%
                            </span>
                            {occPct <= 45 && (
                              <span className="rounded bg-rose-500/30 px-1 py-0.2 text-[9px] font-bold uppercase text-rose-200">
                                Baixa
                              </span>
                            )}
                          </div>

                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-black/40">
                            <div
                              className={`h-full rounded-full ${
                                occPct <= 35
                                  ? "bg-rose-500"
                                  : occPct <= 55
                                    ? "bg-amber-400"
                                    : occPct <= 80
                                      ? "bg-[#3ea6d8]"
                                      : "bg-emerald-400"
                              }`}
                              style={{ width: `${occPct}%` }}
                            />
                          </div>

                          <div className="mt-1.5 flex items-center justify-between text-[10px] opacity-85">
                            <span>{slot.bookedTables}/{slot.totalTables} mesas</span>
                            {idleCount > 0 ? (
                              <span className="font-semibold text-amber-300">
                                {idleCount} vagas
                              </span>
                            ) : (
                              <span className="text-emerald-300">Lotado</span>
                            )}
                          </div>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Barra de Diagnóstico Rápido do Slot Selecionado */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#2e323b] bg-[#14161a] px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#3ea6d8]">
                  Janela Selecionada:
                </span>
                <span className="text-sm font-black text-white">
                  {activeSlot.dayLabel} ({activeSlot.dateIso.slice(8, 10)}/10) · {activeSlot.timeSlot} ({activeSlot.shiftLabel})
                </span>
              </div>
              <div className="mt-0.5 text-xs text-slate-400">
                Mesas ociosas no Floorplan SevenRooms:{" "}
                {activeSlot.idleTableNames.length > 0 ? (
                  <span className="font-mono font-semibold text-amber-300">
                    Mesas [{activeSlot.idleTableNames.join(", ")}]
                  </span>
                ) : (
                  <span className="font-semibold text-emerald-400">
                    Nenhuma mesa ociosa (100% Ocupado)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Atalhos de Menor Alocação:</span>
            {lowAllocationSlots.slice(0, 3).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedSlotId(s.id)}
                className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition ${
                  s.id === activeSlot.id
                    ? "border-rose-400 bg-rose-500/25 text-white"
                    : "border-[#2e323b] bg-[#1c1f26] text-slate-300 hover:border-rose-500/40"
                }`}
              >
                {s.dayShort} {s.timeSlot.split(" - ")[0]} ({Math.round((s.bookedTables / s.totalTables) * 100)}%)
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SEÇÃO 2 & 3: AUDIÊNCIA DE ALTA PROPENSÃO (ESQUERDA) + CONSTRUTOR DE CAMPANHA (DIREITA) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* COLUNA ESQUERDA (7 COLUNAS): RANKING DE PROPENSÃO DE CLIENTES PARA O SLOT */}
        <div className="lg:col-span-7 flex flex-col rounded-2xl border border-[#2c2f36] bg-[#1c1d21] p-4 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2a2d34] pb-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
                <Users className="h-4 w-4 text-[#55b699]" />
                2. Segmentação &amp; Ranking de Propensão para {activeSlot.dayShort} ({activeSlot.timeSlot.split(" - ")[0]})
              </h2>
              <p className="text-xs text-slate-400">
                Clientes ordenados por <strong className="text-emerald-400">Propensity Score (%)</strong> cruzando Recência (RFV), Comandas PDV EPOC e Lifestyle Wangari.
              </p>
            </div>

            {/* Filtros de Segmento */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "ALL" as const, label: "Todos" },
                { id: "HIGH_PROPENSITY_75" as const, label: "Propensão > 75%" },
                { id: "WINBACK_RISK" as const, label: "Win-Back / Recência" },
                { id: "WINE_LOVERS" as const, label: "Wine Lovers (EPOC)" },
                { id: "FASHION_CULTURE" as const, label: "Cultura & Fashion" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSegmentFilter(tab.id);
                    setSelectedGuestIds([]);
                  }}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                    segmentFilter === tab.id
                      ? "bg-[#3ea6d8] text-white"
                      : "bg-[#252830] text-slate-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Clientes com Score de Propensão */}
          <div className="mt-3 space-y-2.5">
            {filteredEvaluations.map((ev) => {
              const isChecked =
                selectedGuestIds.length === 0 || selectedGuestIds.includes(ev.guest.id);

              return (
                <div
                  key={ev.guest.id}
                  className={`rounded-xl border p-3 transition ${
                    isChecked
                      ? "border-[#3ea6d8]/45 bg-[#16181d]"
                      : "border-[#2a2d34] bg-[#141519] opacity-60"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleGuestSelection(ev.guest.id)}
                        className="mt-1 h-4 w-4 rounded border-slate-600 accent-[#3ea6d8]"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onInspectGuest(ev.guest.id)}
                            className="text-sm font-black text-white hover:text-[#3ea6d8] underline decoration-dotted"
                          >
                            {ev.guest.name}
                          </button>

                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                            <Crown className="h-3 w-3" /> {ev.guest.marketingCluster}
                          </span>

                          <span className="rounded-full bg-[#252830] px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                            Recência: {ev.recencyDays}d
                          </span>
                          <span className="rounded-full bg-[#252830] px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                            Ticket Médio: R$ {ev.avgTicket}
                          </span>
                        </div>

                        {/* Tags de Consumo EPOC + Enriquecimento + Mesa Sugerida */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className="inline-flex items-center gap-1 rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-purple-200">
                            <Wine className="h-3 w-3 text-purple-400" />
                            EPOC: {ev.favoriteEpocItem}
                          </span>

                          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-200">
                            <Sparkles className="h-3 w-3 text-emerald-400" />
                            Wangari: {ev.guest.salesBoxAttributes?.profession ?? "Cluster A+"}
                          </span>

                          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-200">
                            Mesa Ociosa Sugerida: #{ev.recommendedTable}
                          </span>
                        </div>

                        {/* Razões do Match e Gancho Personalizado */}
                        <div className="mt-2 text-[11px] text-slate-300">
                          <span className="font-bold text-[#7fd3fa]">Gatilho de Conversão: </span>
                          {ev.personalizedHook}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-slate-400">
                          {ev.matchReasons.map((r, i) => (
                            <span key={i} className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-[#55b699]" /> {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Badge de Propensão Individual */}
                    <div className="flex flex-col items-end">
                      <div
                        className={`flex items-center gap-1 rounded-xl border px-3 py-1.5 font-mono text-base font-black ${
                          ev.propensityScore >= 85
                            ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                            : ev.propensityScore >= 75
                              ? "border-[#3ea6d8]/50 bg-[#3ea6d8]/15 text-[#7fd3fa]"
                              : "border-amber-500/40 bg-amber-500/15 text-amber-300"
                        }`}
                      >
                        <Flame className="h-4 w-4" />
                        {ev.propensityScore}%
                      </div>
                      <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Propensão ao Slot
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400">
                        Est. R$ {ev.expectedSpend.toLocaleString("pt-BR")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUNA DIREITA (5 COLUNAS): CRIADOR DE CAMPANHA DE ALTA PROPENSÃO & SIMULADOR DE IMPACTO */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="rounded-2xl border border-[#2c2f36] bg-[#1c1d21] p-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#2a2d34] pb-3">
              <div>
                <span className="inline-flex items-center gap-1 rounded-md bg-[#3ea6d8]/15 px-2 py-0.5 text-[10px] font-bold uppercase text-[#7fd3fa]">
                  {blueprint.badge}
                </span>
                <h2 className="mt-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
                  <Megaphone className="h-4 w-4 text-amber-400" />
                  3. Configurar Campanha de Alta Propensão
                </h2>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase text-slate-400">Impacto Ocupação</div>
                <div className="font-mono text-sm font-black text-emerald-400">
                  {currentOccupancyPct}% &rarr; {campaignMetrics.newOccupancyPct}%
                </div>
              </div>
            </div>

            {/* Racional Estratégico da IA */}
            <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-100">
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <Zap className="h-3.5 w-3.5" /> Por que esta campanha tem a maior propensão?
              </div>
              <p className="mt-1 leading-relaxed text-amber-100/90">
                {blueprint.strategyReason}
              </p>
            </div>

            {/* Campos Configuráveis */}
            <div className="mt-3 space-y-3 text-xs">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">
                  Título da Campanha (Auto-sugerido para o Slot)
                </label>
                <input
                  type="text"
                  value={customCampaignTitle}
                  onChange={(e) => setCustomCampaignTitle(e.target.value)}
                  placeholder={blueprint.title}
                  className="w-full rounded-xl border border-[#2f333d] bg-[#14161a] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#3ea6d8] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">
                  Gatilho / Benefício de Conversão (Zero Desconto Predatório)
                </label>
                <input
                  type="text"
                  value={customIncentive}
                  onChange={(e) => setCustomIncentive(e.target.value)}
                  placeholder={blueprint.defaultIncentive}
                  className="w-full rounded-xl border border-[#2f333d] bg-[#14161a] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#3ea6d8] focus:outline-none"
                />
              </div>

              {/* Seletor de Canal */}
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">
                  Canal de Disparo VIP
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      id: "WHATSAPP_CONCIERGE" as const,
                      label: "WhatsApp Concierge",
                      sub: "Taxa Abertura 94%",
                    },
                    {
                      id: "SMS_VIP" as const,
                      label: "SMS Direct VIP",
                      sub: "Link 1-Click RSVP",
                    },
                    {
                      id: "EMAIL_PRIVATE" as const,
                      label: "Private Convite",
                      sub: "Editorial Luxury",
                    },
                  ].map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setSelectedChannel(ch.id)}
                      className={`rounded-xl border p-2 text-left transition ${
                        selectedChannel === ch.id
                          ? "border-[#3ea6d8] bg-[#3ea6d8]/15 text-white"
                          : "border-[#2b2e37] bg-[#15171b] text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <div className="font-bold text-[11px]">{ch.label}</div>
                      <div className="text-[9px] opacity-75">{ch.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* MOCKUP IPHONE CONVITE SEVENROOMS ("FIVE FIGS · BOURBON & BLUES · RESERVE MY SEAT") */}
              {targetedEvaluations[0] && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span className="flex items-center gap-1 text-[#7fd3fa]">
                      <Sparkles className="h-3.5 w-3.5" /> SevenRooms Mobile Invitation Preview
                    </span>
                    <span className="font-mono text-emerald-400">
                      {targetedEvaluations[0].guest.name} · {targetedEvaluations[0].propensityScore}% Propensão
                    </span>
                  </div>

                  {/* Moldura iPhone idêntica à referência enviada */}
                  <div className="mx-auto max-w-[335px] overflow-hidden rounded-[38px] border-[7px] border-[#262423] bg-white shadow-2xl">
                    {/* Top Bar iOS Mail (< 24   ^ v) */}
                    <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 pt-3 pb-2.5">
                      <div className="flex items-center gap-1.5">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-5 w-5 text-[#007aff]"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="rounded-full bg-[#007aff] px-2 py-0.5 text-[11px] font-bold leading-none text-white">
                          24
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[#007aff]">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        </svg>
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {/* Subject Header */}
                    <div className="bg-white px-4 py-3 text-left">
                      <div className="text-[14px] font-bold leading-snug text-[#1c1c1e]">
                        {customCampaignTitle.trim()
                          ? `You’re invited! ${customCampaignTitle.trim()} at Five Figs`
                          : blueprint.emailSubject}
                      </div>
                      <div className="mt-1 text-[11px] font-medium text-[#8e8e93]">
                        {activeSlot.dayLabel} ({activeSlot.dateIso}) · {activeSlot.timeSlot.split(" - ")[0]} · Mesa #{targetedEvaluations[0].recommendedTable}
                      </div>
                    </div>

                    {/* Hero Image (Taça Bourbon / Vinho em close-up) */}
                    <div className="relative h-60 w-full overflow-hidden bg-[#1e1b18]">
                      <img
                        src={blueprint.heroImageUrl}
                        alt={blueprint.heroHeadline}
                        className="h-full w-full object-cover object-center"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#262322] via-transparent to-black/15" />
                      <div className="absolute top-2.5 right-2.5 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold text-amber-300 backdrop-blur-sm border border-amber-400/30">
                        VIP Match {targetedEvaluations[0].propensityScore}%
                      </div>
                    </div>

                    {/* Card Footer Escuro Estilo "FIVE FIGS · Bourbon & Blues · RESERVE MY SEAT" */}
                    <div className="bg-[#262322] px-5 pt-5 pb-7 text-center text-white">
                      {/* Logo Botânico Figo + FIVE FIGS */}
                      <div className="flex items-center justify-center gap-2.5">
                        <svg
                          viewBox="0 0 48 48"
                          className="h-9 w-9 text-white/90"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                        >
                          {/* Desenho minimalista do figo e folha igual à imagem de referência */}
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M24 14c-6 5-11 11-11 18a11 11 0 0022 0c0-7-5-13-11-18z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M20 20c-2 4-3 8-2 13M28 20c2 4 3 8 2 13M24 18v18"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M24 14c1-4 4-7 8-7 0 4-3 7-8 7z"
                          />
                        </svg>
                        <span className="text-xl font-light tracking-[0.22em] text-white uppercase">
                          {blueprint.brandLabel}
                        </span>
                      </div>

                      {/* Headline Principal */}
                      <div className="mt-2.5 font-serif text-[26px] font-semibold tracking-tight text-white">
                        {customCampaignTitle.trim() || blueprint.heroHeadline}
                      </div>

                      {/* Subtexto Personalizado com Consumo EPOC do Hóspede */}
                      <p className="mt-1.5 text-[11px] leading-relaxed text-stone-300">
                        Exclusivo para <strong className="text-white">{targetedEvaluations[0].guest.name.split(" ")[0]}</strong> ·{" "}
                        {customIncentive.trim() || blueprint.defaultIncentive} ({targetedEvaluations[0].favoriteEpocItem})
                      </p>

                      {/* Botão Retangular "RESERVE MY SEAT" Interativo */}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleLaunchCampaign(true)}
                        className="mt-5 inline-flex items-center justify-center border border-white/80 bg-transparent px-7 py-3 text-[11px] font-semibold tracking-[0.18em] uppercase text-white transition hover:bg-white hover:text-[#262322] disabled:opacity-50"
                      >
                        RESERVE MY SEAT
                      </button>
                    </div>
                  </div>

                  {/* Preview Compacto do WhatsApp Concierge */}
                  <div className="rounded-xl border border-[#2e323c] bg-[#14161a] p-3">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <span className="flex items-center gap-1 text-[#55b699]">
                        <MessageSquare className="h-3 w-3" /> Mensagem WhatsApp / SMS Concierge
                      </span>
                      <span className="font-mono text-slate-400">
                        Mesa #{targetedEvaluations[0].recommendedTable}
                      </span>
                    </div>
                    <div className="mt-1.5 rounded-lg bg-[#1c2228] p-2.5 font-sans text-xs leading-relaxed text-slate-200 border-l-2 border-[#55b699]">
                      “Olá <strong>{targetedEvaluations[0].guest.name.split(" ")[0]}</strong>, você foi convidado para o <strong>{customCampaignTitle.trim() || blueprint.heroHeadline}</strong> no <strong>{db.venue.name}</strong> ({activeSlot.dayLabel} às {activeSlot.timeSlot.split(" - ")[0]}). Reservamos sua <strong>Mesa {targetedEvaluations[0].recommendedTable}</strong> com <em>{customIncentive.trim() || blueprint.defaultIncentive}</em>.”
                    </div>
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="pt-1 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={busy || targetedEvaluations.length === 0}
                  onClick={() => handleLaunchCampaign(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#55b699] to-[#3ea6d8] px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg hover:opacity-95 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  Disparar Convite &amp; Reservar Assentos (+{campaignMetrics.tablesToFill} Mesas)
                </button>

                <button
                  type="button"
                  disabled={busy || targetedEvaluations.length === 0}
                  onClick={() => handleLaunchCampaign(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#3ea6d8]/50 bg-[#3ea6d8]/10 px-4 py-2 text-xs font-bold text-[#7fd3fa] hover:bg-[#3ea6d8]/20 disabled:opacity-50"
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  Simular Preenchimento no Heatmap Semanal
                </button>
              </div>
            </div>
          </div>

          {/* HISTÓRICO DE CAMPANHAS DISPARADAS & CONVERSÃO */}
          <div className="rounded-2xl border border-[#2c2f36] bg-[#1c1d21] p-4 shadow-lg">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <Layers className="h-4 w-4 text-[#3ea6d8]" />
              Campanhas Ativas &amp; Conversão de Mesas Ociosas
            </h3>
            <div className="mt-2.5 space-y-2">
              {launchedCampaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="rounded-xl border border-[#2a2e37] bg-[#15171b] p-3 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-white">{camp.title}</span>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                      +{camp.tablesFilled} mesas alocadas
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
                    <span>{camp.slotLabel}</span>
                    <span className="font-mono text-white">
                      Receita Est.: R$ {camp.projectedRevenue.toLocaleString("pt-BR")} ({camp.avgPropensity}% propensão)
                    </span>
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500">
                    Incentivo: {camp.incentive} · {camp.createdAt}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
