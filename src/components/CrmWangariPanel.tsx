"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Database,
  DollarSign,
  Filter,
  Flame,
  Gem,
  Heart,
  Lock,
  MapPin,
  MoreHorizontal,
  Palette,
  Printer,
  RefreshCw,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  TrendingUp,
  User,
  Utensils,
  Wine,
} from "lucide-react";
import { DatabaseState, GuestProfile, MarketingClusterName } from "@/types/domain";

interface CrmWangariPanelProps {
  db: DatabaseState;
  selectedGuestId: string | null;
  onSelectGuest: (guestId: string) => void;
  onAction: (payload: Record<string, unknown>) => Promise<void>;
  busy: boolean;
}

interface RichProfileMetadata {
  avatarUrl: string;
  subtitle: string;
  ordersCount: number;
  reviewsCount: number;
  rating: number;
  monthlyFrequency: number;
  retentionProbability: number; // 0 to 1
  cultureFashionSpend: number;
  // Pílulas principais no topo do cartão estilo SevenRooms ("Lynn Thomas")
  heroPills: {
    label: string;
    bg: string;
    text: string;
    icon: "repeat" | "visits" | "local" | "sparkle" | "star" | "seat" | "gem";
  }[];
  // 1. Tags de Consumos Anteriores (PDV EPOC)
  previousConsumptionTags: {
    item: string;
    category: "VINHO" | "PRATO" | "DRINK" | "EXPERIENCIA";
    count: number;
    avgPrice: number;
    lastOrdered: string;
  }[];
  // 2. Tags de Enriquecimento de Dados (Wangari Data Hub + SalesBox)
  enrichmentBadges: {
    label: string;
    sourceApi: string;
    highlight: string;
  }[];
  // 3. Tags e Oportunidades de Cross-Sell em Cultura & Fashion
  cultureFashionCrossSell: {
    tag: string;
    vertical: "FASHION" | "CULTURA" | "ARTE" | "MUSICA";
    propensityScore: number;
    suggestedAction: string;
    bundleTicket: number;
  }[];
}

const PROFILE_METADATA_BY_ID: Record<string, RichProfileMetadata> = {
  "guest-roberto": {
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    subtitle: "Happy Hour & Fine Wine Regular · Sócio Investidor",
    ordersCount: 30,
    reviewsCount: 12,
    rating: 5,
    monthlyFrequency: 3.2,
    retentionProbability: 0.94,
    cultureFashionSpend: 6840,
    heroPills: [
      { label: "Wine Lover", bg: "bg-[#65c3c8]", text: "text-white", icon: "repeat" },
      { label: "Visits: 14", bg: "bg-[#f3dfa2]", text: "text-[#1e1e1e]", icon: "visits" },
      { label: "Local · Vila Nova", bg: "bg-[#f04e23]", text: "text-white", icon: "local" },
      { label: "Bourbon & Brunello", bg: "bg-[#fca311]", text: "text-[#1e1e1e]", icon: "repeat" },
      { label: "Positive Feedback", bg: "bg-[#f5cba7]", text: "text-[#1e1e1e]", icon: "sparkle" },
      { label: "Friend of GM", bg: "bg-[#fbd160]", text: "text-[#1e1e1e]", icon: "star" },
      { label: "Adega Seat M23", bg: "bg-[#bfd7ea]", text: "text-[#1e1e1e]", icon: "seat" },
    ],
    previousConsumptionTags: [
      {
        item: "Brunello di Montalcino DOCG Banfi",
        category: "VINHO",
        count: 6,
        avgPrice: 790,
        lastOrdered: "Hoje, 19:42",
      },
      {
        item: "Prime Rib Wagyu A5 c/ Trufas Negras",
        category: "PRATO",
        count: 8,
        avgPrice: 340,
        lastOrdered: "28 Set 2026",
      },
      {
        item: "Polvo Grelhado na Brasa c/ Páprica",
        category: "PRATO",
        count: 5,
        avgPrice: 188,
        lastOrdered: "Hoje, 20:05",
      },
      {
        item: "Old Fashioned Bourbon Woodford Reserve",
        category: "DRINK",
        count: 11,
        avgPrice: 68,
        lastOrdered: "19 Set 2026",
      },
    ],
    enrichmentBadges: [
      {
        label: "Score Consumo 948/1000",
        sourceApi: "SalesBox #8 Score Consumo",
        highlight: "Top 2% Poder Aquisitivo (Classe A+)",
      },
      {
        label: "Cosmopolitas & Enoturismo",
        sourceApi: "SalesBox #6 PeopleScope",
        highlight: "Alta afinidade com vinhos do Velho Mundo e Arte",
      },
      {
        label: "Vínculo CPF×Tel 96/100",
        sourceApi: "SalesBox #2 + #4 Flag WhatsApp",
        highlight: "Canal VIP WhatsApp Validado (Não-Reciclado)",
      },
      {
        label: "Jardins / Vila Nova Conceição",
        sourceApi: "SalesBox #9 Score Endereço (92)",
        highlight: "Raio de 3,2 km da unidade",
      },
    ],
    cultureFashionCrossSell: [
      {
        tag: "Colecionador Arte Contemporânea",
        vertical: "ARTE",
        propensityScore: 97,
        suggestedAction: "Vernissage Privado + Jantar Harmonizado na Adega (Mesa 23)",
        bundleTicket: 1850,
      },
      {
        tag: "Alfaiataria & Relojoaria de Luxo",
        vertical: "FASHION",
        propensityScore: 92,
        suggestedAction: "Convite Trunk Show Cápsula Masculina + Degustação Brunello",
        bundleTicket: 2400,
      },
      {
        tag: "Jazz & Vinyl Sessions (Lounge 88)",
        vertical: "MUSICA",
        propensityScore: 89,
        suggestedAction: "Mesa Reservada Pocket Show Quinta-Feira + Bourbon Flight",
        bundleTicket: 980,
      },
    ],
  },
  "guest-mariana": {
    avatarUrl:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
    subtitle: "Sunset & Rosé Regular · Arquiteta & Curadora",
    ordersCount: 18,
    reviewsCount: 9,
    rating: 5,
    monthlyFrequency: 2.4,
    retentionProbability: 0.91,
    cultureFashionSpend: 5420,
    heroPills: [
      { label: "Rosé Provence Lover", bg: "bg-[#65c3c8]", text: "text-white", icon: "repeat" },
      { label: "Visits: 8", bg: "bg-[#f3dfa2]", text: "text-[#1e1e1e]", icon: "visits" },
      { label: "Local · Jardins", bg: "bg-[#f04e23]", text: "text-white", icon: "local" },
      { label: "Fashion & Design Buyer", bg: "bg-[#fca311]", text: "text-[#1e1e1e]", icon: "gem" },
      { label: "Positive Feedback", bg: "bg-[#f5cba7]", text: "text-[#1e1e1e]", icon: "sparkle" },
      { label: "Friend of Curator", bg: "bg-[#fbd160]", text: "text-[#1e1e1e]", icon: "star" },
      { label: "Varanda / Lounge 21", bg: "bg-[#bfd7ea]", text: "text-[#1e1e1e]", icon: "seat" },
    ],
    previousConsumptionTags: [
      {
        item: "Provence Rosé Whispering Angel",
        category: "VINHO",
        count: 5,
        avgPrice: 360,
        lastOrdered: "04 Out 2026",
      },
      {
        item: "Burrata Artesanal ao Pesto de Pistache",
        category: "PRATO",
        count: 6,
        avgPrice: 96,
        lastOrdered: "04 Out 2026",
      },
      {
        item: "Crudo de Atum Bluefin c/ Ponzu",
        category: "PRATO",
        count: 4,
        avgPrice: 124,
        lastOrdered: "21 Set 2026",
      },
      {
        item: "Spritz Botânico Autoral",
        category: "DRINK",
        count: 9,
        avgPrice: 52,
        lastOrdered: "04 Out 2026",
      },
    ],
    enrichmentBadges: [
      {
        label: "Score Consumo 865/1000",
        sourceApi: "SalesBox #8 Score Consumo",
        highlight: "Alta propensão a experiências de Moda e Design",
      },
      {
        label: "Early Adopter Cultural & Fashion",
        sourceApi: "SalesBox #6 PeopleScope",
        highlight: "Frequenta galerias, desfiles e concept stores",
      },
      {
        label: "SuperApp Heavy User",
        sourceApi: "Dados Internos + Linkbio",
        highlight: "Comprou 4 ingressos culturais nos últimos 60 dias",
      },
    ],
    cultureFashionCrossSell: [
      {
        tag: "Desfile Resort & Concept Store",
        vertical: "FASHION",
        propensityScore: 98,
        suggestedAction: "Front-Row Fashion Pop-Up + Welcome Rosé Whispering Angel na Mesa 21",
        bundleTicket: 1450,
      },
      {
        tag: "Exposição Fotografia & Arquitetura",
        vertical: "CULTURA",
        propensityScore: 95,
        suggestedAction: "Combo Visita Guiada Curador + Almoço Executivo Varanda Social",
        bundleTicket: 680,
      },
      {
        tag: "Sunset DJ Set no Terraço",
        vertical: "MUSICA",
        propensityScore: 91,
        suggestedAction: "Reserva Prioritária Terraço Sunset + Garrafa Rosé",
        bundleTicket: 820,
      },
    ],
  },
};

function getMetadataForGuest(guest: GuestProfile): RichProfileMetadata {
  if (PROFILE_METADATA_BY_ID[guest.id]) {
    return PROFILE_METADATA_BY_ID[guest.id];
  }
  const isHigh = guest.averageTicket >= 350;
  return {
    avatarUrl:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80",
    subtitle: `${guest.marketingCluster} · Cliente SuperApp & Salão`,
    ordersCount: Math.max(2, guest.visitsCount * 2),
    reviewsCount: Math.max(1, Math.floor(guest.visitsCount * 0.7)),
    rating: 5,
    monthlyFrequency: Number(Math.max(0.8, guest.visitsCount / 4).toFixed(1)),
    retentionProbability: guest.recencyDays <= 30 ? 0.88 : 0.62,
    cultureFashionSpend: isHigh ? 3900 : 1250,
    heroPills: [
      { label: "Wine Lover", bg: "bg-[#65c3c8]", text: "text-white", icon: "repeat" },
      { label: `Visits: ${guest.visitsCount}`, bg: "bg-[#f3dfa2]", text: "text-[#1e1e1e]", icon: "visits" },
      { label: "Local", bg: "bg-[#f04e23]", text: "text-white", icon: "local" },
      { label: "Bourbon Lover", bg: "bg-[#fca311]", text: "text-[#1e1e1e]", icon: "repeat" },
      { label: "Positive Feedback", bg: "bg-[#f5cba7]", text: "text-[#1e1e1e]", icon: "sparkle" },
      { label: "Friend of GM", bg: "bg-[#fbd160]", text: "text-[#1e1e1e]", icon: "star" },
      {
        label: guest.preferredTableNumber ? `Table ${guest.preferredTableNumber}` : "Bar Seat",
        bg: "bg-[#bfd7ea]",
        text: "text-[#1e1e1e]",
        icon: "seat",
      },
    ],
    previousConsumptionTags: [
      {
        item: "Champagne Veuve Clicquot Brut",
        category: "VINHO",
        count: 3,
        avgPrice: 640,
        lastOrdered: "Última visita",
      },
      {
        item: "Risoto de Camarão c/ Limão Siciliano",
        category: "PRATO",
        count: 4,
        avgPrice: 164,
        lastOrdered: "Última visita",
      },
      {
        item: "Negroni Sbagliato Autoral",
        category: "DRINK",
        count: 5,
        avgPrice: 54,
        lastOrdered: "Última visita",
      },
    ],
    enrichmentBadges: [
      {
        label: `Score Consumo ${guest.salesBoxAttributes?.consumptionPotentialScore || 780}/1000`,
        sourceApi: "SalesBox #8 Score Consumo",
        highlight: guest.salesBoxAttributes?.presumedIncomeBracket || "Classe A/B+",
      },
      {
        label: guest.salesBoxAttributes?.psychographicGroup || "Socializadores Urbanos",
        sourceApi: "SalesBox #6 PeopleScope",
        highlight: "Afinidade com gastronomia, cultura e moda",
      },
    ],
    cultureFashionCrossSell: [
      {
        tag: "Agenda Cultural & Exposições",
        vertical: "CULTURA",
        propensityScore: 90,
        suggestedAction: "Ingresso Exposição + Reserva Jantar Salão Principal",
        bundleTicket: 780,
      },
      {
        tag: "Private Sale & Fashion Editorial",
        vertical: "FASHION",
        propensityScore: 86,
        suggestedAction: "Convite Pop-up Moda Autoral + Welcome Drink no Lounge 88",
        bundleTicket: 1120,
      },
    ],
  };
}

const CLUSTER_DESCRIPTIONS: Record<
  MarketingClusterName,
  { rule: string; action: string; badgeClass: string }
> = {
  "Premium frequente": {
    rule: "Alto potencial, 2+ visitas em 60 dias, ticket alto",
    action: "Convite antecipado, harmonização de vinhos, reserva prioritária",
    badgeClass: "bg-amber-500/25 text-amber-200 border-amber-400/50",
  },
  "Alto potencial adormecido": {
    rule: "Alto potencial, sem visita há mais de 60 dias",
    action: "Reativação personalizada, oferta de retorno VIP",
    badgeClass: "bg-purple-500/25 text-purple-200 border-purple-400/50",
  },
  "Frequente do dia a dia": {
    rule: "Potencial médio, alta frequência, ticket médio",
    action: "Pratos do dia, benefícios recorrentes no SuperApp",
    badgeClass: "bg-emerald-500/25 text-emerald-200 border-emerald-400/50",
  },
  "Celebrações e grupos": {
    rule: "Grupos de 5 ou mais, datas de aniversário",
    action: "Pacotes de grupo, lembrete ativo 15 dias antes do aniversário",
    badgeClass: "bg-pink-500/25 text-pink-200 border-pink-400/50",
  },
  "Cultural e experiências": {
    rule: "Compra ingresso de exposição/evento no SuperApp ou Sunset",
    action: "Agenda cultural combinada com reserva de mesa",
    badgeClass: "bg-cyan-500/25 text-cyan-200 border-cyan-400/50",
  },
  "Novo com potencial": {
    rule: "1ª visita, potencial médio ou alto no SalesBox",
    action: "Régua de boas-vindas e incentivo à segunda visita",
    badgeClass: "bg-indigo-500/25 text-indigo-200 border-indigo-400/50",
  },
  "Baixa aderência de contato": {
    rule: "Telefone inválido, reciclado, sem opt-in ou score baixo",
    action: "Sem disparo (supressão LGPD); atualizar no próximo check-in",
    badgeClass: "bg-rose-500/25 text-rose-200 border-rose-400/50",
  },
};

export default function CrmWangariPanel({
  db,
  selectedGuestId,
  onSelectGuest,
  onAction,
  busy,
}: CrmWangariPanelProps) {
  const [clusterFilter, setClusterFilter] = useState<MarketingClusterName | "ALL">("ALL");
  const [campaignFeedback, setCampaignFeedback] = useState<string | null>(null);
  const [showChitModal, setShowChitModal] = useState(false);

  const filteredGuests = db.guests.filter(
    (g) => clusterFilter === "ALL" || g.marketingCluster === clusterFilter
  );

  const activeGuest =
    db.guests.find((g) => g.id === selectedGuestId) || filteredGuests[0] || db.guests[0];

  const meta = getMetadataForGuest(activeGuest);

  // CÁLCULO MATEMÁTICO DE LTV, RECÊNCIA (R), FREQUÊNCIA (F) E VALOR (V)
  const restaurantHistoricalLtv = activeGuest.totalSpent;
  const ecosystemHistoricalLtv = restaurantHistoricalLtv + meta.cultureFashionSpend;
  const projected12mRestaurantLtv = Math.round(
    activeGuest.averageTicket * meta.monthlyFrequency * 12 * meta.retentionProbability
  );
  const projected12mCrossSellLtv = Math.round(meta.cultureFashionSpend * 1.35);
  const totalProjected12mLtv = projected12mRestaurantLtv + projected12mCrossSellLtv;

  const recencyStatus =
    activeGuest.recencyDays === 0
      ? "No Salão Hoje (Ativo)"
      : activeGuest.recencyDays <= 21
        ? "Quente (Ciclo Ideal)"
        : activeGuest.recencyDays <= 60
          ? "Morno (Atenção)"
          : "Em Risco de Churn (>60d)";

  return (
    <div className="space-y-6">
      {/* Banner de Feedback de Disparo Cross-Sell / Cluster */}
      {campaignFeedback && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/50 bg-emerald-950/70 px-4 py-3 text-xs text-emerald-100 shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{campaignFeedback}</span>
          </div>
          <button
            onClick={() => setCampaignFeedback(null)}
            className="rounded px-2 py-0.5 text-emerald-300 underline"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Grid Principal: Lista Lateral de Clientes (4 cols) + Customer Profile Card SevenRooms & Inteligência LTV/RFV/Cross-Sell (8 cols) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* COLUNA ESQUERDA (4 cols): Seletor de Clientes e Filtro por Cluster */}
        <div className="flex flex-col gap-3 rounded-2xl border border-[#2e3138] bg-[#212328] p-4 xl:col-span-4">
          <div className="flex items-center justify-between border-b border-[#2e3138] pb-3">
            <div>
              <h3 className="text-sm font-bold text-white">Clientes & Perfis 360º (CPF)</h3>
              <p className="text-[11px] text-slate-400">
                Selecione um perfil para ver o Cartão SevenRooms, LTV, RFV e Cross-Sell
              </p>
            </div>
            <Filter className="h-4 w-4 text-slate-400" />
          </div>

          {/* Filtro Rápido por Cluster */}
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setClusterFilter("ALL")}
              className={`rounded-md px-2 py-1 text-[10px] font-bold transition ${
                clusterFilter === "ALL"
                  ? "bg-[#3ea6d8] text-white"
                  : "bg-[#2c2f36] text-slate-300 hover:bg-[#353942]"
              }`}
            >
              Todos ({db.guests.length})
            </button>
            {(Object.keys(CLUSTER_DESCRIPTIONS) as MarketingClusterName[]).map((c) => {
              const count = db.guests.filter((g) => g.marketingCluster === c).length;
              return (
                <button
                  key={c}
                  onClick={() => setClusterFilter(clusterFilter === c ? "ALL" : c)}
                  className={`rounded-md px-2 py-1 text-[10px] font-semibold transition ${
                    clusterFilter === c
                      ? "bg-[#3ea6d8] text-white"
                      : "bg-[#2c2f36] text-slate-400 hover:text-white"
                  }`}
                >
                  {c} ({count})
                </button>
              );
            })}
          </div>

          {/* Lista de Clientes */}
          <div className="space-y-2.5 max-h-[820px] overflow-y-auto pr-1">
            {filteredGuests.map((g) => {
              const selected = activeGuest?.id === g.id;
              const gMeta = getMetadataForGuest(g);
              const gLtv = g.totalSpent + gMeta.cultureFashionSpend;
              return (
                <div
                  key={g.id}
                  onClick={() => onSelectGuest(g.id)}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                    selected
                      ? "border-[#3ea6d8] bg-[#2b2e37] shadow-md"
                      : "border-[#2e3138] bg-[#1b1d21] hover:border-slate-600"
                  }`}
                >
                  <img
                    src={gMeta.avatarUrl}
                    alt={g.name}
                    className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-[#3ea6d8]/40"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="truncate text-sm font-bold text-white">{g.name}</h4>
                      <span className="font-mono text-xs font-extrabold text-[#55b699]">
                        R$ {gLtv.toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-slate-400">{gMeta.subtitle}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-300">
                      <span className="rounded bg-[#343740] px-1.5 py-0.5 font-mono">
                        RFV: {g.rfvScore}
                      </span>
                      <span className="rounded bg-[#343740] px-1.5 py-0.5">
                        {g.visitsCount} visitas
                      </span>
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-amber-300 font-semibold">
                        {g.marketingCluster}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUNA DIREITA (8 cols): CARTÃO SEVENROOMS ("Lynn Thomas" Style) + LTV / RFV + CONSUMO + ENRIQUECIMENTO + CROSS-SELL CULTURA/FASHION */}
        {activeGuest && (
          <div className="flex flex-col gap-5 xl:col-span-8">
            {/* 1. HERO CUSTOMER PROFILE CARD (Fiel à imagem de referência da Lynn Thomas!) */}
            <div className="overflow-hidden rounded-3xl border border-[#e5dec9] bg-[#faf7f2] text-[#1c1d21] shadow-2xl">
              {/* Top Header Bar: < Back | Guest Name | Printer Icon & Menu Dots */}
              <div className="flex items-center justify-between px-6 pt-6 pb-2">
                <button
                  onClick={() => {
                    const idx = db.guests.findIndex((g) => g.id === activeGuest.id);
                    const prev = db.guests[(idx - 1 + db.guests.length) % db.guests.length];
                    onSelectGuest(prev.id);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-[#1c1d21] hover:bg-black/5 transition"
                  title="Cliente anterior"
                >
                  <ArrowLeft className="h-6 w-6 stroke-[2.2]" />
                </button>

                <div className="text-center">
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1c1d21]">
                    {activeGuest.name}
                  </h2>
                  <p className="font-mono text-xs text-neutral-500">
                    CPF: {activeGuest.cpfMasked} · {activeGuest.phone}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowChitModal(!showChitModal)}
                    title="Imprimir Ficha de Mesa (Chit) para Garçom & Sommelier"
                    className="flex h-10 w-10 items-center justify-center rounded-full text-[#1c1d21] hover:bg-black/5 transition"
                  >
                    <Printer className="h-6 w-6 stroke-[1.8]" />
                  </button>
                  <button
                    onClick={() =>
                      onAction({
                        action: "ENRICH_GUEST_WANGARI",
                        guestId: activeGuest.id,
                      })
                    }
                    title="Reprocessar Enriquecimento Wangari / SalesBox"
                    className="flex h-10 w-10 items-center justify-center rounded-full text-[#1c1d21] hover:bg-black/5 transition"
                  >
                    <MoreHorizontal className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Foto Circular Central + Subtítulo */}
              <div className="mt-2 flex flex-col items-center px-6">
                <div className="relative h-28 w-28 overflow-hidden rounded-full shadow-lg ring-4 ring-white">
                  <img
                    src={meta.avatarUrl}
                    alt={activeGuest.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="mt-3 text-sm font-medium text-[#3b3c40]">{meta.subtitle}</p>

                {/* Pílulas Coloridas Estilo SevenRooms (Wine Lover, Visits, Local, Bourbon Lover, Positive Feedback, Friend of GM, Bar Seat) */}
                <div className="mt-5 flex max-w-2xl flex-wrap items-center justify-center gap-2.5">
                  {meta.heroPills.map((pill, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold shadow-sm ${pill.bg} ${pill.text}`}
                    >
                      {pill.icon === "repeat" && <RefreshCw className="h-3.5 w-3.5" />}
                      {pill.icon === "local" && <MapPin className="h-3.5 w-3.5" />}
                      {pill.icon === "sparkle" && <Sparkles className="h-3.5 w-3.5" />}
                      {pill.icon === "star" && <Star className="h-3.5 w-3.5" />}
                      {pill.icon === "gem" && <Gem className="h-3.5 w-3.5" />}
                      {pill.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Linha Divisória + 4 Métricas Principais (TOTAL SPEND | # OF ORDERS | VISITS | REVIEWS ★★★★★) */}
              <div className="mt-7 border-t border-[#d8d2c5] bg-[#f5f1e8] px-6 py-5">
                <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-[#6e6d68]">
                      TOTAL SPEND (LTV)
                    </div>
                    <div className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#1c1d21]">
                      R$ {ecosystemHistoricalLtv.toLocaleString("pt-BR")}
                    </div>
                    <div className="text-[11px] text-[#6e6d68]">
                      R$ {restaurantHistoricalLtv.toLocaleString("pt-BR")} EPOC + R${" "}
                      {meta.cultureFashionSpend.toLocaleString("pt-BR")} Cultura/Moda
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-[#6e6d68]">
                      # OF ORDERS
                    </div>
                    <div className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#1c1d21]">
                      {meta.ordersCount}
                    </div>
                    <div className="text-[11px] text-[#6e6d68]">
                      Comandas EPOC & Ingressos
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-[#6e6d68]">
                      VISITS (FREQUÊNCIA)
                    </div>
                    <div className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#1c1d21]">
                      {activeGuest.visitsCount}
                    </div>
                    <div className="text-[11px] text-[#6e6d68]">
                      ~{meta.monthlyFrequency} visitas/mês · {activeGuest.noShowCount} no-show
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-[#6e6d68]">
                      REVIEWS ({meta.reviewsCount})
                    </div>
                    <div className="mt-2 flex items-center justify-center gap-1 text-[#f4c44e]">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className="h-5 w-5 fill-[#f4c44e] text-[#f4c44e]"
                        />
                      ))}
                    </div>
                    <div className="mt-1 text-[11px] text-[#6e6d68]">NPS Promotor (5.0 ★)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal/Preview de Impressão da Ficha de Mesa (Chit do Sommelier/Garçom) */}
            {showChitModal && (
              <div className="rounded-2xl border-2 border-dashed border-amber-400/60 bg-[#1e2024] p-4 text-xs text-slate-200">
                <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                  <span className="font-mono font-bold uppercase text-amber-300">
                    🖨️ FICHA IMPRESSA DE MESA (CHIT HOST / GARÇOM / SOMMELIER)
                  </span>
                  <button
                    onClick={() => setShowChitModal(false)}
                    className="text-slate-400 hover:text-white underline"
                  >
                    Fechar Preview
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3 font-mono text-[11px]">
                  <div>
                    <strong>CLIENTE:</strong> {activeGuest.name}
                    <br />
                    <strong>CLUSTER:</strong> {activeGuest.marketingCluster}
                    <br />
                    <strong>RFV / LTV:</strong> {activeGuest.rfvScore} · R${" "}
                    {ecosystemHistoricalLtv.toLocaleString("pt-BR")}
                  </div>
                  <div>
                    <strong>FAIXA DE VINHO:</strong> {activeGuest.waiterAi.wineTier}
                    <br />
                    <strong>PREFERÊNCIA:</strong> {activeGuest.winePreference}
                  </div>
                  <div>
                    <strong className="text-rose-400">RESTRIÇÕES / ALERGIAS:</strong>{" "}
                    {activeGuest.allergies.length > 0
                      ? activeGuest.allergies.join(", ")
                      : "Nenhuma registrada"}
                  </div>
                </div>
              </div>
            )}

            {/* 2. PAINEL DE CÁLCULO DE LTV, RECÊNCIA (R), FREQUÊNCIA (F) E VALOR (V) */}
            <div className="rounded-2xl border border-[#2e3138] bg-[#212328] p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2e3138] pb-3">
                <div>
                  <h3 className="flex items-center gap-2 text-base font-bold text-white">
                    <TrendingUp className="h-5 w-5 text-[#55b699]" />
                    Cálculo de LTV (Lifetime Value), Recência (R), Frequência (F) & Valor (V)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Combina o consumo real das comandas fechadas no PDV EPOC com o consumo cruzado em Cultura & Fashion
                    no SuperApp.
                  </p>
                </div>
                <span className="rounded-lg bg-[#55b699]/20 border border-[#55b699]/40 px-3 py-1 font-mono text-xs font-bold text-[#8be4c9]">
                  Matriz RFV: {activeGuest.rfvScore}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {/* Recência */}
                <div className="rounded-xl border border-[#32353e] bg-[#1a1c20] p-3.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>RECÊNCIA (R)</span>
                    <Clock className="h-4 w-4 text-sky-400" />
                  </div>
                  <div className="mt-1.5 text-xl font-extrabold text-white">
                    {activeGuest.recencyDays === 0
                      ? "Hoje (0 dias)"
                      : `${activeGuest.recencyDays} dias`}
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-sky-300">
                    {recencyStatus}
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Retenção estimada: {Math.round(meta.retentionProbability * 100)}%
                  </p>
                </div>

                {/* Frequência */}
                <div className="rounded-xl border border-[#32353e] bg-[#1a1c20] p-3.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>FREQUÊNCIA (F)</span>
                    <Calendar className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="mt-1.5 text-xl font-extrabold text-white">
                    {meta.monthlyFrequency}x / mês
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-amber-300">
                    {activeGuest.visitsCount} visitas · {meta.ordersCount} pedidos
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Giro médio de retorno: a cada {Math.round(30 / meta.monthlyFrequency)} dias
                  </p>
                </div>

                {/* Ticket Médio & Valor */}
                <div className="rounded-xl border border-[#32353e] bg-[#1a1c20] p-3.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>TICKET MÉDIO (V)</span>
                    <DollarSign className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="mt-1.5 text-xl font-extrabold text-emerald-400">
                    R$ {activeGuest.averageTicket.toFixed(0)}
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-slate-200">
                    EPOC Acumulado: R$ {restaurantHistoricalLtv.toLocaleString("pt-BR")}
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    + R$ {meta.cultureFashionSpend.toLocaleString("pt-BR")} em Cultura & Fashion
                  </p>
                </div>

                {/* LTV Projetado 12 Meses */}
                <div className="rounded-xl border border-[#d4885c]/50 bg-gradient-to-br from-[#1a1c20] to-[#d4885c]/15 p-3.5">
                  <div className="flex items-center justify-between text-xs text-[#f3b692]">
                    <span className="font-bold">LTV PROJETADO (12M)</span>
                    <Flame className="h-4 w-4 text-[#d4885c]" />
                  </div>
                  <div className="mt-1.5 text-xl font-extrabold text-white">
                    R$ {totalProjected12mLtv.toLocaleString("pt-BR")}
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-[#f3b692]">
                    R$ {projected12mRestaurantLtv.toLocaleString("pt-BR")} Mesa + R${" "}
                    {projected12mCrossSellLtv.toLocaleString("pt-BR")} Cross-Sell
                  </div>
                  <p className="mt-1 text-[10px] text-slate-300">
                    Fórmula: Ticket × Freq/mês × 12 × Retenção
                  </p>
                </div>
              </div>
            </div>

            {/* 3. TRÊS PILARES DE TAGS: CONSUMOS ANTERIORES (EPOC) + ENRIQUECIMENTO DE DADOS (SALESBOX) + CROSS-SELL CULTURA & FASHION */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* PILAR A: Tags de Consumos Anteriores (Vindos do PDV EPOC) */}
              <div className="flex flex-col justify-between rounded-2xl border border-[#2e3138] bg-[#212328] p-4">
                <div>
                  <div className="flex items-center gap-2 border-b border-[#2e3138] pb-2.5">
                    <Wine className="h-4 w-4 text-[#65c3c8]" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                      1. Tags de Consumos Anteriores (PDV EPOC)
                    </h4>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">
                    Itens reais lidos das comandas fechadas pelo CPF no EPOC POS:
                  </p>

                  <div className="mt-3 space-y-2">
                    {meta.previousConsumptionTags.map((c, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-[#32353e] bg-[#1a1c20] p-2.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-white">{c.item}</span>
                          <span className="rounded-full bg-[#65c3c8]/20 px-2 py-0.5 font-mono text-[10px] font-bold text-[#65c3c8]">
                            {c.count}x pedidos
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                          <span>Categoria: {c.category}</span>
                          <span>Média R$ {c.avgPrice} · {c.lastOrdered}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Alerta de Alergia / IA Garçom */}
                <div className="mt-3 rounded-xl border border-[#d4885c]/40 bg-[#1a1c20] p-2.5 text-[11px]">
                  <span className="font-bold text-[#f3b692]">
                    IA Garçom ({activeGuest.waiterAi.wineTier}):
                  </span>
                  <p className="mt-0.5 text-slate-300">{activeGuest.waiterAi.approachTip}</p>
                </div>
              </div>

              {/* PILAR B: Tags de Enriquecimento de Dados (Wangari Data Hub + 11 APIs SalesBox) */}
              <div className="flex flex-col justify-between rounded-2xl border border-[#2e3138] bg-[#212328] p-4">
                <div>
                  <div className="flex items-center justify-between border-b border-[#2e3138] pb-2.5">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-amber-400" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                        2. Tags de Enriquecimento (Wangari / SalesBox)
                      </h4>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">
                    Atributos enriquecidos por CPF via funil de 11 APIs (com minimização LGPD):
                  </p>

                  <div className="mt-3 space-y-2">
                    {meta.enrichmentBadges.map((b, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-[#32353e] bg-[#1a1c20] p-2.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                            {b.label}
                          </span>
                          <span className="text-[10px] text-slate-400">{b.sourceApi}</span>
                        </div>
                        <p className="mt-1.5 text-[11px] text-slate-200">{b.highlight}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between rounded-xl border border-[#32353e] bg-[#1a1c20] p-2.5 text-[11px]">
                  <div>
                    <span className="text-slate-400">Consentimento LGPD:</span>{" "}
                    <strong className="text-emerald-400">
                      {activeGuest.consents.enrichment.granted ? "Ativo" : "Revogado"}
                    </strong>
                  </div>
                  <button
                    disabled={busy}
                    onClick={() =>
                      onAction({
                        action: "ENRICH_GUEST_WANGARI",
                        guestId: activeGuest.id,
                      })
                    }
                    className="rounded bg-amber-500 px-2.5 py-1 text-[10px] font-bold text-slate-950 hover:bg-amber-400"
                  >
                    Atualizar Funil
                  </button>
                </div>
              </div>

              {/* PILAR C: Tags e Motor de Cross-Sell em Cultura & Fashion */}
              <div className="flex flex-col justify-between rounded-2xl border border-purple-500/40 bg-gradient-to-b from-[#212328] to-purple-950/20 p-4">
                <div>
                  <div className="flex items-center gap-2 border-b border-purple-500/30 pb-2.5">
                    <Palette className="h-4 w-4 text-purple-300" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-200">
                      3. Cross-Sell em Cultura & Fashion
                    </h4>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-300">
                    Recomendações cruzadas entre Gastronomia, Moda, Arte e Eventos Culturais:
                  </p>

                  <div className="mt-3 space-y-2.5">
                    {meta.cultureFashionCrossSell.map((cs, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-purple-500/30 bg-[#1a1c20]/90 p-3 text-xs"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/25 px-2.5 py-0.5 text-[10px] font-bold text-purple-200">
                            {cs.vertical === "FASHION" ? (
                              <ShoppingBag className="h-3 w-3" />
                            ) : (
                              <Compass className="h-3 w-3" />
                            )}
                            {cs.vertical} · {cs.tag}
                          </span>
                          <span className="font-mono text-[10px] font-bold text-emerald-400">
                            Match {cs.propensityScore}%
                          </span>
                        </div>
                        <p className="mt-1.5 text-[11px] text-slate-200 leading-snug">
                          {cs.suggestedAction}
                        </p>
                        <div className="mt-2 flex items-center justify-between border-t border-slate-800 pt-1.5">
                          <span className="font-mono text-[10px] text-amber-300">
                            Ticket Combo: R$ {cs.bundleTicket}
                          </span>
                          <button
                            onClick={() =>
                              setCampaignFeedback(
                                `Convite Cross-Sell [${cs.vertical}] enviado para ${activeGuest.name} via WhatsApp/SuperApp: "${cs.suggestedAction}" (Potencial: R$ ${cs.bundleTicket})!`
                              )
                            }
                            className="flex items-center gap-1 rounded bg-purple-500 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-purple-400"
                          >
                            <Send className="h-2.5 w-2.5" /> Disparar Convite
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-purple-500/30 bg-purple-950/30 p-2.5 text-[11px] text-purple-200">
                  <strong>Sinergia Ecossistema:</strong> Clientes que combinam Reserva + Cultura/Fashion têm{" "}
                  <strong>LTV 2,4x maior</strong> e taxa de no-show próxima de zero.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
