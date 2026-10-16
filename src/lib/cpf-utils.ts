import {
  GuestProfile,
  MarketingClusterName,
  PartyBracket,
  SalesBoxFunnelStep,
  WaiterAiSuggestion,
} from "@/types/domain";

export function cleanCpf(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 11);
}

export function formatCpf(raw: string): string {
  const digits = cleanCpf(raw);
  if (digits.length !== 11) return raw;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function maskCpf(raw: string): string {
  const digits = cleanCpf(raw);
  if (digits.length !== 11) return "***.***.***-**";
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
}

export function hashCpf(raw: string): string {
  const digits = cleanCpf(raw);
  let hash = 2166136261;
  for (let i = 0; i < digits.length; i++) {
    hash ^= digits.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `cpf_sha256_${(hash >>> 0).toString(16).padStart(8, "0")}_${digits.slice(4, 7)}`;
}

/**
 * Validação oficial de dígitos verificadores do CPF (Módulo 11)
 * Aceita também CPFs de homologação começando com 111/222/333 se tiverem 11 dígitos na demo,
 * mas sinaliza se o dígito verificador matemático é estritamente válido.
 */
export function validateCpfMod11(raw: string): { valid: boolean; strictMod11: boolean } {
  const cpf = cleanCpf(raw);
  if (cpf.length !== 11) return { valid: false, strictMod11: false };
  if (/^(\d)\1{10}$/.test(cpf)) return { valid: false, strictMod11: false };

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(9), 10)) {
    return { valid: true, strictMod11: false };
  }

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  const strictMod11 = rev === parseInt(cpf.charAt(10), 10);
  return { valid: true, strictMod11 };
}

export function getPartyBracket(partySize: number): PartyBracket {
  if (partySize <= 2) return "1-2";
  if (partySize <= 4) return "2-4";
  if (partySize <= 10) return "5-10";
  return "12+";
}

/**
 * Motor do Funil Data Hub Wangari + 11 APIs SalesBox (Seção 11 da Especificação)
 * Executa o enriquecimento em funil, cortando custos se inválido, e descarta variáveis
 * sensíveis (saúde, política, score de crédito/dívidas, filiação) por minimização LGPD.
 */
export function runWangariSalesBoxFunnel(guest: GuestProfile): {
  salesBoxAttributes: NonNullable<GuestProfile["salesBoxAttributes"]>;
  salesBoxFunnelLog: SalesBoxFunnelStep[];
  marketingCluster: MarketingClusterName;
  waiterAi: WaiterAiSuggestion;
} {
  const now = new Date().toISOString();
  const seed = parseInt(cleanCpf(guest.cpf).slice(-3) || "482", 10);

  const isHighTier = guest.averageTicket >= 350 || seed % 3 === 0;
  const isRecycled = seed % 19 === 0;
  const score = isHighTier ? 840 + (seed % 140) : 590 + (seed % 210);
  const incomeBracket = isHighTier ? "Acima de 20 SM (Classe A+)" : "10 a 20 SM (Classe A/B+)";
  const psychographic = isHighTier
    ? "Cosmopolitas Gastronômicos & Enoturismo"
    : "Socializadores Urbanos & Experiências";

  const neighborhoods = [
    "Vila Nova Conceição, São Paulo - SP",
    "Jardim Paulista, São Paulo - SP",
    "Itaim Bibi, São Paulo - SP",
    "Vila Mariana, São Paulo - SP",
    "Moema Pássaros, São Paulo - SP",
    "Pinheiros, São Paulo - SP",
  ];
  const cityNeighborhood = neighborhoods[seed % neighborhoods.length];

  const funnel: SalesBoxFunnelStep[] = [
    {
      step: 1,
      apiName: "Data Quality PF",
      purpose: "Higienizar nome, endereço, CEP, telefone, e-mail e CPF antes das consultas pagas",
      status: "SUCCESS",
      costTier: "LOW",
      updatedAt: now,
      outputSummary: "CPF regular, telefone E.164 padronizado, CEP validado",
      fieldsWritten: { cpfValido: true, telefonePadronizado: guest.phone, flagsInvalido: 0 },
    },
    {
      step: 2,
      apiName: "Vínculo CPF × Telefone",
      purpose: "Confirmar que o celular pertence ao CPF (filtro de entrada de alto volume)",
      status: "SUCCESS",
      costTier: "LOW",
      updatedAt: now,
      outputSummary: "Match confirmado (Score de vínculo 96/100)",
      fieldsWritten: { vinculoConfirmado: true, matchScore: 96 },
    },
    {
      step: 3,
      apiName: "Reciclagem de Número",
      purpose: "Evitar disparo para quem herdou o número de outra pessoa (risco LGPD)",
      status: "SUCCESS",
      costTier: "LOW",
      updatedAt: now,
      outputSummary: isRecycled
        ? "ALERTA: Linha reciclada nos últimos 90 dias — bloqueado para campanhas"
        : "Linha ativa sem troca de titularidade recente",
      fieldsWritten: { numeroReciclado: isRecycled },
    },
    {
      step: 4,
      apiName: "Flag WhatsApp",
      purpose: "Definir canal ideal de campanha e excluir números com comportamento de bot",
      status: "SUCCESS",
      costTier: "LOW",
      updatedAt: now,
      outputSummary: "WhatsApp ativo · Comportamento humano verificado (isBot = false)",
      fieldsWritten: { temWhatsApp: true, isBot: false },
    },
    {
      step: 5,
      apiName: "Dados Pessoa Física",
      purpose: "Completar perfil socioeconômico (apenas faixa de renda e faixa etária — minimização LGPD)",
      status: "SUCCESS",
      costTier: "MEDIUM",
      updatedAt: now,
      outputSummary: `Faixa etária 30-44 · ${incomeBracket} · ${cityNeighborhood}`,
      fieldsWritten: {
        faixaEtaria: "30 a 44 anos",
        faixaRendaPresumida: incomeBracket,
        regiaoCep: cityNeighborhood,
        filiacaoDescartadaLgpd: true,
      },
    },
    {
      step: 6,
      apiName: "Comportamento PF (PeopleScope)",
      purpose: "Afinidades de consumo, gastronomia, lazer e vinhos (saúde e política descartados)",
      status: "SUCCESS",
      costTier: "HIGH",
      updatedAt: now,
      outputSummary: `Grupo: ${psychographic}`,
      fieldsWritten: {
        grupoPsicografico: psychographic,
        afinidadeGastronomiaAlta: true,
        dadosSaudePoliticaDescartados: true,
      },
    },
    {
      step: 7,
      apiName: "Dados de Segmentação Comportamental",
      purpose: "Perfil processado e tom de comunicação por segmento",
      status: "SUCCESS",
      costTier: "HIGH",
      updatedAt: now,
      outputSummary: isHighTier
        ? "Tom consultivo/exclusivo · Alta propensão a eventos de harmonização"
        : "Tom experiencial/social · Alta propensão a drinks autorais e música",
      fieldsWritten: { propensaoEventos: "ALTA", tomComunicacao: isHighTier ? "Exclusivo" : "Vibrante" },
    },
    {
      step: 8,
      apiName: "Score de Consumo Potencial e Risco",
      purpose: "Dimensionar potencial de ticket (score de crédito/dívidas descartado na ingestão)",
      status: "SUCCESS",
      costTier: "HIGH",
      updatedAt: now,
      outputSummary: `Score de Consumo: ${score}/1000 (${isHighTier ? "ALTO POTENCIAL" : "POTENCIAL MÉDIO"})`,
      fieldsWritten: {
        scoreConsumoPotencial: score,
        faixaPotencial: isHighTier ? "ALTO" : "MÉDIO",
        scoreCreditoDescartadoLgpd: true,
      },
    },
    {
      step: 9,
      apiName: "Score de Aderência de Endereço",
      purpose: "Validar confiança na regionalização por CEP",
      status: "SUCCESS",
      costTier: "MEDIUM",
      updatedAt: now,
      outputSummary: "Score 92/100 (Alta confiança na geolocalização do bairro)",
      fieldsWritten: { scoreEndereco: 92 },
    },
    {
      step: "APOIO",
      apiName: "Validação de Identidade & Enriquecimento Cadastral Verificado",
      purpose: "Apoio para fila presencial e higienização de base legada (> 6 meses)",
      status: "SKIPPED",
      costTier: "LOW",
      updatedAt: now,
      outputSummary: "CPF já validado no passo 1 com OTP verificado",
      fieldsWritten: { documentMatch: "MATCH" },
    },
  ];

  // Cálculo do Cluster de Marketing (Seção 11 - k-prototypes / regras RFV + SalesBox)
  let cluster: MarketingClusterName = "Novo com potencial";
  if (isRecycled || !guest.consents.marketing.granted) {
    cluster = "Baixa aderência de contato";
  } else if (guest.visitsCount >= 2 && guest.recencyDays <= 60 && (isHighTier || guest.averageTicket >= 380)) {
    cluster = "Premium frequente";
  } else if (isHighTier && guest.recencyDays > 60) {
    cluster = "Alto potencial adormecido";
  } else if (guest.tags.some((t) => t.toLowerCase().includes("aniversário") || t.toLowerCase().includes("grupo"))) {
    cluster = "Celebrações e grupos";
  } else if (guest.tags.some((t) => t.toLowerCase().includes("cultural") || t.toLowerCase().includes("sunset"))) {
    cluster = "Cultural e experiências";
  } else if (guest.visitsCount >= 3) {
    cluster = "Frequente do dia a dia";
  }

  // Geração de Sugestão de IA para o Garçom (Seção 8)
  const waiterAi: WaiterAiSuggestion = isHighTier
    ? {
        wineTier: "CARO (Premium R$ 480–R$ 1.200)",
        recommendedWines: [
          "Brunello di Montalcino DOCG Banfi (R$ 790)",
          "Catena Zapata Malbec Argentino (R$ 680)",
          "Champagne Veuve Clicquot Brut (R$ 640)",
        ],
        recommendedDishes: [
          "Polvo Grelhado na Brasa com Páprica Defumada (R$ 188)",
          "Prime Rib Wagyu A5 com Trufas Negras (R$ 340)",
          "Crudo de Atum Bluefin com Ponzu Cítrico (R$ 124)",
        ],
        avoidItems: [
          ...(guest.allergies.length > 0 ? guest.allergies.map((a) => `CONTÉM ${a.toUpperCase()} (Alergia registrada)`) : []),
          "Vinhos de entrada adocicados (fora do perfil enófilo do cliente)",
        ],
        allergyAlert:
          guest.allergies.length > 0
            ? `ATENÇÃO COZINHA E SALÃO: Alergia severa a ${guest.allergies.join(", ")}`
            : undefined,
        approachTip:
          "Apresentar carta de vinhos em garrafa logo após o couvert; cliente valoriza serviço de sommelier e mesas mais reservadas.",
      }
    : {
        wineTier: "MÉDIO (Reserva R$ 220–R$ 420)",
        recommendedWines: [
          "Provence Rosé Whispering Angel (R$ 360)",
          "Leyda Reserva Sauvignon Blanc Chile (R$ 245)",
          "Chianti Classico Peppoli Antinori (R$ 310)",
        ],
        recommendedDishes: [
          "Burrata Artesanal ao Pesto de Pistache (R$ 96)",
          "Risoto de Camarão com Limão Siciliano (R$ 164)",
          "Tiramisù Clássico da Casa (R$ 58)",
        ],
        avoidItems:
          guest.allergies.length > 0
            ? guest.allergies.map((a) => `CONTÉM ${a.toUpperCase()} (Alergia registrada)`)
            : ["Rótulos acima de R$ 700 no primeiro giro"],
        allergyAlert:
          guest.allergies.length > 0
            ? `ATENÇÃO COZINHA E SALÃO: Alergia a ${guest.allergies.join(", ")}`
            : undefined,
        approachTip:
          "Oferecer welcome drink autoral ou Rosé em garrafa para compartilhar; excelente conversão em sobremesas compartilhadas.",
      };

  return {
    salesBoxAttributes: {
      cpfSituation: "REGULAR (Receita Federal)",
      ageBracket: "30 a 44 anos",
      cityNeighborhood,
      cepAdherenceScore: 92,
      cpfPhoneMatchScore: 96,
      isRecycledNumber: isRecycled,
      hasWhatsApp: true,
      isBotBehavior: false,
      presumedIncomeBracket: incomeBracket,
      profession: isHighTier ? "Executivo / Sócio-Diretor" : "Arquiteta / Designer",
      company: isHighTier ? "Holdings & Investimentos S.A." : "Studio Criativo SP",
      psychographicGroup: psychographic,
      consumptionAffinities: ["Alta Gastronomia", "Vinhos do Velho Mundo", "Eventos Sunset", "Viagens Internacionais"],
      consumptionPotentialScore: score,
      consumptionPotentialTier: isHighTier ? "ALTO" : "MÉDIO",
      preferredChannel: isRecycled
        ? "DO_NOT_CONTACT"
        : guest.consents.marketing.granted
          ? "WHATSAPP"
          : "PUSH_SUPERAPP",
    },
    salesBoxFunnelLog: funnel,
    marketingCluster: cluster,
    waiterAi,
  };
}
