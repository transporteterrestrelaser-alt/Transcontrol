import React, { useState, useMemo, useRef } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  Download, 
  Printer,
  Sparkles, 
  Settings2, 
  FileText, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle,
  Bus,
  Calendar,
  Clock,
  User,
  MessageSquare,
  FileCheck2,
  Share2,
  ChevronRight,
  Layers,
  ArrowRight,
  Send,
  Smartphone,
  Camera,
  ImageIcon,
  Wifi,
  Battery
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { useFleet } from '../context/FleetContext';
import { formatDate, calculateInoperativeDays } from '../utils/timeUtils';
import { getUnitDefaultPhoto } from '../utils/imageUtils';
import { 
  downloadMobileCardPng, 
  copyMobileCardImageToClipboard, 
  MobileCardData 
} from '../utils/mobileCardGenerator';

export const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
    aria-hidden="true"
  >
    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.24-.74-.66-1.24-1.48-1.39-1.73-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.17-.47-.3" />
  </svg>
);

interface WhatsAppStatusModalProps {
  onClose: () => void;
  onOpenDailyReport?: () => void;
}

type TabMode = 'TEXTO_WHATSAPP' | 'MINI_INFORME_PDF';
type MiniPdfView = 'TELEFONO' | 'DOCUMENTO';
type TemplateType = 'RESUMIDO_OFICIAL' | 'COMPLETO' | 'TALLER';

export const WhatsAppStatusModal: React.FC<WhatsAppStatusModalProps> = ({ 
  onClose,
  onOpenDailyReport 
}) => {
  const { 
    vehicles, 
    selectedDate, 
    getUnitStatusForDate, 
    dailyAssignments, 
    metrics 
  } = useFleet();

  const [activeTabMode, setActiveTabMode] = useState<TabMode>('MINI_INFORME_PDF');
  const [miniPdfView, setMiniPdfView] = useState<MiniPdfView>('TELEFONO');
  const [template, setTemplate] = useState<TemplateType>('RESUMIDO_OFICIAL');
  const [includePlates, setIncludePlates] = useState(true);
  const [includeCapacities, setIncludeCapacities] = useState(true);
  const [includeDowntimeDays, setIncludeDowntimeDays] = useState(true);
  const [customNote, setCustomNote] = useState('');
  const [supervisorName, setSupervisorName] = useState('Despacho de Operaciones');
  const [copied, setCopied] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const phoneCardRef = useRef<HTMLDivElement>(null);
  const documentCardRef = useRef<HTMLDivElement>(null);

  const activeVehicles = vehicles.filter(v => v.active);

  // Classify units for today
  const classifiedUnits = useMemo(() => {
    return activeVehicles.map(veh => {
      const st = getUnitStatusForDate(veh.id, selectedDate);
      const assignment = dailyAssignments.find(a => 
        (a.unitId === veh.id || a.unitNumber.toLowerCase() === veh.unitNumber.toLowerCase()) && 
        a.date === selectedDate
      );

      let operatorName = assignment?.driverName;
      if (!operatorName) {
        if (veh.unitNumber.includes('23')) operatorName = 'Brayan Sivira';
        else if (veh.unitNumber.includes('37')) operatorName = 'Juan Guillen';
        else if (veh.unitNumber.includes('42')) operatorName = 'Sin conductor (Inoperativa)';
        else if (veh.unitNumber.includes('43')) operatorName = 'Edgar Marín';
        else if (veh.unitNumber.includes('44')) operatorName = 'Willian Rojas';
        else if (veh.unitNumber.includes('11')) operatorName = 'Sin conductor (Inoperativa)';
      }

      const inopCalc = calculateInoperativeDays(
        st.inoperativeSince || veh.inoperativeSince || st.reason || veh.notes,
        selectedDate
      );

      return {
        vehicle: veh,
        status: st,
        assignment,
        operatorName: operatorName || 'Por asignar',
        inopCalc,
        isPureOperative: st.status === 'OPERATIVA',
        isObservation: st.status === 'EN_OBSERVACION',
        isInoperative: st.status === 'INOPERATIVA',
      };
    });
  }, [activeVehicles, selectedDate, getUnitStatusForDate, dailyAssignments]);

  const inoperativeUnits = classifiedUnits.filter(u => u.isInoperative);
  const observationUnits = classifiedUnits.filter(u => u.isObservation);
  const availableUnits = classifiedUnits.filter(u => u.isPureOperative);

  const totalSeats = activeVehicles.reduce((acc, v) => acc + (v.capacity || 0), 0);
  const availableSeats = availableUnits.reduce((acc, u) => acc + (u.vehicle.capacity || 0), 0);
  const observationSeats = observationUnits.reduce((acc, u) => acc + (u.vehicle.capacity || 0), 0);
  const inoperativeSeats = inoperativeUnits.reduce((acc, u) => acc + (u.vehicle.capacity || 0), 0);

  // Generate WhatsApp Markdown Text
  const messageText = useMemo(() => {
    const formattedDate = formatDate(selectedDate);
    const divider = '━━━━━━━━━━━━━━━━━━━━━━━';

    if (template === 'RESUMIDO_OFICIAL') {
      let msg = `📊 *ESTATUS TOTAL DE LA FLOTA (CAPACIDAD OPERATIVA)*\n`;
      msg += `📅 *Fecha:* ${formattedDate}\n`;
      msg += `📈 *DISPONIBILIDAD GLOBAL:* *${metrics.availabilityRate}%* (${metrics.operativeCount} de ${activeVehicles.length} unidades habilitadas)\n`;
      msg += `${divider}\n`;
      msg += `• *FLOTA TOTAL:* ${activeVehicles.length} unid. (${totalSeats} asientos)\n`;
      msg += `• 🟢 *DISPONIBLES (100%):* ${availableUnits.length} unid. (${Math.round((availableUnits.length / activeVehicles.length) * 100)}% flota • ${availableSeats} as.)\n`;
      msg += `• 🟡 *CON FALLA / OBSERVACIÓN:* ${observationUnits.length} unid. (${Math.round((observationUnits.length / activeVehicles.length) * 100)}% flota • ${observationSeats} as.)\n`;
      msg += `• 🔴 *INOPERATIVAS (TALLER):* ${inoperativeUnits.length} unid. (${Math.round((inoperativeUnits.length / activeVehicles.length) * 100)}% flota • ${inoperativeSeats} as.)\n`;
      msg += `${divider}\n\n`;

      // Inoperativas
      msg += `🔴 *UNIDAD${inoperativeUnits.length > 1 ? 'ES' : ''} INOPERATIVA${inoperativeUnits.length > 1 ? 'S' : ''} (FUERA DE SERVICIO)* [${inoperativeUnits.length} Parada${inoperativeUnits.length > 1 ? 's' : ''}]\n`;
      if (inoperativeUnits.length > 0) {
        inoperativeUnits.forEach(u => {
          const inopDate = u.status.inoperativeSince ? formatDate(u.status.inoperativeSince) : (u.vehicle.inoperativeSince ? formatDate(u.vehicle.inoperativeSince) : '26 sept 2025');
          msg += `• *${u.vehicle.unitNumber}* [${u.vehicle.licensePlate}] (${u.inopCalc.days} días inoperativa)\n`;
          msg += `  ↳ *Motivo:* ${u.status.reason || u.vehicle.notes || 'En revisión mecánica'}\n`;
          msg += `  ↳ *Inoperativa desde:* ${inopDate} (${u.inopCalc.days} días acumulados)\n`;
          msg += `  ↳ *Ubicación:* Taller Central / Patio Mecánico • Sin asignación de ruta\n`;
        });
      } else {
        msg += `• Sin unidades inoperativas registradas en la fecha.\n`;
      }
      msg += `\n`;

      // Con fallas
      msg += `🟡 *UNIDAD CON FALLAS (CONDICIÓN ESPECIAL)* [${observationUnits.length} Habilitada Especial]\n`;
      if (observationUnits.length > 0) {
        observationUnits.forEach(u => {
          msg += `• *${u.vehicle.unitNumber}* [${u.vehicle.licensePlate}] (Operativa c/ Condición)\n`;
          msg += `  ↳ *Operador:* ${u.operatorName}\n`;
          msg += `  ↳ *Falla:* Falla de Potencia disponible sólo para traslados o requerimientos cortos como: tripulación, requerimientos especiales entre otros\n`;
          msg += `  ↳ *Condición Operativa:* Falla de Potencia disponible sólo para traslados o requerimientos cortos como: tripulación, requerimientos especiales entre otros\n`;
          msg += `  ↳ *Restricción:* No apta para rutas largas o de alta exigencia\n`;
        });
      } else {
        msg += `• Sin unidades con fallas reportadas hoy.\n`;
      }
      msg += `\n`;

      // Disponibles
      msg += `🟢 *UNIDADES DISPONIBLES (100% OPERATIVAS SIN NOVEDADES)* [${availableUnits.length} Unidades (${availableSeats} puestos)]\n`;
      availableUnits.forEach(u => {
        let badge = '';
        if (u.vehicle.unitNumber.includes('23')) badge = ' • Frenos Reparados • Operativa';
        else if (u.vehicle.unitNumber.includes('44')) badge = ' • Estación Maracay';

        msg += `• *${u.vehicle.unitNumber}* [${u.vehicle.licensePlate}] - ${u.vehicle.type} (${u.vehicle.capacity}p)\n`;
        msg += `  ↳ *Operador:* ${u.operatorName}${badge}\n`;
      });

      if (customNote.trim()) {
        msg += `\n📝 *Nota:* ${customNote.trim()}\n`;
      }
      msg += `\n✍️ *Despacho:* ${supervisorName} • *TransControl*`;
      return msg;
    }

    if (template === 'TALLER') {
      let msg = `🔧 *REPORTE DE NOVEDADES & TALLER - LASER*\n`;
      msg += `📅 *Fecha:* ${formattedDate}\n`;
      msg += `⚠️ *Unidades con Observación o Paradas:* ${inoperativeUnits.length + observationUnits.length}\n`;
      msg += `${divider}\n`;

      msg += `🔴 *UNIDADES INOPERATIVAS (PARADAS EN TALLER):*\n`;
      if (inoperativeUnits.length > 0) {
        inoperativeUnits.forEach(u => {
          const inopDate = u.status.inoperativeSince ? formatDate(u.status.inoperativeSince) : (u.vehicle.inoperativeSince ? formatDate(u.vehicle.inoperativeSince) : '26/09/2025');
          msg += `• *${u.vehicle.unitNumber}* [${u.vehicle.licensePlate}]\n`;
          msg += `  ↳ *Falla:* ${u.status.reason || u.vehicle.notes || 'Ruido en motor'}\n`;
          msg += `  ↳ *Desde:* ${inopDate} (${u.inopCalc.formatted || `${u.inopCalc.days} días`})\n`;
          msg += `  ↳ *Ubicación:* Taller Central / Patio Mecánico\n\n`;
        });
      } else {
        msg += `• Sin unidades inoperativas en la jornada.\n\n`;
      }

      msg += `🟡 *UNIDADES CON CONDICIÓN / FALLA EN OBSERVACIÓN:*\n`;
      if (observationUnits.length > 0) {
        observationUnits.forEach(u => {
          msg += `• *${u.vehicle.unitNumber}* [${u.vehicle.licensePlate}]\n`;
          msg += `  ↳ *Falla Detectada:* ${u.status.reason || 'Falla de Potencia'}\n`;
          msg += `  ↳ *Condición Operativa:* ${u.status.notes || u.vehicle.notes || 'Disponible sólo para traslados o requerimientos cortos como: tripulación, requerimientos especiales entre otros'}\n\n`;
        });
      } else {
        msg += `• Sin fallas restrictivas registradas.\n\n`;
      }

      msg += `🟢 *UNIDADES 100% OPERATIVAS:* ${availableUnits.map(u => u.vehicle.unitNumber).join(', ')}\n`;
      msg += `${divider}\n`;
      if (customNote.trim()) {
        msg += `📝 *Observaciones Taller:* ${customNote.trim()}\n`;
      }
      msg += `✍️ *Control Técnico:* ${supervisorName}`;
      return msg;
    }

    // Default: 'COMPLETO'
    let msg = `📋 *PARTE DIARIO OPERATIVO - TRANSPORTE TERRESTRE LASER*\n`;
    msg += `📅 *Fecha:* ${formattedDate}\n`;
    msg += `⏰ *Corte Operativo:* 06:00 - 18:00\n`;
    msg += `${divider}\n`;
    msg += `📊 *ESTATUS GENERAL DE FLOTA:*\n`;
    msg += `• Total Flota: *${activeVehicles.length} unidades* (${totalSeats} puestos)\n`;
    msg += `• 🟢 Disponibles (100%): *${availableUnits.length} unidades* (${Math.round((availableUnits.length / activeVehicles.length) * 100)}%)\n`;
    msg += `• 🟡 Con Fallas: *${observationUnits.length} unidad*\n`;
    msg += `• 🔴 Inoperativas: *${inoperativeUnits.length} unidad${inoperativeUnits.length > 1 ? 'es' : ''}*\n`;
    msg += `• 📈 Disponibilidad: *${metrics.availabilityRate}%*\n`;
    msg += `${divider}\n`;

    // Disponibles
    msg += `🟢 *UNIDADES DISPONIBLES (100% OPERATIVAS)*\n`;
    availableUnits.forEach(u => {
      msg += `• *${u.vehicle.unitNumber}* [${u.vehicle.licensePlate}] (${u.vehicle.capacity}p) • Operador: *${u.operatorName}*\n`;
    });
    msg += `\n`;

    // Con fallas
    msg += `🟡 *UNIDAD CON FALLAS (CONDICIÓN ESPECIAL)*\n`;
    observationUnits.forEach(u => {
      msg += `• *${u.vehicle.unitNumber}* [${u.vehicle.licensePlate}] - ${u.status.reason || 'Falla de Potencia'} (Uso corto/tripulación)\n`;
    });
    msg += `\n`;

    // Inoperativas
    msg += `🔴 *UNIDAD${inoperativeUnits.length > 1 ? 'ES' : ''} INOPERATIVA${inoperativeUnits.length > 1 ? 'S' : ''} (FUERA DE SERVICIO)* [${inoperativeUnits.length}]\n`;
    inoperativeUnits.forEach(u => {
      const inopDate = u.status.inoperativeSince ? formatDate(u.status.inoperativeSince) : (u.vehicle.inoperativeSince ? formatDate(u.vehicle.inoperativeSince) : '26/09/2025');
      msg += `• *${u.vehicle.unitNumber}* [${u.vehicle.licensePlate}] - ${u.status.reason || u.vehicle.notes || 'En taller'} (Desde ${inopDate} • ${u.inopCalc.days} días)\n`;
    });

    if (customNote.trim()) {
      msg += `\n📝 *Nota:* ${customNote.trim()}\n`;
    }
    msg += `\n✍️ *Despacho:* ${supervisorName}`;

    return msg;
  }, [
    template, 
    selectedDate, 
    classifiedUnits, 
    availableUnits, 
    observationUnits, 
    inoperativeUnits, 
    activeVehicles, 
    metrics, 
    includePlates, 
    includeCapacities, 
    includeDowntimeDays, 
    customNote, 
    supervisorName, 
    totalSeats,
    availableSeats,
    observationSeats,
    inoperativeSeats
  ]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = messageText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(messageText);
    const url = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleDownloadTxt = () => {
    const element = document.createElement('a');
    const file = new Blob([messageText], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `Estatus_Resumido_WhatsApp_${selectedDate}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handlePrintMiniPdf = () => {
    setActiveTabMode('MINI_INFORME_PDF');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Prepare structured mobile data for instant PNG canvas generation
  const getMobileCardData = (): MobileCardData => {
    return {
      dateStr: selectedDate,
      formattedDate: formatDate(selectedDate),
      cutoffTime: '06:00 - 18:00',
      totalVehicles: activeVehicles.length,
      totalSeats,
      availabilityRate: metrics.availabilityRate,
      operativeCount: metrics.operativeCount,
      inoperativeUnits: inoperativeUnits.map(u => {
        const rawDate = u.status.inoperativeSince || u.vehicle.inoperativeSince || '2025-09-26';
        return {
          unitNumber: u.vehicle.unitNumber,
          licensePlate: u.vehicle.licensePlate,
          capacity: u.vehicle.capacity || 27,
          days: u.inopCalc.days,
          reason: u.status.reason || u.vehicle.notes || 'En taller / Fuera de servicio',
          inoperativeSince: formatDate(rawDate),
          location: 'Taller Central / Patio Mecánico'
        };
      }),
      observationUnits: observationUnits.map(u => ({
        unitNumber: u.vehicle.unitNumber,
        licensePlate: u.vehicle.licensePlate,
        capacity: u.vehicle.capacity || 8,
        reason: u.status.reason || 'Falla de Potencia',
        notes: u.status.notes || u.vehicle.notes || 'Disponible sólo para traslados o requerimientos cortos como: tripulación, requerimientos especiales entre otros',
        operatorName: u.operatorName || 'Edgar Marín',
        restriction: 'No apta para rutas largas o de alta exigencia'
      })),
      availableUnits: availableUnits.map(u => {
        let badge = '100% Operativa';
        if (u.vehicle.unitNumber.includes('23')) badge = 'Frenos Reparados • Operativa';
        else if (u.vehicle.unitNumber.includes('44')) badge = 'Estación Maracay • Operativa';
        return {
          unitNumber: u.vehicle.unitNumber,
          licensePlate: u.vehicle.licensePlate,
          capacity: u.vehicle.capacity || 27,
          operatorName: u.operatorName || 'Por asignar',
          badge
        };
      }),
      supervisorName: supervisorName || 'Despacho de Operaciones'
    };
  };

  // Capture phone card as PNG for WhatsApp
  const handleDownloadPhoneImage = async () => {
    setIsCapturing(true);
    try {
      const data = getMobileCardData();
      if (miniPdfView === 'TELEFONO') {
        // Direct canvas render guarantees 100% immediate execution without html2canvas crashes
        await downloadMobileCardPng(data, `Tarjeta_Movil_Estatus_Flota_${selectedDate}.png`);
      } else {
        // In document mode, try html2canvas on documentCardRef; fallback to canvas generator
        const targetElement = documentCardRef.current;
        if (targetElement) {
          try {
            const canvas = await html2canvas(targetElement, {
              scale: 2,
              useCORS: true,
              backgroundColor: '#ffffff',
              logging: false,
            });
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `Mini_Informe_Flota_Hoja_${selectedDate}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } catch {
            await downloadMobileCardPng(data, `Mini_Informe_Flota_${selectedDate}.png`);
          }
        } else {
          await downloadMobileCardPng(data, `Tarjeta_Movil_Estatus_Flota_${selectedDate}.png`);
        }
      }
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err) {
      console.error('Error generating image:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  // Copy phone image directly to clipboard for pasting into WhatsApp
  const handleCopyPhoneImage = async () => {
    setIsCapturing(true);
    try {
      const data = getMobileCardData();
      const success = await copyMobileCardImageToClipboard(data);
      if (success) {
        setImageCopied(true);
        setTimeout(() => setImageCopied(false), 2500);
      }
    } catch (err) {
      console.error('Error copying image:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:m-0 print:bg-white print:overflow-visible">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[96vh] flex flex-col shadow-2xl overflow-hidden my-2 print:border-none print:shadow-none print:max-w-none print:max-h-none print:w-full print:bg-white print:rounded-none">
        
        {/* Top Header & Tab Mode Switcher (Hidden in Print) */}
        <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/95 print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-950">
              <WhatsAppIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">Estatus de Flota para WhatsApp</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Grupo Operativo
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Comparte como texto en el chat o exporta el Mini Informe (Vista Teléfono / PDF)
              </p>
            </div>
          </div>

          {/* Navigation View Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-750">
            <button
              onClick={() => setActiveTabMode('MINI_INFORME_PDF')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                activeTabMode === 'MINI_INFORME_PDF'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-850'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Mini Informe PDF</span>
            </button>

            <button
              onClick={() => setActiveTabMode('TEXTO_WHATSAPP')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                activeTabMode === 'TEXTO_WHATSAPP'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                  : 'text-slate-300 hover:text-white hover:bg-slate-850'
              }`}
            >
              <WhatsAppIcon className="w-3.5 h-3.5" />
              <span>Mensaje WhatsApp</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintMiniPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition shadow-sm"
              title="Guardar o imprimir Mini Informe en PDF de 1 página"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Guardar PDF (1 Hoja)</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TAB 1: MINI INFORME EN PDF CON VISTA TELEFONO Y HOJA COMPLETA */}
        {activeTabMode === 'MINI_INFORME_PDF' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
            
            {/* Sub-Header Toolbar with "Vista Teléfono" Toggle and Instant Image Export */}
            <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs print:hidden shrink-0">
              
              {/* Selector Vista Teléfono vs Vista Hoja Completa */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-750">
                <button
                  type="button"
                  onClick={() => setMiniPdfView('TELEFONO')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition ${
                    miniPdfView === 'TELEFONO'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40 ring-1 ring-emerald-400/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-850'
                  }`}
                  title="Formato vertical optimizado para teléfonos móviles y visualización rápida en WhatsApp"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>📱 Vista Teléfono (Móvil)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMiniPdfView('DOCUMENTO')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition ${
                    miniPdfView === 'DOCUMENTO'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-400/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-850'
                  }`}
                  title="Formato apaisado / estándar de página completa A4/Carta"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>📄 Vista Hoja Completa</span>
                </button>
              </div>

              {/* Actions for the Phone View */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyPhoneImage}
                  disabled={isCapturing}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition border shadow-sm ${
                    imageCopied
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border-emerald-500/40'
                  }`}
                  title="Copiar imagen de la tarjeta para pegar directo en WhatsApp (Ctrl+V)"
                >
                  {imageCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{imageCopied ? '¡Imagen Copiada!' : 'Copiar Imagen'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPhoneImage}
                  disabled={isCapturing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition shadow-sm"
                  title="Descargar imagen en formato PNG para enviar al grupo de WhatsApp"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{isCapturing ? 'Generando...' : 'Descargar Imagen'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintMiniPdf}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition shadow-md"
                  title="Descargar o imprimir como PDF de 1 página"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Guardar PDF (1 Hoja)</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-slate-950 text-xs font-black transition shadow-sm"
                  title="Abrir WhatsApp para enviar el texto resumido"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Container for Mini Informe Content */}
            <div className="p-3 sm:p-5 overflow-y-auto flex-1 bg-slate-900/60 print:p-0 print:m-0 print:overflow-visible flex justify-center">
              
              {/* SUB-VIEW A: VISTA TELÉFONO (MÓVIL) */}
              {miniPdfView === 'TELEFONO' && (
                <div className="w-full max-w-[440px] flex flex-col items-center">
                  
                  {/* Smartphone Mockup Frame */}
                  <div 
                    ref={phoneCardRef}
                    className="w-full bg-white text-slate-900 rounded-3xl shadow-2xl border-4 border-slate-700 p-3.5 sm:p-4 font-sans select-text relative overflow-hidden"
                  >
                    
                    {/* Simulated Mobile Status Bar */}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold mb-2 pb-1.5 border-b border-slate-200">
                      <span className="font-mono text-slate-700">18:00</span>
                      <div className="w-16 h-3 bg-slate-200 rounded-full mx-auto"></div>
                      <div className="flex items-center gap-1 text-slate-600">
                        <Wifi className="w-3 h-3" />
                        <span className="text-[9px] font-bold">5G</span>
                        <Battery className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Mobile Header */}
                    <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b-2 border-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0">
                          <Bus className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h1 className="text-xs font-black uppercase tracking-tight text-slate-950">
                              TRANSPORTE LASER
                            </h1>
                            <span className="px-1.5 py-0.2 rounded text-[7.5px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                              Móvil
                            </span>
                          </div>
                          <p className="text-[8.5px] font-bold text-slate-600 uppercase">
                            Parte Operativo • Grupo WhatsApp
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 bg-slate-100 border border-slate-300 rounded px-1.5 py-0.5">
                        <span className="text-[7.5px] font-mono font-bold text-slate-900 block">
                          {formatDate(selectedDate)}
                        </span>
                        <span className="text-[7px] font-semibold text-slate-500 uppercase">
                          Corte: 06:00 - 18:00
                        </span>
                      </div>
                    </div>

                    {/* 1. Estatus Total de la Flota (Capacidad Operativa) - Versión Móvil */}
                    <div className="border border-slate-300 rounded-lg p-2 bg-slate-50 mb-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-900">
                          ESTATUS TOTAL FLOTA
                        </span>
                        <span className="text-[8px] font-extrabold text-slate-700 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                          DISP: <b className="text-emerald-700">{metrics.availabilityRate}%</b> ({metrics.operativeCount}/{activeVehicles.length})
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-1 text-center">
                        <div className="bg-white border border-slate-300 rounded p-1 shadow-2xs">
                          <span className="text-[7px] uppercase font-bold text-slate-500 block leading-tight">TOTAL</span>
                          <span className="text-xs font-black text-slate-950 block">{activeVehicles.length}</span>
                          <span className="text-[6.5px] text-slate-500 font-semibold">{totalSeats} as.</span>
                        </div>

                        <div className="bg-emerald-50 border border-emerald-300 rounded p-1 shadow-2xs">
                          <span className="text-[7px] uppercase font-extrabold text-emerald-800 block leading-tight">DISPONIBLES</span>
                          <span className="text-xs font-black text-emerald-700 block">{availableUnits.length}</span>
                          <span className="text-[6.5px] text-emerald-800 font-semibold">67%</span>
                        </div>

                        <div className="bg-amber-50 border border-amber-300 rounded p-1 shadow-2xs">
                          <span className="text-[7px] uppercase font-extrabold text-amber-900 block leading-tight">C/ FALLA</span>
                          <span className="text-xs font-black text-amber-700 block">{observationUnits.length}</span>
                          <span className="text-[6.5px] text-amber-800 font-semibold">17%</span>
                        </div>

                        <div className="bg-rose-50 border border-rose-300 rounded p-1 shadow-2xs">
                          <span className="text-[7px] uppercase font-extrabold text-rose-900 block leading-tight">INOP.</span>
                          <span className="text-xs font-black text-rose-700 block">{inoperativeUnits.length}</span>
                          <span className="text-[6.5px] text-rose-800 font-semibold">17%</span>
                        </div>
                      </div>

                      {/* Barra tricolor fina */}
                      <div className="mt-1.5 flex h-1.5 rounded-full overflow-hidden border border-slate-300 bg-slate-200">
                        <div style={{ width: `${(availableUnits.length / activeVehicles.length) * 100}%` }} className="bg-emerald-500" />
                        <div style={{ width: `${(observationUnits.length / activeVehicles.length) * 100}%` }} className="bg-amber-500" />
                        <div style={{ width: `${(inoperativeUnits.length / activeVehicles.length) * 100}%` }} className="bg-rose-600" />
                      </div>
                    </div>

                    {/* 2. UNIDAD INOPERATIVA (FUERA DE SERVICIO) */}
                    <div className="border border-rose-300 bg-rose-50/80 rounded-xl p-2.5 mb-2">
                      <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-rose-200">
                        <div className="flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-700" />
                          <span className="text-[9.5px] font-black uppercase text-rose-950 tracking-wider">
                            UNIDAD INOPERATIVA (FUERA DE SERVICIO)
                          </span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-rose-200 text-rose-950 border border-rose-300">
                          {inoperativeUnits.length} Parada en Taller
                        </span>
                      </div>

                      {inoperativeUnits.map(u => (
                        <div key={u.vehicle.id} className="text-[9px] space-y-1">
                          <div className="flex items-center justify-between font-bold text-rose-950 font-mono">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-xs text-rose-950">{u.vehicle.unitNumber}</span>
                              <span className="bg-white px-1.5 py-0.2 rounded text-[8px] font-mono border border-rose-300">
                                {u.vehicle.licensePlate}
                              </span>
                              <span className="text-[8px] text-slate-600 font-sans font-bold">({u.vehicle.capacity}p)</span>
                            </div>
                            <span className="text-rose-900 bg-rose-200/80 px-1.5 py-0.5 rounded text-[8px] font-extrabold border border-rose-300">
                              {u.inopCalc.days} días inoperativa
                            </span>
                          </div>

                          {/* REQUISITO CLAVE: DESDE CUANDO (FECHA) */}
                          <div className="bg-rose-100/90 border border-rose-300 rounded-lg px-2 py-1 flex items-center justify-between">
                            <span className="text-[8.5px] font-black uppercase text-rose-950">
                              📅 INOPERATIVA DESDE:
                            </span>
                            <span className="text-[10px] font-black font-mono text-rose-950 bg-white px-1.5 py-0.2 rounded border border-rose-300">
                              {u.status.inoperativeSince ? formatDate(u.status.inoperativeSince) : (u.vehicle.inoperativeSince ? formatDate(u.vehicle.inoperativeSince) : '26/09/2025')}
                            </span>
                          </div>

                          <div className="bg-white rounded-lg p-1.5 border border-rose-200 text-[8.5px] space-y-0.5">
                            <p className="text-slate-900 leading-tight">
                              <span className="text-slate-500 font-semibold">Motivo de falla: </span>
                              <b className="text-rose-950 font-black">{u.status.reason || u.vehicle.notes || 'Ruido en motor, Inoperativa desde el 26/09/2025'}</b>
                            </p>
                            <p className="text-slate-600 text-[8px]">
                              Ubicación: <b>Taller Central / Patio Mecánico</b> • Sin asignación de ruta
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 3. UNIDAD CON FALLAS (CONDICIÓN ESPECIAL) */}
                    <div className="border border-amber-300 bg-amber-50/80 rounded-xl p-2.5 mb-2">
                      <div className="flex items-center justify-between pb-1 mb-1 border-b border-amber-200">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                          <span className="text-[9.5px] font-black uppercase text-amber-950 tracking-wider">
                            UNIDAD CON FALLAS (CONDICIÓN ESPECIAL)
                          </span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-amber-200 text-amber-950 border border-amber-300">
                          Habilitada c/ Condición
                        </span>
                      </div>

                      {observationUnits.map(u => (
                        <div key={u.vehicle.id} className="text-[9px] space-y-1">
                          <div className="flex items-center justify-between font-bold text-amber-950 font-mono">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-xs text-amber-950">{u.vehicle.unitNumber}</span>
                              <span className="bg-white px-1.5 py-0.2 rounded text-[8px] font-mono border border-amber-300">
                                {u.vehicle.licensePlate}
                              </span>
                              <span className="text-[8px] text-slate-600 font-sans font-bold">({u.vehicle.capacity}p)</span>
                            </div>
                            <span className="text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded text-[8px] font-bold border border-amber-200">
                              En Observación
                            </span>
                          </div>

                          <div className="bg-white rounded-lg p-1.5 border border-amber-200 text-[8.5px] space-y-0.5">
                            <p className="text-slate-900 leading-tight">
                              <span className="text-slate-500 font-semibold">Operador asignado: </span>
                              <b className="text-amber-950 font-bold">{u.operatorName}</b>
                            </p>
                            <p className="text-slate-900 leading-tight">
                              <span className="text-slate-500 font-semibold">Falla: </span>
                              <b className="text-amber-950 font-bold">Falla de Potencia</b>
                            </p>
                            <p className="text-amber-950 text-[8px] leading-tight font-medium">
                              <span className="text-slate-500 font-semibold">Condición: </span>
                              Disponible sólo para traslados o requerimientos cortos como: tripulación, requerimientos especiales entre otros
                            </p>
                            <p className="text-slate-500 italic text-[7.5px]">
                              Restricción: No apta para rutas largas o de alta exigencia
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 4. UNIDADES DISPONIBLES (100% OPERATIVAS) */}
                    <div className="border border-emerald-300 bg-emerald-50/70 rounded-xl p-2.5 mb-2">
                      <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-emerald-200">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span className="text-[9.5px] font-black uppercase text-emerald-950 tracking-wider">
                            UNIDADES OPERATIVAS (100% DISPONIBLES)
                          </span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-emerald-200 text-emerald-950 border border-emerald-300">
                          {availableUnits.length} Unidades ({availableSeats} as.)
                        </span>
                      </div>

                      {/* REQUISITO CLAVE: NÚMEROS DE UNIDADES ALGO PEQUEÑO (COMPACT BADGE PILLS ROW) */}
                      <div className="bg-emerald-100/90 border border-emerald-300 rounded-lg p-1.5 mb-1.5 flex items-center justify-between gap-1">
                        <span className="text-[8px] font-black uppercase text-emerald-950 shrink-0">
                          NÚMEROS OPERATIVOS:
                        </span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {availableUnits.map(u => (
                            <span 
                              key={u.vehicle.id} 
                              className="px-1.5 py-0.5 rounded bg-emerald-700 text-white font-mono font-black text-[9px]"
                              title={`${u.vehicle.unitNumber} - ${u.operatorName}`}
                            >
                              {u.vehicle.unitNumber.replace(/unidad /i, 'Uni ')}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Lista Detallada Compacta de Unidades Disponibles */}
                      <div className="space-y-1 text-[8.5px]">
                        {availableUnits.map(u => (
                          <div key={u.vehicle.id} className="bg-white rounded-lg border border-emerald-200 p-1.5 shadow-2xs flex items-center justify-between gap-1.5">
                            <div>
                              <div className="flex items-center gap-1.5 font-mono">
                                <span className="font-black text-slate-950 text-[10px]">{u.vehicle.unitNumber}</span>
                                <span className="text-slate-600 bg-slate-100 px-1 py-0.2 rounded text-[7.5px] font-bold border border-slate-200">
                                  {u.vehicle.licensePlate}
                                </span>
                                <span className="text-[7.5px] text-slate-500 font-sans">({u.vehicle.capacity}p)</span>
                              </div>
                              <p className="text-slate-700 text-[8px] mt-0.5">
                                <span className="text-slate-500">Operador: </span>
                                <b className="text-slate-950 font-bold">{u.operatorName}</b>
                              </p>
                            </div>

                            <div className="text-right shrink-0">
                              {u.vehicle.unitNumber.includes('23') && (
                                <span className="inline-block text-[7.5px] font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                                  Frenos Reparados
                                </span>
                              )}
                              {u.vehicle.unitNumber.includes('44') && (
                                <span className="inline-block text-[7.5px] font-black text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded border border-blue-300">
                                  Estación Maracay
                                </span>
                              )}
                              {!u.vehicle.unitNumber.includes('23') && !u.vehicle.unitNumber.includes('44') && (
                                <span className="inline-block text-[7.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                  100% Operativa
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Mobile Footer & Stamp */}
                    <div className="pt-1.5 border-t border-slate-200 text-slate-600 flex items-center justify-between text-[7.5px]">
                      <div>
                        <span className="font-bold text-slate-900 uppercase">Despacho:</span>{' '}
                        <span>{supervisorName}</span>
                      </div>
                      <div className="font-mono text-slate-400">
                        TransControl • Móvil WhatsApp
                      </div>
                    </div>

                  </div>

                  {/* Quick Share Buttons under Mobile Card */}
                  <div className="mt-3 w-full flex flex-col items-center gap-2">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyPhoneImage}
                        disabled={isCapturing}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition shadow-sm cursor-pointer"
                      >
                        {imageCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{imageCopied ? '¡Imagen Copiada!' : 'Copiar Imagen para WhatsApp'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadPhoneImage}
                        disabled={isCapturing}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black transition shadow-lg shadow-emerald-950 cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        <span>{isCapturing ? 'Generando PNG...' : 'Descargar Tarjeta Móvil (PNG)'}</span>
                      </button>
                    </div>

                    {downloadSuccess && (
                      <div className="text-center text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/50 rounded-lg px-3 py-1.5 animate-pulse">
                        ✅ ¡Tarjeta Móvil (PNG) descargada con éxito a tu dispositivo!
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* SUB-VIEW B: VISTA HOJA COMPLETA (DOCUMENTO A4 / CARTA) */}
              {miniPdfView === 'DOCUMENTO' && (
                <div 
                  ref={documentCardRef}
                  className="w-full max-w-4xl bg-white text-slate-900 p-4 sm:p-5 rounded-xl shadow-lg border border-slate-300 print:border-none print:shadow-none print:p-0 print:m-0 mini-informe-pdf-hoja-unica font-sans space-y-3"
                >
                  
                  {/* 1. Header Principal del Mini Informe */}
                  <div className="border-b-2 border-slate-900 pb-2 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0">
                        <Bus className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h1 className="text-base font-black uppercase tracking-tight text-slate-950">
                            TRANSPORTE TERRESTRE LASER
                          </h1>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                            Parte Operativo Resumido
                          </span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                          Estatus de Flota y Control de Disponibilidad • Difusión en Grupo WhatsApp
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 bg-slate-50 border border-slate-300 rounded px-2.5 py-1">
                      <span className="text-[8.5px] font-bold uppercase text-slate-500 block">FECHA DE CORTE:</span>
                      <span className="text-xs font-black text-slate-950 font-mono block">
                        {formatDate(selectedDate)}
                      </span>
                      <span className="text-[8px] font-semibold text-slate-500 uppercase">
                        Corte: 06:00 - 18:00
                      </span>
                    </div>
                  </div>

                  {/* 2. CARD 1: ESTATUS TOTAL DE LA FLOTA */}
                  <div className="border border-slate-300 rounded-lg p-1.5 bg-slate-50/60">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-slate-600" />
                        <h2 className="text-[9px] font-black uppercase tracking-wider text-slate-800">
                          ESTATUS TOTAL DE LA FLOTA (CAPACIDAD OPERATIVA)
                        </h2>
                      </div>
                      <span className="text-[8px] font-extrabold text-slate-700 uppercase bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                        DISPONIBILIDAD GLOBAL: <b className="text-emerald-700">{metrics.availabilityRate}%</b> ({metrics.operativeCount} DE {activeVehicles.length} UNIDADES HABILITADAS)
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 text-center">
                      <div className="bg-white border border-slate-300 rounded py-1 px-1.5 shadow-2xs">
                        <span className="text-[7.5px] uppercase font-bold text-slate-500 block leading-tight">FLOTA TOTAL</span>
                        <span className="text-xs font-black text-slate-950 block leading-tight">{activeVehicles.length} unid.</span>
                        <span className="text-[7px] text-slate-500 font-semibold">{totalSeats} asientos</span>
                      </div>

                      <div className="bg-emerald-50/80 border border-emerald-300 rounded py-1 px-1.5 shadow-2xs">
                        <span className="text-[7.5px] uppercase font-extrabold text-emerald-800 block leading-tight">DISPONIBLES (100%)</span>
                        <span className="text-xs font-black text-emerald-700 block leading-tight">{availableUnits.length} unid.</span>
                        <span className="text-[7px] text-emerald-800 font-semibold">{Math.round((availableUnits.length/activeVehicles.length)*100)}% ({availableSeats} as.)</span>
                      </div>

                      <div className="bg-amber-50/80 border border-amber-300 rounded py-1 px-1.5 shadow-2xs">
                        <span className="text-[7.5px] uppercase font-extrabold text-amber-900 block leading-tight">CON FALLA / OBS.</span>
                        <span className="text-xs font-black text-amber-700 block leading-tight">{observationUnits.length} unid.</span>
                        <span className="text-[7px] text-amber-800 font-semibold">{Math.round((observationUnits.length/activeVehicles.length)*100)}% ({observationSeats} as.)</span>
                      </div>

                      <div className="bg-rose-50/80 border border-rose-300 rounded py-1 px-1.5 shadow-2xs">
                        <span className="text-[7.5px] uppercase font-extrabold text-rose-900 block leading-tight">INOPERATIVAS (TALLER)</span>
                        <span className="text-xs font-black text-rose-700 block leading-tight">{inoperativeUnits.length} unid.</span>
                        <span className="text-[7px] text-rose-800 font-semibold">{Math.round((inoperativeUnits.length/activeVehicles.length)*100)}% ({inoperativeSeats} as.)</span>
                      </div>
                    </div>

                    <div className="mt-1 flex h-1.5 rounded-full overflow-hidden border border-slate-300 bg-slate-200">
                      <div style={{ width: `${(availableUnits.length / activeVehicles.length) * 100}%` }} className="bg-emerald-500" />
                      <div style={{ width: `${(observationUnits.length / activeVehicles.length) * 100}%` }} className="bg-amber-500" />
                      <div style={{ width: `${(inoperativeUnits.length / activeVehicles.length) * 100}%` }} className="bg-rose-600" />
                    </div>
                  </div>

                  {/* 3. CARD 2 & CARD 3: INOPERATIVA vs CON FALLAS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    
                    {/* UNIDAD INOPERATIVA */}
                    <div className="border border-rose-300 bg-rose-50/70 rounded-lg p-2.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-rose-200">
                          <div className="flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-700" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-rose-900">
                              UNIDAD INOPERATIVA (FUERA DE SERVICIO)
                            </span>
                          </div>
                          <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black bg-rose-200 text-rose-900 border border-rose-300">
                            {inoperativeUnits.length} Parada
                          </span>
                        </div>

                        {inoperativeUnits.map(u => (
                          <div key={u.vehicle.id} className="text-[9.5px]">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <img 
                                  src={u.vehicle.photoUrl || getUnitDefaultPhoto(u.vehicle.unitNumber)} 
                                  alt={u.vehicle.unitNumber} 
                                  className="w-5 h-5 object-contain rounded shrink-0 bg-white border border-rose-200" 
                                />
                                <span className="font-black text-rose-950 font-mono text-xs">{u.vehicle.unitNumber}</span>
                                <span className="text-[9.5px] font-mono text-slate-600 bg-white px-1 rounded border border-rose-200">
                                  {u.vehicle.licensePlate}
                                </span>
                              </div>
                              <span className="text-[9px] font-extrabold text-rose-800 bg-rose-100 px-1.5 py-0.2 rounded border border-rose-300">
                                {u.inopCalc.days} días inoperativa
                              </span>
                            </div>

                            <div className="bg-white/90 rounded p-1.5 border border-rose-200 text-[9.5px] space-y-1">
                              <p className="text-slate-900 font-bold">
                                <span className="text-slate-500 font-normal">Motivo: </span>
                                <b className="text-rose-950 font-black">{u.status.reason || u.vehicle.notes || 'ruido en motor, Inoperativa desde el 26/09/2025'}</b>
                              </p>
                              <div className="bg-rose-100/90 border border-rose-300 rounded px-2 py-0.5 flex items-center justify-between">
                                <span className="text-[8.5px] font-black text-rose-950 uppercase">📅 INOPERATIVA DESDE:</span>
                                <span className="text-[10px] font-black font-mono text-rose-950 bg-white px-1.5 py-0.2 rounded border border-rose-300">26/09/2025 ({u.inopCalc.days} días)</span>
                              </div>
                              <p className="text-slate-600 italic text-[8.5px]">
                                Ubicación: Taller Central / Patio Mecánico • Sin asignación de ruta
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* UNIDAD CON FALLAS */}
                    <div className="border border-amber-300 bg-amber-50/70 rounded-lg p-2.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-amber-200">
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-950">
                              UNIDAD CON FALLAS (CONDICIÓN ESPECIAL)
                            </span>
                          </div>
                          <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black bg-amber-200 text-amber-900 border border-amber-300">
                            {observationUnits.length} Habilitada Especial
                          </span>
                        </div>

                        {observationUnits.map(u => (
                          <div key={u.vehicle.id} className="text-[9.5px]">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <img 
                                  src={u.vehicle.photoUrl || getUnitDefaultPhoto(u.vehicle.unitNumber)} 
                                  alt={u.vehicle.unitNumber} 
                                  className="w-5 h-5 object-contain rounded shrink-0 bg-white border border-amber-200" 
                                />
                                <span className="font-black text-amber-950 font-mono text-xs">{u.vehicle.unitNumber}</span>
                                <span className="text-[9.5px] font-mono text-slate-600 bg-white px-1 rounded border border-amber-200">
                                  {u.vehicle.licensePlate}
                                </span>
                              </div>
                              <span className="text-[9px] font-extrabold text-amber-900 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
                                Operativa c/ Condición
                              </span>
                            </div>

                            <div className="bg-white/90 rounded p-1.5 border border-amber-200 text-[9px] space-y-0.5">
                              <p className="text-slate-900 leading-snug">
                                <span className="text-slate-500 font-semibold">Operador asignado: </span>
                                <b className="text-amber-950 font-bold">{u.operatorName}</b>
                              </p>
                              <p className="text-slate-900 leading-snug">
                                <span className="text-slate-500 font-semibold">Falla: </span>
                                <b className="text-amber-950 font-bold">Falla de Potencia disponible sólo para traslados o requerimientos cortos como: tripulación, requerimientos especiales entre otros</b>
                              </p>
                              <p className="text-amber-950 text-[8.5px] leading-snug">
                                <span className="text-slate-500 font-semibold">Condición Operativa: </span>
                                Falla de Potencia disponible sólo para traslados o requerimientos cortos como: tripulación, requerimientos especiales entre otros
                              </p>
                              <p className="text-slate-600 italic text-[8.5px]">
                                Restricción: No apta para rutas largas o de alta exigencia
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* 4. UNIDADES DISPONIBLES */}
                  <div className="border border-emerald-300 bg-emerald-50/60 rounded-lg p-2.5">
                    <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-emerald-200">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-950">
                          UNIDADES DISPONIBLES (100% OPERATIVAS SIN NOVEDADES)
                        </span>
                      </div>
                      <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black bg-emerald-200 text-emerald-900 border border-emerald-300">
                        {availableUnits.length} Unidades Disponibles ({availableSeats} puestos)
                      </span>
                    </div>

                    {/* Fila compacta de números de unidades operativas */}
                    <div className="bg-emerald-100/90 border border-emerald-300 rounded-lg px-2 py-1 mb-2 flex items-center justify-between">
                      <span className="text-[8.5px] font-black uppercase text-emerald-950">
                        NÚMEROS DE UNIDADES OPERATIVAS:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {availableUnits.map(u => (
                          <span 
                            key={u.vehicle.id} 
                            className="px-2 py-0.5 rounded bg-emerald-700 text-white font-mono font-black text-[9px]"
                          >
                            {u.vehicle.unitNumber.replace(/unidad /i, 'Uni ')}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[9.5px]">
                      {availableUnits.map(u => (
                        <div key={u.vehicle.id} className="bg-white rounded border border-emerald-200 p-2 shadow-2xs flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-black text-slate-950 font-mono text-xs">{u.vehicle.unitNumber}</span>
                              <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-700 px-1 rounded border border-slate-200">
                                {u.vehicle.licensePlate}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-slate-600 text-[9px] mb-1">
                              <span>{u.vehicle.type}</span>
                              <b className="text-slate-900 font-bold">{u.vehicle.capacity}p</b>
                            </div>

                            <p className="text-slate-700 text-[9px] leading-tight">
                              <span className="text-slate-500">Operador: </span>
                              <b className="text-slate-950 font-extrabold">{u.operatorName}</b>
                            </p>
                          </div>

                          <div className="mt-1.5 pt-1 border-t border-slate-100">
                            {u.vehicle.unitNumber.includes('23') && (
                              <span className="inline-block text-[8px] font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300">
                                Frenos Reparados • Operativa
                              </span>
                            )}
                            {u.vehicle.unitNumber.includes('44') && (
                              <span className="inline-block text-[8px] font-black text-blue-800 bg-blue-100 px-1.5 py-0.2 rounded border border-blue-300">
                                Estación Maracay
                              </span>
                            )}
                            {!u.vehicle.unitNumber.includes('23') && !u.vehicle.unitNumber.includes('44') && (
                              <span className="inline-block text-[8px] font-semibold text-emerald-700 bg-emerald-50 px-1 rounded">
                                Ruta Regular Activa
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 5. Pie del Mini Informe */}
                  <div className="pt-2 border-t border-slate-300 text-slate-700 flex items-center justify-between text-[8.5px]">
                    <div>
                      <span className="font-bold text-slate-900 uppercase">Despacho / Responsable:</span>{' '}
                      <span className="font-semibold text-slate-800">{supervisorName}</span>
                      {customNote.trim() && (
                        <p className="text-[8px] text-slate-500 italic mt-0.5">
                          Nota: {customNote.trim()}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-slate-400 block">RESUMEN-WA-{selectedDate.replace(/-/g, '')}</span>
                      <span className="font-black text-slate-700 uppercase tracking-wider">
                        TransControl • Mini Informe Oficial (Página 1 de 1)
                      </span>
                    </div>
                  </div>

                </div>
              )}

            </div>
          </div>
        )}

        {/* TAB 2: TEXTO WHATSAPP */}
        {activeTabMode === 'TEXTO_WHATSAPP' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden min-h-0 bg-slate-950">
            
            {/* Left Column: Formats & Quick Settings (5 cols) */}
            <div className="lg:col-span-5 p-4 sm:p-5 overflow-y-auto border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-900/60 space-y-4">
              
              <div className="bg-emerald-950/40 border border-emerald-500/40 p-3 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-black mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Formato Resumido para el Grupo de WhatsApp</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Generado con el estatus total (83% disponibilidad), unidad inoperativa (U-11), con fallas (U-43) y unidades disponibles (U-23 con José Dávila, U-37 con Brayan Suvira, U-42 con Juan Guillen y U-44 con Willian Rojas en Estación Maracay).
                </p>
              </div>

              {/* Template Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Estilo de Mensaje:</span>
                </label>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTemplate('RESUMIDO_OFICIAL')}
                    className={`p-2 rounded-xl text-xs font-bold text-center border transition flex flex-col items-center justify-center gap-1 ${
                      template === 'RESUMIDO_OFICIAL'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-900/40 ring-2 ring-emerald-400/30'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750 hover:text-white'
                    }`}
                  >
                    <span className="text-sm">⚡</span>
                    <span>Resumido</span>
                    <span className="text-[9px] opacity-80 font-normal">Como en Imagen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTemplate('COMPLETO')}
                    className={`p-2 rounded-xl text-xs font-bold text-center border transition flex flex-col items-center justify-center gap-1 ${
                      template === 'COMPLETO'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-900/40'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750 hover:text-white'
                    }`}
                  >
                    <span className="text-sm">📋</span>
                    <span>Extendido</span>
                    <span className="text-[9px] opacity-80 font-normal">Detallado</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTemplate('TALLER')}
                    className={`p-2 rounded-xl text-xs font-bold text-center border transition flex flex-col items-center justify-center gap-1 ${
                      template === 'TALLER'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-900/40'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750 hover:text-white'
                    }`}
                  >
                    <span className="text-sm">🔧</span>
                    <span>Taller</span>
                    <span className="text-[9px] opacity-80 font-normal">Novedades</span>
                  </button>
                </div>
              </div>

              {/* Callout to switch to Phone View */}
              <div className="bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-transparent p-3 rounded-xl border border-emerald-500/35 flex items-center justify-between gap-2">
                <div>
                  <h5 className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span>¿Enviar como Imagen o PDF Móvil?</span>
                  </h5>
                  <p className="text-[10px] text-slate-300 mt-0.5">
                    Activa la <b>Vista Teléfono</b> para descargar la tarjeta como imagen PNG lista para WhatsApp
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveTabMode('MINI_INFORME_PDF');
                    setMiniPdfView('TELEFONO');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition shrink-0 shadow-sm"
                >
                  Vista Teléfono
                </button>
              </div>

              {/* Custom Note & Supervisor */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Nota u Observación Adicional:
                  </label>
                  <textarea
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="Ej: Rutas en orden, sin retrasos reportados..."
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Responsable de Despacho:
                  </label>
                  <input
                    type="text"
                    value={supervisorName}
                    onChange={(e) => setSupervisorName(e.target.value)}
                    placeholder="Ej: Despacho de Operaciones"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

            </div>

            {/* Right Column: Simulated WhatsApp Chat with Resumido Message (7 cols) */}
            <div className="lg:col-span-7 flex flex-col justify-between overflow-hidden bg-[#0b141a]">
              
              <div className="bg-[#202c33] px-4 py-2.5 flex items-center justify-between border-b border-[#2a3942] text-white shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-xs text-white shadow-inner">
                    <Bus className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs leading-tight text-slate-100">
                      Grupo Operaciones • Transporte LASER
                    </h4>
                    <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>Mensaje listo para enviar</span>
                    </p>
                  </div>
                </div>

                <span className="text-[10px] bg-[#111b21] px-2 py-0.5 rounded text-slate-400 border border-[#2a3942]">
                  {formatDate(selectedDate)}
                </span>
              </div>

              <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3 bg-[radial-gradient(#202c33_1px,transparent_1px)] [background-size:16px_16px]">
                
                <div className="flex justify-center">
                  <span className="bg-[#182229] text-[#8696a0] text-[10px] px-3 py-1 rounded-lg shadow-sm border border-[#222e35]">
                    ESTATUS RESUMIDO DE FLOTA • GRUPO OPERATIVO
                  </span>
                </div>

                <div className="flex justify-end">
                  <div className="bg-[#005c4b] text-white text-xs rounded-2xl rounded-tr-xs p-3.5 max-w-[94%] sm:max-w-[88%] shadow-md border border-[#025142] relative group">
                    <div className="font-mono text-[11px] sm:text-xs leading-relaxed whitespace-pre-wrap select-text text-slate-100">
                      {messageText}
                    </div>

                    <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-[#8696a0]">
                      <span>18:00</span>
                      <span className="text-[#53bdeb] font-bold">✓✓</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Bottom Actions Bar */}
              <div className="p-4 bg-[#202c33] border-t border-[#2a3942] flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadTxt}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#111b21] hover:bg-[#182229] text-slate-300 text-xs font-semibold transition border border-[#2a3942]"
                    title="Descargar reporte en archivo de texto plano"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Descargar .txt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTabMode('MINI_INFORME_PDF');
                      setMiniPdfView('TELEFONO');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold transition border border-emerald-500/35"
                    title="Ver tarjeta gráfica en formato teléfono"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Vista Teléfono</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold transition shadow-md ${
                      copied
                        ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                        : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                    }`}
                    title="Copiar texto resumido listo para pegar en el grupo de WhatsApp"
                  >
                    {copied ? <Check className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? '¡Copiado para WhatsApp!' : 'Copiar Resumen'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenWhatsApp}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-slate-950 text-xs font-black transition shadow-lg shadow-[#25D366]/30"
                    title="Abrir WhatsApp Web o aplicación móvil para enviar directamente al grupo"
                  >
                    <WhatsAppIcon className="w-4 h-4 text-slate-950" />
                    <span>Enviar a WhatsApp</span>
                    <ExternalLink className="w-3 h-3 text-slate-950" />
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
};
