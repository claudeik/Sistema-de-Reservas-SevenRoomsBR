"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Building2,
  CheckCircle2,
  ClipboardList,
  Code2,
  LayoutGrid,
  Megaphone,
  RefreshCcw,
  Server,
  Settings,
  TrendingUp,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { DatabaseState } from "@/types/domain";
import FloorplanCanvas from "@/components/FloorplanCanvas";
import WaitlistAndReservationsPanel from "@/components/WaitlistAndReservationsPanel";
import CrmWangariPanel from "@/components/CrmWangariPanel";
import EpocSimulatorAndApiPanel from "@/components/EpocSimulatorAndApiPanel";
import CampaignsAndYieldPanel from "@/components/CampaignsAndYieldPanel";

type ActiveModuleTab =
  | "FLOORPLAN"
  | "RESERVATIONS_WAITLIST"
  | "CRM_WANGARI"
  | "CAMPAIGNS_YIELD"
  | "EPOC_SIMULATOR"
  | "QR_AND_API";

export default function ReservationEpocPlatformPage() {
  const [db, setDb] = useState<DatabaseState | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveModuleTab>("FLOORPLAN");
  const [selectedAreaId, setSelectedAreaId] = useState<string>("area-salao");
  const [selectedTableId, setSelectedTableId] = useState<string | null>("table-04-sr");
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>("guest-roberto");
  const [busy, setBusy] = useState<boolean>(false);
  const [toast, setToast] = useState<{
    type: "success" | "warning" | "error";
    text: string;
    subtext?: string;
  } | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/state", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as DatabaseState;
        setDb(data);
      }
    } catch (err) {
      console.error("Failed to fetch state:", err);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const handleAction = async (payload: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch("/api/v1/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.db) {
        setDb(data.db);
      }
      if (data.message) {
        setToast({
          type: data.ok ? (data.conflictAlert ? "warning" : "success") : "error",
          text: data.message,
          subtext: data.conflictAlert,
        });
      }
    } catch (err) {
      setToast({
        type: "error",
        text: err instanceof Error ? err.message : "Erro ao processar ação.",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleInspectGuest = (guestId: string) => {
    setSelectedGuestId(guestId);
    setActiveTab("CRM_WANGARI");
  };

  if (!db) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#18191d] text-slate-200">
        <div className="flex items-center gap-3 rounded-xl border border-[#2e3138] bg-[#222429] px-6 py-4">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#3ea6d8] border-t-transparent" />
          <span className="text-sm font-medium">
            Carregando SevenRoomsBR × PDV EPOC...
          </span>
        </div>
      </div>
    );
  }

  const totalOpenEpocRevenue = db.epocOrders
    .filter((o) => o.status !== "CLOSED")
    .reduce((acc, o) => acc + o.total, 0);

  const navItems = [
    {
      id: "FLOORPLAN" as const,
      label: "Floorplan",
      sub: "Mapa",
      icon: LayoutGrid,
    },
    {
      id: "RESERVATIONS_WAITLIST" as const,
      label: "Reservations",
      sub: "Fila & QR",
      icon: BookOpen,
    },
    {
      id: "CRM_WANGARI" as const,
      label: "Clients",
      sub: "CRM 360º",
      icon: Users,
    },
    {
      id: "CAMPAIGNS_YIELD" as const,
      label: "Campaigns",
      sub: "Yield & IA",
      icon: Megaphone,
    },
    {
      id: "EPOC_SIMULATOR" as const,
      label: "Servers",
      sub: "PDV EPOC",
      icon: Server,
    },
    {
      id: "QR_AND_API" as const,
      label: "Livespend",
      sub: "API & App",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#16171a] text-slate-100">
      {/* BARRA VERTICAL ESQUERDA ESTILO IPAD SEVENROOMS */}
      <aside className="hidden md:flex w-20 shrink-0 flex-col items-center justify-between border-r border-[#2a2d34] bg-[#1c1d21] py-3">
        <div className="flex w-full flex-col items-center gap-1">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#3ea6d8] to-[#2678a0] font-black text-white shadow-md">
            SR
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex w-full flex-col items-center justify-center gap-1 border-l-2 py-3 text-center transition ${
                  active
                    ? "border-[#3ea6d8] bg-[#26282e] text-white"
                    : "border-transparent text-slate-400 hover:bg-[#222429] hover:text-slate-200"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "text-[#3ea6d8]" : "text-slate-400"}`} />
                <span className="text-[10px] font-semibold leading-tight">{item.label}</span>
                <span className="text-[9px] text-slate-500 leading-none">{item.sub}</span>
              </button>
            );
          })}
        </div>

        {/* Rodapé da Barra Vertical: Config & Sync Reset igual ao SevenRooms */}
        <div className="flex flex-col items-center gap-3 border-t border-[#2a2d34] pt-3">
          <button
            onClick={() => setActiveTab("EPOC_SIMULATOR")}
            title="Configurações EPOC Adapter"
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-[#26282e] hover:text-white"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            disabled={busy}
            onClick={() => handleAction({ action: "RESET_SEED" })}
            title="Resetar Dados de Demonstração"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#26282e] text-slate-300 hover:bg-[#32353d] hover:text-white"
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* ÁREA DIREITA PRINCIPAL */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Status Bar estilo iPad SevenRooms + Seletor Multiunidade + Telemetria EPOC */}
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2a2d34] bg-[#1c1d21] px-4 py-2 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold tracking-wide text-slate-300">iPad Host · SevenRoomsBR</span>
            <div className="flex items-center gap-1.5 rounded-md border border-[#30333b] bg-[#25272c] px-2.5 py-1">
              <Building2 className="h-3.5 w-3.5 text-[#3ea6d8]" />
              <select
                value={db.venue.id}
                onChange={(e) =>
                  handleAction({ action: "SWITCH_VENUE", venueId: e.target.value })
                }
                className="bg-transparent font-semibold text-white focus:outline-none"
              >
                {db.venuesList.map((v) => (
                  <option key={v.id} value={v.id} className="bg-[#1c1d21] text-white">
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab("CAMPAIGNS_YIELD")}
              className="hidden sm:flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-500/25 transition"
            >
              <Megaphone className="h-3.5 w-3.5 text-amber-400" />
              <span>Baixa Alocação · Criar Campanha IA</span>
            </button>
          </div>

          {/* Navegação Mobile (visível apenas em telas pequenas) */}
          <div className="flex md:hidden items-center gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`rounded px-2.5 py-1 text-[11px] font-bold ${
                  activeTab === item.id
                    ? "bg-[#3ea6d8] text-white"
                    : "bg-[#25272c] text-slate-400"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div
              onClick={() => setActiveTab("EPOC_SIMULATOR")}
              className={`cursor-pointer flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold ${
                db.venue.epocConnectionMode === "DEGRADED_OFFLINE"
                  ? "border-rose-500/50 bg-rose-950/50 text-rose-200"
                  : "border-[#55b699]/40 bg-[#55b699]/15 text-[#8be4c9]"
              }`}
            >
              {db.venue.epocConnectionMode === "DEGRADED_OFFLINE" ? (
                <>
                  <WifiOff className="h-3 w-3 text-rose-400" />
                  <span>EPOC Offline (Modo Degradado)</span>
                </>
              ) : (
                <>
                  <Wifi className="h-3 w-3 text-[#55b699]" />
                  <span>PDV EPOC Live (&lt;2s)</span>
                </>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-1.5 rounded-md border border-[#30333b] bg-[#25272c] px-2.5 py-1 text-[11px]">
              <ClipboardList className="h-3 w-3 text-[#d4885c]" />
              <span className="text-slate-400">Livespend EPOC:</span>
              <strong className="font-mono text-white">
                R$ {totalOpenEpocRevenue.toFixed(2)}
              </strong>
            </div>

            <div className="hidden lg:flex items-center gap-1 text-[11px] font-mono text-slate-400">
              <span>20:45 PM</span>
              <span className="ml-1 text-emerald-400">100%</span>
            </div>
          </div>
        </header>

        {/* Banner de Feedback / Alertas em Tempo Real */}
        {toast && (
          <div className="px-4 pt-3">
            <div
              className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-2.5 text-xs shadow-lg ${
                toast.type === "error"
                  ? "border-rose-500/60 bg-rose-950/70 text-rose-100"
                  : toast.type === "warning"
                    ? "border-amber-400/70 bg-amber-950/70 text-amber-100"
                    : "border-emerald-500/60 bg-emerald-950/70 text-emerald-100"
              }`}
            >
              <div className="flex items-start gap-2.5">
                {toast.type === "error" || toast.type === "warning" ? (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                )}
                <div>
                  <div className="font-bold">{toast.text}</div>
                  {toast.subtext && (
                    <div className="mt-1 font-semibold text-amber-300">{toast.subtext}</div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setToast(null)}
                className="rounded px-2 py-0.5 text-[11px] opacity-80 hover:opacity-100 underline"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        {/* Conteúdo Principal */}
        <main className="flex-1 p-3 sm:p-4">
          {activeTab === "FLOORPLAN" && (
            <FloorplanCanvas
              db={db}
              selectedAreaId={selectedAreaId}
              onSelectArea={setSelectedAreaId}
              selectedTableId={selectedTableId}
              onSelectTable={setSelectedTableId}
              onAction={handleAction}
              onInspectGuest={handleInspectGuest}
              busy={busy}
            />
          )}

          {activeTab === "RESERVATIONS_WAITLIST" && (
            <WaitlistAndReservationsPanel
              db={db}
              onAction={handleAction}
              onInspectGuest={handleInspectGuest}
              busy={busy}
            />
          )}

          {activeTab === "CRM_WANGARI" && (
            <CrmWangariPanel
              db={db}
              selectedGuestId={selectedGuestId}
              onSelectGuest={setSelectedGuestId}
              onAction={handleAction}
              busy={busy}
            />
          )}

          {activeTab === "CAMPAIGNS_YIELD" && (
            <CampaignsAndYieldPanel
              db={db}
              onAction={handleAction}
              onInspectGuest={handleInspectGuest}
              busy={busy}
            />
          )}

          {activeTab === "EPOC_SIMULATOR" && (
            <EpocSimulatorAndApiPanel
              db={db}
              mode="EPOC_SIMULATOR"
              onAction={handleAction}
              busy={busy}
            />
          )}

          {activeTab === "QR_AND_API" && (
            <EpocSimulatorAndApiPanel
              db={db}
              mode="QR_AND_API"
              onAction={handleAction}
              busy={busy}
            />
          )}
        </main>
      </div>
    </div>
  );
}
