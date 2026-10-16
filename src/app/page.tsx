"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  Code2,
  Database,
  LayoutGrid,
  RefreshCcw,
  Server,
  Sparkles,
  Wifi,
  WifiOff,
} from "lucide-react";
import { DatabaseState } from "@/types/domain";
import FloorplanCanvas from "@/components/FloorplanCanvas";
import WaitlistAndReservationsPanel from "@/components/WaitlistAndReservationsPanel";
import CrmWangariPanel from "@/components/CrmWangariPanel";
import EpocSimulatorAndApiPanel from "@/components/EpocSimulatorAndApiPanel";

type ActiveModuleTab =
  | "FLOORPLAN"
  | "RESERVATIONS_WAITLIST"
  | "CRM_WANGARI"
  | "EPOC_SIMULATOR"
  | "QR_AND_API";

export default function ReservationEpocPlatformPage() {
  const [db, setDb] = useState<DatabaseState | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveModuleTab>("FLOORPLAN");
  const [selectedAreaId, setSelectedAreaId] = useState<string>("area-salao");
  const [selectedTableId, setSelectedTableId] = useState<string | null>("table-01");
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
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-6 py-4">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          <span className="text-sm font-medium">
            Carregando Plataforma de Reservas, Fila Virtual, CRM 360º & EPOC Adapter...
          </span>
        </div>
      </div>
    );
  }

  const totalOpenEpocRevenue = db.epocOrders
    .filter((o) => o.status !== "CLOSED")
    .reduce((acc, o) => acc + o.total, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header Multi-Tenant (Marca > Unidade > Turno > Status PDV EPOC) */}
      <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          {/* Identidade & Seletor Multiunidade */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 font-black text-slate-950 shadow-md shadow-amber-500/20">
                DG
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold tracking-tight text-white">
                    Dguests NextGen × EPOC POS
                  </span>
                  <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                    v1.0 SevenRooms-Grade
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Reservas · Fila Virtual · QR Code · Mapa Tempo Real · CRM CPF (Wangari/SalesBox)
                </p>
              </div>
            </div>

            {/* Seletor Multi-Tenant de Unidade */}
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs">
              <Building2 className="h-3.5 w-3.5 text-amber-400" />
              <select
                value={db.venue.id}
                onChange={(e) =>
                  handleAction({ action: "SWITCH_VENUE", venueId: e.target.value })
                }
                className="bg-transparent font-semibold text-white focus:outline-none"
              >
                {db.venuesList.map((v) => (
                  <option key={v.id} value={v.id} className="bg-slate-900 text-white">
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Indicadores Ao Vivo: Conexão EPOC Adapter, Consumo em Aberto no Salão & Reset */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div
              onClick={() => setActiveTab("EPOC_SIMULATOR")}
              className={`cursor-pointer flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                db.venue.epocConnectionMode === "DEGRADED_OFFLINE"
                  ? "border-rose-500/50 bg-rose-950/50 text-rose-200"
                  : "border-emerald-500/40 bg-emerald-950/30 text-emerald-200 hover:bg-emerald-950/50"
              }`}
            >
              {db.venue.epocConnectionMode === "DEGRADED_OFFLINE" ? (
                <>
                  <WifiOff className="h-3.5 w-3.5 text-rose-400" />
                  <span>EPOC: MODO DEGRADADO (Offline)</span>
                </>
              ) : (
                <>
                  <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                  <span>PDV EPOC: {db.venue.epocConnectionMode.replace("ONLINE_", "")} (&lt;2s)</span>
                </>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs">
              <span className="text-slate-400">Comandas EPOC Abertas:</span>
              <strong className="font-mono text-emerald-400">
                R$ {totalOpenEpocRevenue.toFixed(2)}
              </strong>
            </div>

            <button
              disabled={busy}
              onClick={() => handleAction({ action: "RESET_SEED" })}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
              title="Restaurar dados iniciais da demonstração"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Resetar Demo
            </button>
          </div>
        </div>

        {/* Barra de Navegação dos 5 Módulos da Especificação */}
        <div className="mx-auto flex max-w-[1600px] overflow-x-auto border-t border-slate-900 px-4">
          {[
            {
              id: "FLOORPLAN" as const,
              label: "1. Mapa de Chão & Host (Tempo Real)",
              icon: LayoutGrid,
              badge: `${db.tables.filter((t) => !t.parentMergedIntoId).length} mesas`,
            },
            {
              id: "RESERVATIONS_WAITLIST" as const,
              label: "2. Reservas, Fila Virtual & Check-in QR",
              icon: CalendarClock,
              badge: `${db.reservations.length} res · ${
                db.waitlist.filter((w) => w.status === "WAITING" || w.status === "CALLED").length
              } fila`,
            },
            {
              id: "CRM_WANGARI" as const,
              label: "3. CRM 360º, CPF Wangari/SalesBox & IA Garçom",
              icon: Database,
              badge: "11 APIs + 7 Clusters",
            },
            {
              id: "EPOC_SIMULATOR" as const,
              label: "4. Simulador Terminal PDV EPOC & Adapter",
              icon: Server,
              badge: `${db.epocOrders.filter((o) => o.status !== "CLOSED").length} comandas`,
            },
            {
              id: "QR_AND_API" as const,
              label: "5. App Mobile QR, API REST /v1 & Webhooks",
              icon: Code2,
              badge: `${db.webhooks.length} eventos`,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-xs font-bold transition ${
                  isActive
                    ? "border-amber-400 bg-amber-500/10 text-amber-300"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    isActive
                      ? "bg-amber-400 text-slate-950 font-extrabold"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Banner de Feedback / Alertas em Tempo Real (Ex.: Comanda Aberta no EPOC, Conflito Realocado, etc.) */}
      {toast && (
        <div className="mx-auto max-w-[1600px] px-4 pt-3">
          <div
            className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-xs shadow-lg ${
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

      {/* Conteúdo Principal do Módulo Selecionado */}
      <main className="mx-auto max-w-[1600px] p-4">
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
  );
}
