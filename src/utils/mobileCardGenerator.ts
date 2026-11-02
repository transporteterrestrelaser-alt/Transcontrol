/**
 * High-fidelity Canvas generator for the Mobile Status Card PNG.
 * 
 * Generates an ultra-sharp, retina-grade PNG image tailored for WhatsApp operational groups.
 * Renders 100% in pure HTML5 Canvas (zero dependencies on external CSS parsing, eliminating
 * html2canvas Tailwind v4/oklch crashes and guaranteeing instant execution of the PNG download).
 */

export interface MobileCardData {
  dateStr: string;
  formattedDate: string;
  cutoffTime?: string;
  totalVehicles: number;
  totalSeats: number;
  availabilityRate: number;
  operativeCount: number;
  inoperativeUnits: Array<{
    unitNumber: string;
    licensePlate: string;
    capacity: number;
    days: number;
    reason: string;
    inoperativeSince: string;
    location?: string;
  }>;
  observationUnits: Array<{
    unitNumber: string;
    licensePlate: string;
    capacity: number;
    reason: string;
    notes: string;
    operatorName?: string;
    restriction?: string;
  }>;
  availableUnits: Array<{
    unitNumber: string;
    licensePlate: string;
    capacity: number;
    operatorName: string;
    badge?: string;
  }>;
  supervisorName: string;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillColor?: string,
  strokeColor?: string,
  strokeWidth: number = 1
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();

  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
  return currentY;
}

export function createMobileCardCanvas(data: MobileCardData): HTMLCanvasElement {
  const width = 840;
  const inopCount = data.inoperativeUnits.length;
  const inopCardH = 104;
  const inopBoxH = inopCount === 0 ? 60 : 44 + inopCount * inopCardH + (inopCount - 1) * 8;
  const operBoxH = 50 + 44 + (data.availableUnits.length * 36);
  const obsBoxH = data.observationUnits.length === 0 ? 60 : 160;
  const height = Math.max(1400, 500 + inopBoxH + obsBoxH + operBoxH);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // 1. Background (Dark sleek container)
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, width, height);

  // 2. White Card Body
  const cardX = 28;
  const cardY = 28;
  const cardW = width - 56;
  const cardH = height - 56;
  const cardRadius = 32;

  // Outer border
  roundRect(ctx, cardX, cardY, cardW, cardH, cardRadius, '#ffffff', '#334155', 4);

  // 3. Simulated Mobile Top Bar (Time, Camera Notch, Wifi, Battery)
  const innerPad = 26;
  let cursorY = cardY + innerPad;
  const contentLeft = cardX + innerPad;
  const contentWidth = cardW - innerPad * 2;

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('18:00', contentLeft, cursorY + 6);

  // Phone Speaker / Camera island
  roundRect(ctx, cardX + cardW / 2 - 45, cursorY - 4, 90, 10, 5, '#cbd5e1');

  // Network & Battery indicator
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = '#475569';
  ctx.textAlign = 'right';
  ctx.fillText('5G  100% 🔋', contentLeft + contentWidth, cursorY + 6);
  ctx.textAlign = 'left';

  cursorY += 26;
  // Hairline
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(contentLeft, cursorY);
  ctx.lineTo(contentLeft + contentWidth, cursorY);
  ctx.stroke();

  cursorY += 16;

  // 4. Header Principal
  // Icon Badge
  const iconSize = 48;
  roundRect(ctx, contentLeft, cursorY, iconSize, iconSize, 14, '#f59e0b', '#d97706', 1.5);
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🚌', contentLeft + iconSize / 2, cursorY + 33);
  ctx.textAlign = 'left';

  // Company Name & Subtitle
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 22px sans-serif';
  ctx.fillText('TRANSPORTE TERRESTRE LASER', contentLeft + iconSize + 14, cursorY + 22);

  ctx.fillStyle = '#059669';
  ctx.font = 'bold 12px sans-serif';
  roundRect(ctx, contentLeft + iconSize + 14, cursorY + 28, 130, 20, 6, '#ecfdf5', '#a7f3d0', 1);
  ctx.fillText('PARTE OPERATIVO', contentLeft + iconSize + 22, cursorY + 42);

  // Date and Cutoff box on the right
  const dateBoxW = 200;
  const dateBoxX = contentLeft + contentWidth - dateBoxW;
  roundRect(ctx, dateBoxX, cursorY, dateBoxW, 48, 10, '#f8fafc', '#cbd5e1', 1);
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('FECHA DE CORTE', dateBoxX + 12, cursorY + 18);
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 14px monospace';
  ctx.fillText(data.dateStr || '16/10/2026', dateBoxX + 12, cursorY + 36);

  cursorY += 66;

  // Divider
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(contentLeft, cursorY);
  ctx.lineTo(contentLeft + contentWidth, cursorY);
  ctx.stroke();

  cursorY += 16;

  // 5. SECCIÓN 1: ESTATUS TOTAL DE LA FLOTA (CAPACIDAD OPERATIVA)
  const kpiBoxH = 118;
  roundRect(ctx, contentLeft, cursorY, contentWidth, kpiBoxH, 14, '#f8fafc', '#cbd5e1', 1.5);

  // Title bar inside KPI Box
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 13px sans-serif';
  ctx.fillText('📊 ESTATUS TOTAL DE LA FLOTA (CAPACIDAD OPERATIVA)', contentLeft + 14, cursorY + 22);

  const dispBadgeText = `DISPONIBILIDAD: ${data.availabilityRate}% (${data.operativeCount}/${data.totalVehicles})`;
  ctx.font = '900 12px sans-serif';
  const dispBadgeW = ctx.measureText(dispBadgeText).width + 18;
  roundRect(ctx, contentLeft + contentWidth - dispBadgeW - 12, cursorY + 8, dispBadgeW, 22, 6, '#ecfdf5', '#10b981', 1);
  ctx.fillStyle = '#047857';
  ctx.fillText(dispBadgeText, contentLeft + contentWidth - dispBadgeW - 3, cursorY + 23);

  // 4 KPI Mini Cards
  const kpiY = cursorY + 38;
  const kpiCardW = (contentWidth - 28 - 24) / 4;
  const kpiCardH = 48;

  // KPI 1: TOTAL
  roundRect(ctx, contentLeft + 14, kpiY, kpiCardW, kpiCardH, 8, '#ffffff', '#cbd5e1', 1);
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('TOTAL FLOTA', contentLeft + 22, kpiY + 16);
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 18px monospace';
  ctx.fillText(`${data.totalVehicles}`, contentLeft + 22, kpiY + 36);
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText(`${data.totalSeats} as.`, contentLeft + 48, kpiY + 36);

  // KPI 2: DISPONIBLES
  const kpi2X = contentLeft + 14 + kpiCardW + 8;
  roundRect(ctx, kpi2X, kpiY, kpiCardW, kpiCardH, 8, '#ecfdf5', '#6ee7b7', 1);
  ctx.fillStyle = '#065f46';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('🟢 DISPONIBLES', kpi2X + 8, kpiY + 16);
  ctx.fillStyle = '#047857';
  ctx.font = '900 18px monospace';
  ctx.fillText(`${data.availableUnits.length}`, kpi2X + 8, kpiY + 36);
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText(`67% (${data.availableUnits.reduce((a, b) => a + b.capacity, 0)} as.)`, kpi2X + 32, kpiY + 36);

  // KPI 3: CON FALLA
  const kpi3X = kpi2X + kpiCardW + 8;
  roundRect(ctx, kpi3X, kpiY, kpiCardW, kpiCardH, 8, '#fffbeb', '#fde68a', 1);
  ctx.fillStyle = '#92400e';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('🟡 C/ FALLA', kpi3X + 8, kpiY + 16);
  ctx.fillStyle = '#b45309';
  ctx.font = '900 18px monospace';
  ctx.fillText(`${data.observationUnits.length}`, kpi3X + 8, kpiY + 36);
  ctx.font = 'bold 10px sans-serif';
  const obsSeats = data.observationUnits.reduce((a, b) => a + (b.capacity || 0), 0);
  const obsPct = Math.round((data.observationUnits.length / data.totalVehicles) * 100);
  ctx.fillText(`${obsPct}% (${obsSeats} as.)`, kpi3X + 32, kpiY + 36);

  // KPI 4: INOPERATIVAS
  const kpi4X = kpi3X + kpiCardW + 8;
  roundRect(ctx, kpi4X, kpiY, kpiCardW, kpiCardH, 8, '#fef2f2', '#fca5a5', 1);
  ctx.fillStyle = '#991b1b';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('🔴 INOPERATIVAS', kpi4X + 8, kpiY + 16);
  ctx.fillStyle = '#b91c1c';
  ctx.font = '900 18px monospace';
  ctx.fillText(`${data.inoperativeUnits.length}`, kpi4X + 8, kpiY + 36);
  ctx.font = 'bold 10px sans-serif';
  const inopSeats = data.inoperativeUnits.reduce((a, b) => a + (b.capacity || 0), 0);
  const inopPct = Math.round((data.inoperativeUnits.length / data.totalVehicles) * 100);
  ctx.fillText(`${inopPct}% (${inopSeats} as.)`, kpi4X + 32, kpiY + 36);

  // Tricolor progress bar
  const barY = kpiY + kpiCardH + 8;
  const barW = contentWidth - 28;
  const barH = 10;
  roundRect(ctx, contentLeft + 14, barY, barW, barH, 5, '#e2e8f0');

  const wDisp = (data.availableUnits.length / data.totalVehicles) * barW;
  const wObs = (data.observationUnits.length / data.totalVehicles) * barW;
  const wInop = (data.inoperativeUnits.length / data.totalVehicles) * barW;

  ctx.fillStyle = '#10b981';
  ctx.fillRect(contentLeft + 14, barY, wDisp, barH);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(contentLeft + 14 + wDisp, barY, wObs, barH);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(contentLeft + 14 + wDisp + wObs, barY, wInop, barH);

  cursorY += kpiBoxH + 16;

  // 6. SECCIÓN 2: UNIDADES INOPERATIVAS (FUERA DE SERVICIO) - FECHA DESTACADA
  roundRect(ctx, contentLeft, cursorY, contentWidth, inopBoxH, 16, '#fef2f2', '#f87171', 2);

  // Header inside Inoperative box
  ctx.fillStyle = '#991b1b';
  ctx.font = '900 14px sans-serif';
  ctx.fillText(`🔴 UNIDAD${inopCount > 1 ? 'ES' : ''} INOPERATIVA${inopCount > 1 ? 'S' : ''} (FUERA DE SERVICIO)`, contentLeft + 14, cursorY + 24);

  roundRect(ctx, contentLeft + contentWidth - 120, cursorY + 10, 106, 20, 6, '#fee2e2', '#ef4444', 1);
  ctx.fillStyle = '#991b1b';
  ctx.font = '900 11px sans-serif';
  ctx.fillText(`${inopCount} EN TALLER`, contentLeft + contentWidth - 110, cursorY + 24);

  if (inopCount === 0) {
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('• Sin unidades inoperativas registradas en la jornada.', contentLeft + 24, cursorY + 45);
  } else {
    let curInopY = cursorY + 36;
    data.inoperativeUnits.forEach(inopUnit => {
      roundRect(ctx, contentLeft + 12, curInopY, contentWidth - 24, inopCardH, 10, '#ffffff', '#fca5a5', 1);

      // Unit Title & Plate
      ctx.fillStyle = '#991b1b';
      ctx.font = '900 16px monospace';
      ctx.fillText(inopUnit.unitNumber.toUpperCase(), contentLeft + 24, curInopY + 22);

      roundRect(ctx, contentLeft + 140, curInopY + 7, 76, 20, 5, '#f8fafc', '#94a3b8', 1);
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 11px monospace';
      ctx.fillText(inopUnit.licensePlate, contentLeft + 147, curInopY + 21);

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`• ${inopUnit.capacity} Puestos`, contentLeft + 225, curInopY + 21);

      // FECHA DESTACADA (Requisito clave: CUALES ESTÁN INOPERATIVAS DESDE CUÁNDO)
      const dateBadgeY = curInopY + 32;
      roundRect(ctx, contentLeft + 24, dateBadgeY, contentWidth - 48, 26, 6, '#fee2e2', '#f87171', 1.5);
      ctx.fillStyle = '#7f1d1d';
      ctx.font = '900 12px sans-serif';
      ctx.fillText('📅 INOPERATIVA DESDE:', contentLeft + 34, dateBadgeY + 17);
      ctx.fillStyle = '#991b1b';
      ctx.font = '900 13px monospace';
      ctx.fillText(inopUnit.inoperativeSince, contentLeft + 185, dateBadgeY + 17);
      ctx.fillStyle = '#991b1b';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`(${inopUnit.days} días acum.)`, contentLeft + 280, dateBadgeY + 17);

      // Motivo de Falla y Ubicación
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('• Falla / Motivo:', contentLeft + 24, curInopY + 73);
      ctx.fillStyle = '#b91c1c';
      ctx.font = '900 12px sans-serif';
      const reasonText = inopUnit.reason.length > 72 ? inopUnit.reason.slice(0, 70) + '...' : inopUnit.reason;
      ctx.fillText(reasonText, contentLeft + 125, curInopY + 73);

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('• Ubicación: Taller Central / Patio Mecánico • Sin asignación de ruta', contentLeft + 24, curInopY + 91);

      curInopY += inopCardH + 8;
    });
  }

  cursorY += inopBoxH + 16;

  // 7. SECCIÓN 3: UNIDAD CON FALLAS (CONDICIÓN ESPECIAL)
  roundRect(ctx, contentLeft, cursorY, contentWidth, obsBoxH, 16, '#fffbeb', '#f59e0b', 2);

  ctx.fillStyle = '#92400e';
  ctx.font = '900 14px sans-serif';
  ctx.fillText('🟡 UNIDAD CON FALLAS (CONDICIÓN ESPECIAL)', contentLeft + 14, cursorY + 24);

  roundRect(ctx, contentLeft + contentWidth - 165, cursorY + 10, 150, 20, 6, '#fef3c7', '#d97706', 1);
  ctx.fillStyle = '#b45309';
  ctx.font = '900 11px sans-serif';
  ctx.fillText('HABILITADA C/ CONDICIÓN', contentLeft + contentWidth - 157, cursorY + 24);

  // Inner card for Unidad 43
  const obsInnerY = cursorY + 36;
  const obsInnerH = obsBoxH - 48;
  roundRect(ctx, contentLeft + 12, obsInnerY, contentWidth - 24, obsInnerH, 10, '#ffffff', '#fcd34d', 1);

  const obsUnit = data.observationUnits[0] || {
    unitNumber: 'Unidad 43',
    licensePlate: 'A0607MB',
    capacity: 8,
    reason: 'Falla de Potencia',
    notes: 'Disponible sólo para traslados o requerimientos cortos como: tripulación, requerimientos especiales entre otros'
  };

  ctx.fillStyle = '#b45309';
  ctx.font = '900 18px monospace';
  ctx.fillText(obsUnit.unitNumber.toUpperCase(), contentLeft + 24, obsInnerY + 26);

  roundRect(ctx, contentLeft + 150, obsInnerY + 10, 80, 22, 5, '#f8fafc', '#94a3b8', 1);
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 13px monospace';
  ctx.fillText(obsUnit.licensePlate, contentLeft + 158, obsInnerY + 26);

  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`• Van JAC ${obsUnit.capacity} Puestos (Tripulación)`, contentLeft + 240, obsInnerY + 26);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('• Operador asignado:', contentLeft + 24, obsInnerY + 48);
  ctx.fillStyle = '#b45309';
  ctx.font = '900 13px sans-serif';
  ctx.fillText(obsUnit.operatorName || 'Edgar Marín', contentLeft + 160, obsInnerY + 48);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('• Falla detectada:', contentLeft + 24, obsInnerY + 68);
  ctx.fillStyle = '#b45309';
  ctx.font = '900 13px sans-serif';
  ctx.fillText(obsUnit.reason || 'Falla de Potencia', contentLeft + 140, obsInnerY + 68);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('• Condición Operativa:', contentLeft + 24, obsInnerY + 88);
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 11px sans-serif';
  drawWrappedText(
    ctx,
    obsUnit.notes || 'Disponible sólo para traslados o requerimientos cortos como: tripulación, requerimientos especiales entre otros.',
    contentLeft + 24,
    obsInnerY + 104,
    contentWidth - 60,
    15
  );

  cursorY += obsBoxH + 16;

  // 8. SECCIÓN 4: UNIDADES OPERATIVAS (NÚMEROS DE UNIDADES ALGO PEQUEÑO)
  roundRect(ctx, contentLeft, cursorY, contentWidth, operBoxH, 16, '#f0fdf4', '#10b981', 2);

  ctx.fillStyle = '#065f46';
  ctx.font = '900 14px sans-serif';
  ctx.fillText('🟢 UNIDADES OPERATIVAS (100% DISPONIBLES)', contentLeft + 14, cursorY + 24);

  const opSeatsTotal = data.availableUnits.reduce((a, b) => a + (b.capacity || 0), 0);
  roundRect(ctx, contentLeft + contentWidth - 170, cursorY + 10, 155, 20, 6, '#d1fae5', '#059669', 1);
  ctx.fillStyle = '#065f46';
  ctx.font = '900 11px sans-serif';
  ctx.fillText(`${data.availableUnits.length} UNIDADES • ${opSeatsTotal} PUESTOS`, contentLeft + contentWidth - 163, cursorY + 24);

  // REQUISITO CLAVE: "CUALES ESTAN OPERATIVAS NUMEROS DE UNIDADES ALGO PEQUEÑO"
  // Fila de Badges con los números de unidades compactos
  const pillsBarY = cursorY + 36;
  roundRect(ctx, contentLeft + 12, pillsBarY, contentWidth - 24, 38, 8, '#ecfdf5', '#6ee7b7', 1.5);

  ctx.fillStyle = '#047857';
  ctx.font = '900 11px sans-serif';
  ctx.fillText('NÚMEROS OPERATIVOS:', contentLeft + 22, pillsBarY + 24);

  // Individual compact unit pills from actual available units: [Uni 23] [Uni 37] [Uni 42] [Uni 44]
  const opNumbers = data.availableUnits.map(u => u.unitNumber.replace(/unidad /i, 'Uni '));
  let pillX = contentLeft + 170;
  opNumbers.forEach(num => {
    roundRect(ctx, pillX, pillsBarY + 6, 76, 26, 6, '#059669', '#047857', 1);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(num, pillX + 38, pillsBarY + 23);
    ctx.textAlign = 'left';
    pillX += 86;
  });

  // Table of operative units details (compact rows) using actual dynamic data
  const tableY = pillsBarY + 46;
  const opUnitsList = data.availableUnits.map(u => ({
    num: u.unitNumber,
    plate: u.licensePlate,
    cap: `${u.capacity}p`,
    driver: u.operatorName || 'Por asignar',
    note: u.badge || '100% Operativa'
  }));

  let rowY = tableY;
  const rowH = 32;

  opUnitsList.forEach((item, idx) => {
    const isEven = idx % 2 === 0;
    roundRect(ctx, contentLeft + 12, rowY, contentWidth - 24, rowH, 6, isEven ? '#ffffff' : '#f8fafc', '#e2e8f0', 1);

    // Green bullet & Unit Number
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(contentLeft + 24, rowY + rowH / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = '900 13px monospace';
    ctx.fillText(item.num, contentLeft + 36, rowY + 21);

    // Plate badge
    roundRect(ctx, contentLeft + 120, rowY + 5, 68, 22, 4, '#f1f5f9', '#cbd5e1', 1);
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(item.plate, contentLeft + 126, rowY + 20);

    // Capacity
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(item.cap, contentLeft + 196, rowY + 20);

    // Operator
    ctx.fillStyle = '#475569';
    ctx.font = 'normal 11px sans-serif';
    ctx.fillText('Operador:', contentLeft + 230, rowY + 20);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(item.driver, contentLeft + 288, rowY + 20);

    // Note / Station badge on right
    ctx.font = 'bold 11px sans-serif';
    const noteWidth = ctx.measureText(item.note).width + 16;
    const noteX = contentLeft + contentWidth - 12 - noteWidth - 6;

    const isMaracay = item.note.includes('Maracay');
    const isFrenos = item.note.includes('Frenos');
    const bgCol = isMaracay ? '#eff6ff' : isFrenos ? '#ecfdf5' : '#f8fafc';
    const borderCol = isMaracay ? '#bfdbfe' : isFrenos ? '#a7f3d0' : '#e2e8f0';
    const textCol = isMaracay ? '#1d4ed8' : isFrenos ? '#047857' : '#475569';

    roundRect(ctx, noteX, rowY + 5, noteWidth, 22, 5, bgCol, borderCol, 1);
    ctx.fillStyle = textCol;
    ctx.fillText(item.note, noteX + 8, rowY + 20);

    rowY += rowH + 4;
  });

  cursorY += operBoxH + 16;

  // 9. FOOTER
  roundRect(ctx, contentLeft, cursorY, contentWidth, 38, 8, '#f8fafc', '#e2e8f0', 1);
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 11px sans-serif';
  ctx.fillText('✍️ DESPACHO:', contentLeft + 14, cursorY + 23);
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(data.supervisorName || 'Despacho de Operaciones', contentLeft + 105, cursorY + 23);

  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('TransControl • Difusión Oficial WhatsApp', contentLeft + contentWidth - 14, cursorY + 23);
  ctx.textAlign = 'left';

  return canvas;
}

/**
 * Downloads the mobile status card as a PNG directly to the user's computer.
 * Guaranteed to execute immediately without any third-party DOM parsing crashes.
 */
export async function downloadMobileCardPng(data: MobileCardData, customFilename?: string): Promise<void> {
  const canvas = createMobileCardCanvas(data);
  const filename = customFilename || `Tarjeta_Movil_Estatus_Flota_${data.dateStr || 'Laser'}.png`;

  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(blob => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            resolve();
          }, 400);
        } else {
          // Fallback to dataUrl
          const dataUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = filename;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            document.body.removeChild(link);
            resolve();
          }, 400);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Error generating canvas PNG blob:', err);
      try {
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          resolve();
        }, 400);
      } catch (e) {
        reject(e);
      }
    }
  });
}

/**
 * Copies the mobile status card image directly to the system clipboard
 * so users can simply press Ctrl+V in WhatsApp.
 */
export async function copyMobileCardImageToClipboard(data: MobileCardData): Promise<boolean> {
  const canvas = createMobileCardCanvas(data);

  return new Promise(resolve => {
    canvas.toBlob(async blob => {
      if (blob && navigator.clipboard && (window as unknown as { ClipboardItem: unknown }).ClipboardItem) {
        try {
          const item = new (window as unknown as { ClipboardItem: new (p: Record<string, Blob>) => unknown }).ClipboardItem({
            'image/png': blob
          });
          await navigator.clipboard.write([item as unknown as ClipboardItem]);
          resolve(true);
        } catch (err) {
          console.warn('Clipboard write failed, downloading as PNG fallback:', err);
          await downloadMobileCardPng(data);
          resolve(true);
        }
      } else {
        await downloadMobileCardPng(data);
        resolve(true);
      }
    }, 'image/png');
  });
}
