/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Bus, 
  Route as RouteIcon,
  IdCard, 
  Menu, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Printer, 
  FileText, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  ShieldCheck, 
  Users, 
  Wrench,
  Search,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { FleetProvider, useFleet } from './context/FleetContext';
import { DailyStatusTab } from './components/DailyStatusTab';
import { ServicesDispatchTab } from './components/ServicesDispatchTab';
import { LicensesTab } from './components/LicensesTab';
import { MaintenanceTab } from './components/MaintenanceTab';
import { VehicleDossierScreen } from './components/VehicleDossierScreen';
import { DailyReportModal } from './components/DailyReportModal';
import { MonthlyReportModal } from './components/MonthlyReportModal';
import { WhatsAppStatusModal } from './components/WhatsAppStatusModal';
import { DailyDriverSearchModal } from './components/DailyDriverSearchModal';
import { formatDate } from './utils/timeUtils';

// SVG Icon for WhatsApp
const WhatsAppIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
  </svg>
);

// Navigation Sections
export type HubSection = 'GESTION_FLOTA' | 'GESTIONES_SERVICIOS' | 'LICENCIAS' | 'FICHA_UNIDAD' | 'TALLER_FALLAS';

function MainApp() {
  const [activeSection, setActiveSection] = useState<HubSection>('GESTION_FLOTA');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Secondary sub-view states
  const [previousSection, setPreviousSection] = useState<HubSection>('GESTION_FLOTA');
  const [dossierVehicleId, setDossierVehicleId] = useState<string | undefined>(undefined);
  const [maintenanceFilterUnit, setMaintenanceFilterUnit] = useState<string | undefined>(undefined);

  // Modals
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [showMonthlyReportModal, setShowMonthlyReportModal] = useState<boolean>(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState<boolean>(false);
  const [showDriverSearchModal, setShowDriverSearchModal] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  const { 
    metrics, 
    selectedDate, 
    setSelectedDate, 
    licenseMetrics, 
    dailyAssignments, 
    resetToInitialData 
  } = useFleet();

  // Navigation handlers
  const handleNavigate = (section: HubSection) => {
    setPreviousSection(activeSection === 'FICHA_UNIDAD' || activeSection === 'TALLER_FALLAS' ? 'GESTION_FLOTA' : activeSection);
    setActiveSection(section);
    setMobileMenuOpen(false);
  };

  const handleOpenDossier = (vehicleId?: string) => {
    if (vehicleId) setDossierVehicleId(vehicleId);
    setPreviousSection(activeSection);
    setActiveSection('FICHA_UNIDAD');
  };

  const handleGoToMaintenance = (unitNumber?: string) => {
    setMaintenanceFilterUnit(unitNumber);
    setPreviousSection(activeSection);
    setActiveSection('TALLER_FALLAS');
  };

  // Count services for current selected date
  const todayServicesCount = dailyAssignments.filter(a => a.date === selectedDate).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 antialiased">
      {/* 1. Global Top Bar */}
      <header className="bg-slate-900/95 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-full px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          
          {/* Left: Mobile hamburger & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title={sidebarCollapsed ? "Expandir menú lateral" : "Colapsar menú lateral"}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => handleNavigate('GESTION_FLOTA')}>
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 font-black flex items-center justify-center text-sm shadow-md shadow-amber-500/20">
                TC
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-black tracking-tight text-white leading-none">
                    TRANSCONTROL
                  </h1>
                  <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    HUB MODULAR
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-none mt-1">
                  Plataforma Centralizada de Flota y Operaciones
                </p>
              </div>
            </div>
          </div>

          {/* Center / Right: Quick Live Stats & Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Date Indicator / Picker */}
            <div className="hidden md:flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 shadow-inner">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
                title="Cambiar fecha de operación"
              />
            </div>

            {/* Parte Diario Button */}
            <button
              onClick={() => setShowReportModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition shadow-sm"
              title="Generar e imprimir Parte Diario Operativo"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Parte Diario</span>
            </button>

            {/* WhatsApp Share Button */}
            <button
              onClick={() => setShowWhatsAppModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm shadow-emerald-950/40"
              title="Compartir estatus en WhatsApp"
            >
              <WhatsAppIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            {/* Monthly Report Button */}
            <button
              onClick={() => setShowMonthlyReportModal(true)}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 transition shadow-sm"
              title="Informe mensual consolidado"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Informe Mensual</span>
            </button>

            {/* Reset Button */}
            <button
              onClick={() => setShowResetConfirm(true)}
              className="p-2 text-xs rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-750 transition"
              title="Reiniciar datos de demostración"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Global Operational Status Ribbon */}
        <div className="bg-slate-950 border-t border-slate-800/80 px-4 sm:px-6 py-1.5 flex flex-wrap items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-400 text-[11px]">Capacidad Flota:</span>
              <b className="text-emerald-400 font-mono">{metrics.operativeCount} / {metrics.totalActiveVehicles} ({metrics.availabilityRate}%)</b>
            </div>

            <span className="text-slate-700 hidden sm:inline">•</span>

            <div className="flex items-center gap-1.5 text-slate-300">
              <RouteIcon className="w-3 h-3 text-amber-400" />
              <span className="text-slate-400 text-[11px]">Servicios Hoy:</span>
              <b className="text-white font-mono">{todayServicesCount} programados</b>
            </div>

            <span className="text-slate-700 hidden sm:inline">•</span>

            <div className="flex items-center gap-1.5 text-slate-300">
              <IdCard className="w-3 h-3 text-indigo-400" />
              <span className="text-slate-400 text-[11px]">Licencias:</span>
              <b className="text-white font-mono">{licenseMetrics.validCount} al día</b>
              {licenseMetrics.expiredCount > 0 && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  {licenseMetrics.expiredCount} vencida(s)
                </span>
              )}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 hidden md:block">
            Fecha de operación: <b className="text-amber-300">{formatDate(selectedDate)}</b>
          </div>
        </div>
      </header>

      {/* 2. Main Workspace Layout: Sidebar + Dynamic Content */}
      <div className="flex-1 flex flex-col lg:flex-row w-full relative">
        
        {/* Modern Sidebar (Desktop) */}
        <aside className={`hidden lg:flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 shrink-0 sticky top-[89px] h-[calc(100vh-89px)] ${
          sidebarCollapsed ? 'w-20' : 'w-72'
        }`}>
          {/* Main Navigation Sections */}
          <div className="p-4 flex-1 space-y-2 overflow-y-auto">
            <div className={`px-2 py-1 text-[10px] font-black tracking-wider text-slate-500 uppercase ${sidebarCollapsed ? 'text-center' : ''}`}>
              {sidebarCollapsed ? 'MENÚ' : 'MÓDULOS PRINCIPALES'}
            </div>

            {/* SECCIÓN 1: Gestión de Flota */}
            <button
              onClick={() => handleNavigate('GESTION_FLOTA')}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl transition font-bold text-left group relative ${
                activeSection === 'GESTION_FLOTA'
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
              title="Sección 1: Gestión de Flota"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                activeSection === 'GESTION_FLOTA'
                  ? 'bg-slate-950 text-amber-400'
                  : 'bg-slate-800 text-slate-300 group-hover:text-amber-400 group-hover:bg-slate-700'
              }`}>
                <Bus className="w-5 h-5" />
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs truncate">1. Gestión de Flota</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      activeSection === 'GESTION_FLOTA'
                        ? 'bg-slate-950 text-emerald-400'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {metrics.availabilityRate}%
                    </span>
                  </div>
                  <p className={`text-[10px] truncate mt-0.5 ${
                    activeSection === 'GESTION_FLOTA' ? 'text-slate-900 font-semibold' : 'text-slate-400'
                  }`}>
                    Capacidad operativa y unidades
                  </p>
                </div>
              )}
            </button>

            {/* SECCIÓN 2: Gestiones y Servicios */}
            <button
              onClick={() => handleNavigate('GESTIONES_SERVICIOS')}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl transition font-bold text-left group relative ${
                activeSection === 'GESTIONES_SERVICIOS'
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
              title="Sección 2: Gestiones y Servicios"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                activeSection === 'GESTIONES_SERVICIOS'
                  ? 'bg-slate-950 text-amber-400'
                  : 'bg-slate-800 text-slate-300 group-hover:text-amber-400 group-hover:bg-slate-700'
              }`}>
                <RouteIcon className="w-5 h-5" />
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs truncate">2. Gestiones y Servicios</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      activeSection === 'GESTIONES_SERVICIOS'
                        ? 'bg-slate-950 text-amber-400'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {todayServicesCount}
                    </span>
                  </div>
                  <p className={`text-[10px] truncate mt-0.5 ${
                    activeSection === 'GESTIONES_SERVICIOS' ? 'text-slate-900 font-semibold' : 'text-slate-400'
                  }`}>
                    Programación y despacho de rutas
                  </p>
                </div>
              )}
            </button>

            {/* SECCIÓN 3: Vencimientos de Licencias de Manejo */}
            <button
              onClick={() => handleNavigate('LICENCIAS')}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl transition font-bold text-left group relative ${
                activeSection === 'LICENCIAS'
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
              title="Sección 3: Vencimientos de Licencias de Manejo"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                activeSection === 'LICENCIAS'
                  ? 'bg-slate-950 text-amber-400'
                  : 'bg-slate-800 text-slate-300 group-hover:text-amber-400 group-hover:bg-slate-700'
              }`}>
                <IdCard className="w-5 h-5" />
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs truncate">3. Licencias de Manejo</span>
                    {licenseMetrics.expiredCount > 0 ? (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                        activeSection === 'LICENCIAS'
                          ? 'bg-slate-950 text-rose-400'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                      }`}>
                        {licenseMetrics.expiredCount} venc.
                      </span>
                    ) : (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                        activeSection === 'LICENCIAS'
                          ? 'bg-slate-950 text-emerald-400'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {licenseMetrics.validCount}
                      </span>
                    )}
                  </div>
                  <p className={`text-[10px] truncate mt-0.5 ${
                    activeSection === 'LICENCIAS' ? 'text-slate-900 font-semibold' : 'text-slate-400'
                  }`}>
                    Semáforo de expiración y padrón
                  </p>
                </div>
              )}
            </button>

            {/* Quick Divider */}
            <div className="pt-3 border-t border-slate-800/80 my-2"></div>

            {/* Auxiliar Views */}
            <div className={`px-2 py-1 text-[10px] font-black tracking-wider text-slate-500 uppercase ${sidebarCollapsed ? 'text-center' : ''}`}>
              {sidebarCollapsed ? 'AUX' : 'VISTAS COMPLEMENTARIAS'}
            </div>

            <button
              onClick={() => handleNavigate('TALLER_FALLAS')}
              className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition text-xs font-bold text-left ${
                activeSection === 'TALLER_FALLAS'
                  ? 'bg-slate-800 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
              title="Reportes de Taller y Fallas"
            >
              <Wrench className="w-4 h-4 shrink-0 text-slate-400" />
              {!sidebarCollapsed && <span>Taller y Mantenimiento</span>}
            </button>

            <button
              onClick={() => setShowDriverSearchModal(true)}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl transition text-xs font-bold text-left text-slate-400 hover:text-white hover:bg-slate-800/50"
              title="Buscador Rápido de Choferes por Día"
            >
              <Users className="w-4 h-4 shrink-0 text-slate-400" />
              {!sidebarCollapsed && <span>Buscador Choferes por Día</span>}
            </button>
          </div>

          {/* Bottom Sidebar Status */}
          {!sidebarCollapsed && (
            <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px]">Sistema</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Conectado
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                Transporte Terrestre Láser • v3.8 Central Hub
              </p>
            </div>
          )}
        </aside>

        {/* Mobile / Tablet Drawer Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex">
            <div className="w-80 bg-slate-900 h-full p-5 border-r border-slate-800 flex flex-col shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs">
                    TC
                  </div>
                  <span className="font-black text-white text-sm">TRANSCONTROL HUB</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-2 flex-1 overflow-y-auto">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider px-2">
                  Navegación Modular
                </p>

                <button
                  onClick={() => handleNavigate('GESTION_FLOTA')}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl font-bold text-xs text-left ${
                    activeSection === 'GESTION_FLOTA' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Bus className="w-5 h-5" />
                  <span>1. Gestión de Flota</span>
                </button>

                <button
                  onClick={() => handleNavigate('GESTIONES_SERVICIOS')}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl font-bold text-xs text-left ${
                    activeSection === 'GESTIONES_SERVICIOS' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <RouteIcon className="w-5 h-5" />
                  <span>2. Gestiones y Servicios</span>
                </button>

                <button
                  onClick={() => handleNavigate('LICENCIAS')}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl font-bold text-xs text-left ${
                    activeSection === 'LICENCIAS' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <IdCard className="w-5 h-5" />
                  <span>3. Licencias de Manejo</span>
                </button>

                <div className="pt-3 border-t border-slate-800/80 my-2"></div>

                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider px-2">
                  Vistas Complementarias
                </p>

                <button
                  onClick={() => handleNavigate('TALLER_FALLAS')}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl font-bold text-xs text-left text-slate-400 hover:bg-slate-800"
                >
                  <Wrench className="w-4 h-4" />
                  <span>Taller y Mantenimiento</span>
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowDriverSearchModal(true);
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl font-bold text-xs text-left text-slate-400 hover:bg-slate-800"
                >
                  <Users className="w-4 h-4" />
                  <span>Buscar Choferes por Día</span>
                </button>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 hover:text-white flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reiniciar Datos</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Main Workspace Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          
          {/* Quick Breadcrumb when in Sub-Views */}
          {(activeSection === 'FICHA_UNIDAD' || activeSection === 'TALLER_FALLAS') && (
            <div className="mb-4 flex items-center justify-between bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-2xl text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <span>Navegación:</span>
                <button 
                  onClick={() => handleNavigate(previousSection)}
                  className="text-amber-400 font-bold hover:underline"
                >
                  {previousSection === 'GESTION_FLOTA' ? 'Gestión de Flota' : previousSection === 'GESTIONES_SERVICIOS' ? 'Gestiones y Servicios' : 'Licencias'}
                </button>
                <span>/</span>
                <span className="text-white font-bold">
                  {activeSection === 'FICHA_UNIDAD' ? 'Ficha Técnica de la Unidad' : 'Taller y Fallas'}
                </span>
              </div>

              <button
                onClick={() => handleNavigate(previousSection)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Volver al Hub</span>
              </button>
            </div>
          )}

          {/* SECCIÓN 1: Gestión de Flota (Capacidad Operativa Diaria y Estatus) */}
          {activeSection === 'GESTION_FLOTA' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <DailyStatusTab
                onGoToMaintenance={handleGoToMaintenance}
                onViewUnitDossier={handleOpenDossier}
                onOpenMonthlyReport={() => setShowMonthlyReportModal(true)}
                onOpenDailyReport={() => setShowReportModal(true)}
                onOpenWhatsAppModal={() => setShowWhatsAppModal(true)}
                onOpenDriverSearch={() => setShowDriverSearchModal(true)}
              />
            </div>
          )}

          {/* SECCIÓN 2: Gestiones y Servicios (Programación y Control de Rutas) */}
          {activeSection === 'GESTIONES_SERVICIOS' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <ServicesDispatchTab />
            </div>
          )}

          {/* SECCIÓN 3: Vencimientos de Licencias de Manejo (Semáforo y Padrón) */}
          {activeSection === 'LICENCIAS' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <LicensesTab />
            </div>
          )}

          {/* Sub-view: Ficha Técnica / Dossier de la Unidad */}
          {activeSection === 'FICHA_UNIDAD' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <VehicleDossierScreen
                initialVehicleId={dossierVehicleId}
                onBack={() => handleNavigate(previousSection)}
                onGoToMaintenance={handleGoToMaintenance}
              />
            </div>
          )}

          {/* Sub-view: Taller y Registro de Fallas */}
          {activeSection === 'TALLER_FALLAS' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <MaintenanceTab 
                initialUnitFilter={maintenanceFilterUnit} 
                onViewUnitDossier={handleOpenDossier}
              />
            </div>
          )}
        </main>
      </div>

      {/* 3. Global Modals */}
      {showReportModal && (
        <DailyReportModal 
          onClose={() => setShowReportModal(false)} 
          onOpenMonthlyReport={() => {
            setShowReportModal(false);
            setShowMonthlyReportModal(true);
          }}
          onOpenWhatsApp={() => {
            setShowReportModal(false);
            setShowWhatsAppModal(true);
          }}
        />
      )}

      {showMonthlyReportModal && (
        <MonthlyReportModal onClose={() => setShowMonthlyReportModal(false)} />
      )}

      {showWhatsAppModal && (
        <WhatsAppStatusModal
          onClose={() => setShowWhatsAppModal(false)}
          onOpenDailyReport={() => {
            setShowWhatsAppModal(false);
            setShowReportModal(true);
          }}
        />
      )}

      {showDriverSearchModal && (
        <DailyDriverSearchModal
          isOpen={showDriverSearchModal}
          onClose={() => setShowDriverSearchModal(false)}
        />
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-white">¿Restablecer Datos de Demostración?</h4>
              <p className="text-xs text-slate-400 mt-1">
                Esta acción restaurará la flota inicial, servicios programados y licencias oficiales del sistema.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  resetToInitialData();
                  setShowResetConfirm(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition shadow-lg shadow-amber-500/20"
              >
                Restablecer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-3.5 text-center text-xs text-slate-500">
        <p>TransControl • Hub Modular de Gestión de Flota, Despacho de Servicios y Licencias de Conducción</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <FleetProvider>
      <MainApp />
    </FleetProvider>
  );
}
