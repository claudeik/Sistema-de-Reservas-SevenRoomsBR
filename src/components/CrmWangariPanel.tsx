"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Filter,
  Lock,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  User,
  Wine,
} from "lucide-react";
import { DatabaseState, MarketingClusterName } from "@/types/domain";

interface CrmWangariPanelProps {
  db: DatabaseState;
  selectedGuestId: string | null;
  onSelectGuest: (guestId: string) => void;
  onAction: (payload: Record<string, unknown>) => Promise<void>;
  busy: boolean;
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

  const filteredGuests = db.guests.filter(
    (g) => clusterFilter === "ALL" || g.marketingCluster === clusterFilter
  );

  const activeGuest =
    db.guests.find((g) => g.id === selectedGuestId) || filteredGuests[0] || db.guests[0];

  return (
    <div className="space-y-6">
      {/* Topo: Visão dos 7 Clusters de Marketing (k-prototypes RFV + SalesBox — Seção 11) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold text-white">
              <Database className="h-4 w-4 text-amber-400" />
              Motor de Clusterização (RFV Interno EPOC + Data Hub Wangari / SalesBox — Seção 11)
            </h3>
            <p className="text-xs text-slate-400">
              Agrupamento k-prototypes combinando histórico real do restaurante com as 11 APIs da SalesBox em funil,
              respeitando minimização de dados e consentimento LGPD.
            </p>
          </div>
          <button
            onClick={() => setClusterFilter("ALL")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              clusterFilter === "ALL"
                ? "bg-amber-500 text-slate-950"
                : "border border-slate-700 bg-slate-800 text-slate-300"
            }`}
          >
            Todos os Clientes ({db.guests.length})
          </button>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {(Object.keys(CLUSTER_DESCRIPTIONS) as MarketingClusterName[]).map((clusterName) => {
            const count = db.guests.filter((g) => g.marketingCluster === clusterName).length;
            const meta = CLUSTER_DESCRIPTIONS[clusterName];
            const isSelected = clusterFilter === clusterName;
            return (
              <div
                key={clusterName}
                onClick={() =>
                  setClusterFilter(isSelected ? "ALL" : clusterName)
                }
                className={`cursor-pointer rounded-xl border p-3 transition ${
                  isSelected
                    ? "border-amber-400 bg-amber-950/30 ring-1 ring-amber-400"
                    : "border-slate-800 bg-slate-950/70 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${meta.badgeClass}`}>
                    {count} {count === 1 ? "cliente" : "clientes"}
                  </span>
                </div>
                <h4 className="mt-2 text-xs font-bold text-white">{clusterName}</h4>
                <p className="mt-1 text-[10px] text-slate-400 leading-snug">{meta.rule}</p>
                <p className="mt-1.5 border-t border-slate-800/80 pt-1.5 text-[10px] text-amber-300/90">
                  Ação: {meta.action}
                </p>
              </div>
            );
          })}
        </div>

        {campaignFeedback && (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3.5 py-2 text-xs text-emerald-200">
            <span>{campaignFeedback}</span>
            <button onClick={() => setCampaignFeedback(null)} className="text-emerald-400 underline">
              Fechar
            </button>
          </div>
        )}
      </div>

      {/* Grid Principal CRM: Lista de Perfis (4 cols) + Ficha 360º & Funil 11 APIs SalesBox (8 cols) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Coluna Esquerda: Lista de Perfis por CPF */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-4 xl:col-span-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Base Única por CPF ({filteredGuests.length})
            </span>
            <Filter className="h-4 w-4 text-slate-400" />
          </div>

          <div className="space-y-2.5 max-h-[680px] overflow-y-auto pr-1">
            {filteredGuests.map((g) => {
              const selected = activeGuest?.id === g.id;
              const clusterMeta = CLUSTER_DESCRIPTIONS[g.marketingCluster];
              return (
                <div
                  key={g.id}
                  onClick={() => onSelectGuest(g.id)}
                  className={`cursor-pointer rounded-xl border p-3 transition ${
                    selected
                      ? "border-amber-400 bg-slate-800/90 shadow-md"
                      : "border-slate-800 bg-slate-950/70 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-white">{g.name}</h4>
                      <p className="font-mono text-[11px] text-slate-400">
                        CPF: {g.cpfMasked} · Hash: {g.cpfHash.slice(0, 16)}...
                      </p>
                    </div>
                    <span
                      className={`rounded border px-2 py-0.5 text-[10px] font-bold ${clusterMeta.badgeClass}`}
                    >
                      {g.marketingCluster}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-300">
                    <span>
                      Visitas: <strong>{g.visitsCount}</strong>
                    </span>
                    <span>
                      Ticket Médio: <strong className="text-emerald-300">R$ {g.averageTicket.toFixed(0)}</strong>
                    </span>
                    <span>
                      No-shows:{" "}
                      <strong className={g.noShowCount >= 3 ? "text-rose-400" : "text-slate-300"}>
                        {g.noShowCount}
                      </strong>
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1">
                    {g.tags.map((tg) => (
                      <span
                        key={tg}
                        className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300"
                      >
                        {tg}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coluna Direita: Ficha 360º do Cliente, IA Garçom, Funil 11 APIs SalesBox & Governança LGPD */}
        {activeGuest && (
          <div className="flex flex-col gap-4 xl:col-span-8">
            {/* Cabeçalho do Perfil 360º */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-amber-400" />
                    <h2 className="text-lg font-bold text-white">{activeGuest.name}</h2>
                    <span className="rounded border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                      {activeGuest.marketingCluster}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    CPF Mascarado (LGPD): <strong className="font-mono text-white">{activeGuest.cpfMasked}</strong> ·
                    ID Hash: <span className="font-mono text-slate-300">{activeGuest.cpfHash}</span> · Celular:{" "}
                    <strong className="text-slate-200">{activeGuest.phone}</strong>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    disabled={busy}
                    onClick={() =>
                      onAction({
                        action: "ENRICH_GUEST_WANGARI",
                        guestId: activeGuest.id,
                      })
                    }
                    className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Rodar Funil Wangari / SalesBox (11 APIs)
                  </button>

                  <button
                    onClick={() => {
                      if (!activeGuest.consents.marketing.granted) {
                        setCampaignFeedback(
                          `Disparo bloqueado pela Regra #1 (Seção 11): ${activeGuest.name} não possui opt-in de Marketing ativo.`
                        );
                        return;
                      }
                      if (activeGuest.salesBoxAttributes?.isRecycledNumber) {
                        setCampaignFeedback(
                          `Disparo bloqueado pela Regra #3 (Seção 11): Número reciclado detectado na API SalesBox #3.`
                        );
                        return;
                      }
                      setCampaignFeedback(
                        `Campanha disparada com sucesso para ${activeGuest.name} via ${
                          activeGuest.salesBoxAttributes?.preferredChannel || "WHATSAPP"
                        }: "${CLUSTER_DESCRIPTIONS[activeGuest.marketingCluster].action}"!`
                      );
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-500/20 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-500/30"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Testar Disparo do Cluster
                  </button>
                </div>
              </div>

              {/* Métricas RFV + Consumo Interno EPOC + Atributos Enriquecidos SalesBox */}
              <div className="mt-3.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                  <span className="text-[10px] uppercase text-slate-400">Score RFV & Visitas</span>
                  <div className="mt-1 text-base font-extrabold text-white">
                    {activeGuest.rfvScore} ({activeGuest.visitsCount}x)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Recência: {activeGuest.recencyDays} dias
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                  <span className="text-[10px] uppercase text-slate-400">Ticket Médio (EPOC)</span>
                  <div className="mt-1 text-base font-extrabold text-emerald-400">
                    R$ {activeGuest.averageTicket.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Total acumulado: R$ {activeGuest.totalSpent.toFixed(0)}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                  <span className="text-[10px] uppercase text-slate-400">Score Consumo SalesBox</span>
                  <div className="mt-1 text-base font-extrabold text-amber-300">
                    {activeGuest.salesBoxAttributes
                      ? `${activeGuest.salesBoxAttributes.consumptionPotentialScore} / 1000`
                      : "Bloqueado LGPD"}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {activeGuest.salesBoxAttributes?.presumedIncomeBracket || "Sem enriquecimento"}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                  <span className="text-[10px] uppercase text-slate-400">Canal & Higienização</span>
                  <div className="mt-1 text-sm font-bold text-cyan-300">
                    {activeGuest.salesBoxAttributes?.preferredChannel || "APENAS SERVIÇO"}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {activeGuest.salesBoxAttributes?.cityNeighborhood || "CEP não enriquecido"}
                  </div>
                </div>
              </div>

              {/* Bloco IA para o Garçom & Preferências Gastronômicas */}
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-amber-500/30 bg-amber-950/15 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-amber-300">
                    <Sparkles className="h-4 w-4" />
                    <span>Motor de IA para o Garçom (Cartão da Mesa)</span>
                  </div>
                  {activeGuest.waiterAi.allergyAlert && (
                    <div className="mt-2 flex items-center gap-2 rounded bg-rose-950/90 border border-rose-500 px-2.5 py-1.5 text-xs font-bold text-rose-200">
                      <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                      <span>{activeGuest.waiterAi.allergyAlert}</span>
                    </div>
                  )}
                  <div className="mt-2 text-xs text-slate-200">
                    <p className="font-semibold text-amber-200">
                      <Wine className="inline h-3.5 w-3.5 mr-1" />
                      Faixa calibrada: {activeGuest.waiterAi.wineTier}
                    </p>
                    <ul className="mt-1 list-disc pl-4 text-[11px] text-slate-300 space-y-0.5">
                      {activeGuest.waiterAi.recommendedWines.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-[11px] italic text-slate-400">
                      Dica ao Garçom: &ldquo;{activeGuest.waiterAi.approachTip}&rdquo;
                    </p>
                  </div>
                </div>

                {/* Portal de Consentimentos Granulares LGPD (Seções 8 e 11) */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-emerald-300">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Governança LGPD & Consentimentos do Titular</span>
                    </div>
                    <span className="text-[10px] text-slate-400">1-Click Opt-out</span>
                  </div>

                  <div className="mt-2.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between rounded bg-slate-900 px-2.5 py-1.5">
                      <div>
                        <span className="font-semibold text-white">1. Execução de Serviço (Reserva/Fila)</span>
                        <p className="text-[10px] text-slate-400">Base: Execução de Contrato</p>
                      </div>
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                        ATIVO
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded bg-slate-900 px-2.5 py-1.5">
                      <div>
                        <span className="font-semibold text-white">2. Enriquecimento por CPF (Wangari/SalesBox)</span>
                        <p className="text-[10px] text-slate-400">
                          Separado de marketing · Minimização ativa (sem score de crédito/saúde)
                        </p>
                      </div>
                      <button
                        disabled={busy}
                        onClick={() =>
                          onAction({
                            action: "UPDATE_GUEST_CONSENTS",
                            guestId: activeGuest.id,
                            enrichment: !activeGuest.consents.enrichment.granted,
                          })
                        }
                        className={`rounded px-2.5 py-1 text-[10px] font-bold ${
                          activeGuest.consents.enrichment.granted
                            ? "bg-emerald-500 text-slate-950"
                            : "bg-rose-500/30 text-rose-200 border border-rose-500/40"
                        }`}
                      >
                        {activeGuest.consents.enrichment.granted ? "CONSENTIDO (Revogar)" : "REVOGADO (Ativar)"}
                      </button>
                    </div>

                    <div className="flex items-center justify-between rounded bg-slate-900 px-2.5 py-1.5">
                      <div>
                        <span className="font-semibold text-white">3. Disparo de Campanhas & Marketing</span>
                        <p className="text-[10px] text-slate-400">
                          Canal: {activeGuest.consents.marketing.channel}
                        </p>
                      </div>
                      <button
                        disabled={busy}
                        onClick={() =>
                          onAction({
                            action: "UPDATE_GUEST_CONSENTS",
                            guestId: activeGuest.id,
                            marketing: !activeGuest.consents.marketing.granted,
                          })
                        }
                        className={`rounded px-2.5 py-1 text-[10px] font-bold ${
                          activeGuest.consents.marketing.granted
                            ? "bg-emerald-500 text-slate-950"
                            : "bg-rose-500/30 text-rose-200 border border-rose-500/40"
                        }`}
                      >
                        {activeGuest.consents.marketing.granted ? "OPT-IN ATIVO (Opt-out)" : "OPT-OUT (Reativar)"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Funil Detalhado das 11 APIs da SalesBox via Wangari Data Hub (Seção 11) */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Pipeline do Funil Data Hub Wangari + 11 APIs SalesBox (Seção 11)
                  </h3>
                  <p className="text-xs text-slate-400">
                    As etapas 1 a 4 higienizam e cortam custos; as etapas 5 a 9 enriquecem apenas a base válida e ativa.
                  </p>
                </div>
                <span className="rounded bg-slate-800 px-2.5 py-1 text-[11px] text-emerald-300 font-semibold">
                  AWS Região Brasil (sa-east-1)
                </span>
              </div>

              {activeGuest.salesBoxFunnelLog.length === 0 ? (
                <div className="my-4 rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs text-rose-200">
                  <div className="flex items-center gap-2 font-bold">
                    <Lock className="h-4 w-4 text-rose-400" />
                    <span>Enriquecimento não executado para este CPF (Status: {activeGuest.enrichmentStatus})</span>
                  </div>
                  <p className="mt-1 text-slate-300">
                    Para processar o funil de 11 APIs da SalesBox, certifique-se de que o consentimento{" "}
                    <strong>Enriquecimento por CPF</strong> está ativo acima e clique em{" "}
                    <strong>&ldquo;Rodar Funil Wangari / SalesBox&rdquo;</strong>.
                  </p>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {activeGuest.salesBoxFunnelLog.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800/90 bg-slate-950/70 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-12 items-center justify-center rounded bg-slate-800 font-mono text-[10px] font-bold text-amber-300">
                          #{step.step}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{step.apiName}</span>
                            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-400">
                              Custo: {step.costTier}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">{step.purpose}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          {step.outputSummary}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Linha do Tempo 360º do Cliente (Reservas, Fila, Consumo EPOC, Enriquecimento) */}
              <div className="mt-4 border-t border-slate-800 pt-3.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Linha do Tempo 360º (Reservas + Fila + Comandas PDV EPOC + CRM)
                </h4>
                <div className="mt-2 space-y-2">
                  {activeGuest.timeline.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between rounded-lg border border-slate-800/70 bg-slate-950/50 px-3 py-2 text-xs"
                    >
                      <div>
                        <span className="font-mono text-[10px] text-slate-400">{ev.date}</span> ·{" "}
                        <strong className="text-white">{ev.title}</strong>
                        <p className="text-[11px] text-slate-400">{ev.description}</p>
                      </div>
                      {ev.amount !== undefined && (
                        <span className="rounded bg-emerald-500/20 px-2.5 py-1 font-mono text-xs font-bold text-emerald-300">
                          R$ {ev.amount.toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
