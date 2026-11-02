/**
 * Utility functions for vehicle photo management and PowerPoint slide background removal.
 */

/**
 * Removes white PowerPoint slide margins and pure white background from an image.
 * 1. Analyzes pixels to find the bounding box of the real photo (ignoring the 16:9 white slide area).
 * 2. Crops the vehicle photo.
 * 3. Makes the pure white edges transparent so it blends cleanly into dark or light UI.
 */
export async function removeImageBackground(
  imageSource: string,
  tolerance: number = 35
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageSource);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Step 1: Detect non-white content bounding box (to crop out empty slide space)
        let minX = canvas.width;
        let minY = canvas.height;
        let maxX = 0;
        let maxY = 0;
        let foundContent = false;

        const isWhitePixel = (r: number, g: number, b: number) => {
          return r > (255 - tolerance * 1.25) && g > (255 - tolerance * 1.25) && b > (255 - tolerance * 1.25);
        };

        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const idx = (y * canvas.width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];

            if (a > 15 && !isWhitePixel(r, g, b)) {
              foundContent = true;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (!foundContent) {
          resolve(imageSource);
          return;
        }

        // Add small margin around the vehicle
        const pad = 12;
        const cropX = Math.max(0, minX - pad);
        const cropY = Math.max(0, minY - pad);
        const cropW = Math.min(canvas.width - cropX, (maxX - minX) + pad * 2);
        const cropH = Math.min(canvas.height - cropY, (maxY - minY) + pad * 2);

        // Step 2: Draw cropped photo to secondary canvas
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = cropW;
        cropCanvas.height = cropH;
        const cropCtx = cropCanvas.getContext('2d');
        if (!cropCtx) {
          resolve(imageSource);
          return;
        }

        cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

        // Step 3: Remove white pixels on borders and background
        const croppedImgData = cropCtx.getImageData(0, 0, cropW, cropH);
        const croppedData = croppedImgData.data;

        for (let i = 0; i < croppedData.length; i += 4) {
          const r = croppedData[i];
          const g = croppedData[i + 1];
          const b = croppedData[i + 2];

          if (isWhitePixel(r, g, b)) {
            croppedData[i + 3] = 0; // Transparent
          }
        }

        cropCtx.putImageData(croppedImgData, 0, 0);
        resolve(cropCanvas.toDataURL('image/png'));
      } catch (err) {
        console.error('Error in removeImageBackground:', err);
        resolve(imageSource);
      }
    };
    img.onerror = () => reject(new Error('No se pudo procesar la imagen'));
    img.src = imageSource;
  });
}

/**
 * High-fidelity vector illustration for JAC Sunray Van of LASER Airlines
 * (White high-roof passenger van, chrome grille, JAC logo, LASER Airlines emblem,
 * amber turn signals, custom unit number and plate).
 */
export function getJacSunrayVanSvg(unitNum: string, plate: string, subtitle: string = ''): string {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 520" width="600" height="520">
  <defs>
    <linearGradient id="vanWhite_${unitNum}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="65%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </linearGradient>
    <linearGradient id="vanGlass_${unitNum}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#090d16"/>
      <stop offset="60%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>
    <filter id="vanShadow_${unitNum}" x="-8%" y="-8%" width="116%" height="120%">
      <feDropShadow dx="0" dy="14" stdDeviation="10" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Ground Shadow -->
  <ellipse cx="300" cy="485" rx="245" ry="22" fill="#090d16" opacity="0.38" filter="blur(6px)"/>

  <!-- Van Main Body -->
  <g filter="url(#vanShadow_${unitNum})">
    <!-- Aerodynamic High-Roof Van Shell -->
    <path d="M 170 115 C 185 60, 230 42, 300 42 C 370 42, 415 60, 430 115 L 445 220 C 455 240, 465 290, 465 375 C 465 415, 440 440, 410 440 L 190 440 C 160 440, 135 415, 135 375 C 135 290, 145 240, 155 220 Z" fill="url(#vanWhite_${unitNum})" stroke="#cbd5e1" stroke-width="2.5"/>

    <!-- High Roof Crown Line -->
    <path d="M 180 110 Q 300 90 420 110" fill="none" stroke="#e2e8f0" stroke-width="3"/>

    <!-- Large Front Panoramic Windshield with Wipers -->
    <path d="M 180 140 C 195 125, 240 120, 300 120 C 360 120, 405 125, 420 140 L 435 240 L 165 240 Z" fill="url(#vanGlass_${unitNum})" stroke="#0f172a" stroke-width="3"/>
    <!-- Glass Reflections -->
    <path d="M 205 142 L 260 132 L 280 232 L 225 240 Z" fill="#ffffff" opacity="0.18"/>
    <path d="M 330 132 L 350 132 L 370 230 L 350 230 Z" fill="#ffffff" opacity="0.1"/>
    
    <!-- Wipers -->
    <line x1="240" y1="235" x2="280" y2="160" stroke="#000000" stroke-width="4.5" stroke-linecap="round"/>
    <line x1="330" y1="235" x2="370" y2="165" stroke="#000000" stroke-width="4.5" stroke-linecap="round"/>
    <!-- Rearview Mirror inside -->
    <rect x="290" y="128" width="20" height="8" rx="2" fill="#000000"/>

    <!-- Front Hood with LASER Airlines Branding & Unit Number -->
    <path d="M 165 240 L 435 240 L 440 320 C 440 330, 410 335, 300 335 C 190 335, 160 330, 160 320 Z" fill="url(#vanWhite_${unitNum})"/>

    <!-- LASER Airlines Logo on Hood -->
    <g transform="translate(225, 264)">
      <!-- Green/Yellow Flag -->
      <polygon points="0,0 20,-6 28,0 8,6" fill="#15803d"/>
      <polygon points="4,7 24,1 32,7 12,13" fill="#eab308"/>
      <text x="36" y="9" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-weight="900" font-size="18" fill="#1e293b" letter-spacing="0.5">LASER Airlines</text>
    </g>

    <!-- Unit Number Badge on Hood -->
    <g transform="translate(300, 298)">
      <circle cx="0" cy="-2" r="17" fill="#0f172a" stroke="#f8fafc" stroke-width="2"/>
      <text x="0" y="5" font-family="'JetBrains Mono', monospace" font-weight="900" font-size="18" fill="#ffffff" text-anchor="middle">${unitNum}</text>
    </g>

    <!-- Subtitle if any (e.g. Estación Maracay) -->
    ${subtitle ? `<text x="300" y="324" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-weight="800" font-size="11" fill="#475569" text-anchor="middle" letter-spacing="0.5">${subtitle.toUpperCase()}</text>` : ''}

    <!-- Chrome Front Grille (Distinctive JAC Sunray Curved Ribs) -->
    <g transform="translate(195, 332)">
      <rect x="0" y="0" width="210" height="66" rx="12" fill="#0f172a"/>
      <!-- Chrome horizontal slats -->
      <line x1="15" y1="16" x2="195" y2="16" stroke="#f1f5f9" stroke-width="3.5"/>
      <line x1="20" y1="31" x2="190" y2="31" stroke="#cbd5e1" stroke-width="3"/>
      <line x1="25" y1="46" x2="185" y2="46" stroke="#f1f5f9" stroke-width="3"/>
      <line x1="35" y1="58" x2="175" y2="58" stroke="#94a3b8" stroke-width="2.5"/>
      <!-- Oval Chrome JAC Emblem in center -->
      <ellipse cx="105" cy="31" rx="22" ry="14" fill="#0f172a" stroke="#f8fafc" stroke-width="2.5"/>
      <text x="105" y="35" font-family="Arial, sans-serif" font-weight="900" font-size="12" fill="#ffffff" text-anchor="middle" letter-spacing="1">JAC</text>
    </g>

    <!-- Headlights (Sweeping Projector Housings) -->
    <!-- Left Headlight -->
    <path d="M 155 268 Q 185 275 195 352 L 160 367 Q 140 310 155 268 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
    <ellipse cx="178" cy="326" rx="10" ry="14" fill="#38bdf8" stroke="#0284c7" stroke-width="1.5"/>
    <path d="M 158 273 Q 170 278 178 298 L 160 303 Z" fill="#f97316"/> <!-- Amber signal -->

    <!-- Right Headlight -->
    <path d="M 445 268 Q 415 275 405 352 L 440 367 Q 460 310 445 268 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
    <ellipse cx="422" cy="326" rx="10" ry="14" fill="#38bdf8" stroke="#0284c7" stroke-width="1.5"/>
    <path d="M 442 273 Q 430 278 422 298 L 440 303 Z" fill="#f97316"/> <!-- Amber signal -->

    <!-- Dark Lower Bumper & Air Intake -->
    <path d="M 150 378 L 450 378 L 440 440 L 160 440 Z" fill="#1e293b"/>
    <!-- Fog Lights -->
    <circle cx="185" cy="410" r="9" fill="#fef08a" stroke="#475569" stroke-width="2"/>
    <circle cx="415" cy="410" r="9" fill="#fef08a" stroke="#475569" stroke-width="2"/>

    <!-- Venezuelan License Plate -->
    <g transform="translate(255, 404)">
      <rect x="0" y="0" width="90" height="26" rx="4" fill="#ffffff" stroke="#0f172a" stroke-width="2"/>
      <rect x="2" y="2" width="86" height="5" fill="#1d4ed8"/>
      <text x="45" y="20" font-family="'JetBrains Mono', monospace" font-weight="900" font-size="14" fill="#0f172a" text-anchor="middle">${plate}</text>
    </g>

    <!-- Side Mirrors -->
    <!-- Left Mirror -->
    <path d="M 160 215 L 115 220 L 115 265 L 155 250 Z" fill="#0f172a"/>
    <ellipse cx="120" cy="242" rx="10" ry="20" fill="#334155"/>
    <!-- Right Mirror -->
    <path d="M 440 215 L 485 220 L 485 265 L 445 250 Z" fill="#0f172a"/>
    <ellipse cx="480" cy="242" rx="10" ry="20" fill="#334155"/>
  </g>

  <!-- Front Tires visible below bumper -->
  <rect x="165" y="432" width="28" height="42" rx="6" fill="#0f172a"/>
  <rect x="407" y="432" width="28" height="42" rx="6" fill="#0f172a"/>
</svg>
`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * High-fidelity vector illustration for LASER Heavy Passenger Coach / Shuttle Buses
 * (Unidad 11, Unidad 37, Unidad 23).
 */
export function getLaserBusSvg(
  unitNum: string,
  plate: string,
  style: 'laser_green' | 'ruby_red' | 'laser_white',
  capacityText: string = ''
): string {
  // Color presets
  const isRed = style === 'ruby_red';
  const isLaser = style === 'laser_green';

  const bodyGradientStart = isRed ? '#b91c1c' : isLaser ? '#ffffff' : '#f8fafc';
  const bodyGradientMid = isRed ? '#991b1b' : isLaser ? '#f1f5f9' : '#e2e8f0';
  const bodyGradientEnd = isRed ? '#7f1d1d' : isLaser ? '#e2e8f0' : '#cbd5e1';

  const accentColor = isRed ? '#fef08a' : '#15803d'; // Gold or green
  const secondaryAccent = isRed ? '#f87171' : '#eab308'; // Light red or yellow

  const destinationText = isRed ? 'TRANSPORTE DE PERSONAL' : 'LASER AIRLINES';

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 650 540" width="650" height="540">
  <defs>
    <linearGradient id="busBody_${unitNum}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${bodyGradientStart}"/>
      <stop offset="55%" stop-color="${bodyGradientMid}"/>
      <stop offset="100%" stop-color="${bodyGradientEnd}"/>
    </linearGradient>
    <linearGradient id="busGlass_${unitNum}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0b1120"/>
      <stop offset="50%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>
    <linearGradient id="acUnit_${unitNum}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e2e8f0"/>
      <stop offset="100%" stop-color="#94a3b8"/>
    </linearGradient>
    <filter id="busShadow_${unitNum}" x="-8%" y="-8%" width="116%" height="120%">
      <feDropShadow dx="0" dy="16" stdDeviation="12" flood-opacity="0.4"/>
    </filter>
  </defs>

  <!-- Ground Shadow -->
  <ellipse cx="325" cy="505" rx="275" ry="24" fill="#090d16" opacity="0.42" filter="blur(7px)"/>

  <!-- Bus Main Body Group -->
  <g filter="url(#busShadow_${unitNum})">
    <!-- Rooftop AC / Ventilation Pod -->
    <path d="M 230 45 L 420 45 L 435 70 L 215 70 Z" fill="url(#acUnit_${unitNum})" stroke="#64748b" stroke-width="2"/>
    <line x1="260" y1="56" x2="390" y2="56" stroke="#475569" stroke-width="3"/>
    <line x1="280" y1="62" x2="370" y2="62" stroke="#475569" stroke-width="2"/>

    <!-- High Coach Aerodynamic Body Contour -->
    <path d="M 140 85 C 160 65, 230 60, 325 60 C 420 60, 490 65, 510 85 L 525 210 C 535 240, 540 320, 540 400 C 540 435, 515 455, 480 455 L 170 455 C 135 455, 110 435, 110 400 C 110 320, 115 240, 125 210 Z" fill="url(#busBody_${unitNum})" stroke="#94a3b8" stroke-width="2.5"/>

    <!-- Destination Sign / LED Box on Top Windshield -->
    <rect x="200" y="80" width="250" height="36" rx="6" fill="#090d16" stroke="#475569" stroke-width="2"/>
    <text x="325" y="103" font-family="'JetBrains Mono', monospace" font-weight="900" font-size="16" fill="#fbbf24" text-anchor="middle" letter-spacing="2">
      ${destinationText}
    </text>

    <!-- Panoramic Double Windshield Glass -->
    <path d="M 145 125 C 180 120, 250 118, 325 118 C 400 118, 470 120, 505 125 L 515 235 L 135 235 Z" fill="url(#busGlass_${unitNum})" stroke="#0f172a" stroke-width="3"/>

    <!-- Glass Highlights & Interior Passenger View -->
    <path d="M 170 130 L 230 123 L 260 225 L 195 235 Z" fill="#ffffff" opacity="0.16"/>
    <path d="M 390 123 L 420 123 L 440 225 L 415 225 Z" fill="#ffffff" opacity="0.1"/>

    <!-- Rearview Mirror Inside & Curtains Accent -->
    <rect x="315" y="122" width="20" height="8" rx="2" fill="#000000"/>
    <path d="M 145 125 L 170 125 L 160 170 L 140 160 Z" fill="#334155" opacity="0.4"/>
    <path d="M 505 125 L 480 125 L 490 170 L 510 160 Z" fill="#334155" opacity="0.4"/>

    <!-- Heavy Bus Double Windshield Wipers -->
    <line x1="225" y1="230" x2="285" y2="145" stroke="#000000" stroke-width="5" stroke-linecap="round"/>
    <line x1="365" y1="230" x2="425" y2="145" stroke="#000000" stroke-width="5" stroke-linecap="round"/>

    <!-- Livery Swooshes on Front Facia -->
    <g>
      <path d="M 135 240 Q 325 260 515 240 L 518 290 Q 325 315 132 290 Z" fill="${isRed ? '#7f1d1d' : '#15803d'}" opacity="0.9"/>
      <path d="M 132 288 Q 325 313 518 288 L 520 302 Q 325 328 130 302 Z" fill="${secondaryAccent}"/>
    </g>

    <!-- LASER Airlines / Transportation Brand Badge -->
    <g transform="translate(325, 268)">
      ${isRed ? `
        <!-- Custom Ruby Emblem -->
        <circle cx="0" cy="0" r="18" fill="#7f1d1d" stroke="#fef08a" stroke-width="2"/>
        <text x="0" y="6" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-weight="900" font-size="14" fill="#ffffff" text-anchor="middle">TRANS</text>
      ` : `
        <!-- LASER Airlines Flag Emblem -->
        <g transform="translate(-85, -12)">
          <polygon points="0,0 20,-6 28,0 8,6" fill="#15803d"/>
          <polygon points="4,7 24,1 32,7 12,13" fill="#eab308"/>
          <text x="36" y="9" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-weight="900" font-size="18" fill="#1e293b" letter-spacing="0.5">LASER Airlines</text>
        </g>
      `}
    </g>

    <!-- Large Unit Number Emblem -->
    <g transform="translate(325, 335)">
      <circle cx="0" cy="0" r="24" fill="#0f172a" stroke="${accentColor}" stroke-width="3"/>
      <text x="0" y="8" font-family="'JetBrains Mono', monospace" font-weight="900" font-size="24" fill="#ffffff" text-anchor="middle">${unitNum}</text>
    </g>

    <!-- Capacity Label -->
    ${capacityText ? `
      <text x="325" y="372" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-weight="800" font-size="12" fill="${isRed ? '#fef08a' : '#1e293b'}" text-anchor="middle" letter-spacing="0.5">
        ${capacityText.toUpperCase()}
      </text>
    ` : ''}

    <!-- Chrome Center Grille & Air Intakes -->
    <g transform="translate(210, 385)">
      <rect x="0" y="0" width="230" height="35" rx="8" fill="#090d16" stroke="#475569" stroke-width="1.5"/>
      <line x1="15" y1="9" x2="215" y2="9" stroke="#cbd5e1" stroke-width="2.5"/>
      <line x1="20" y1="18" x2="210" y2="18" stroke="#cbd5e1" stroke-width="2.5"/>
      <line x1="25" y1="27" x2="205" y2="27" stroke="#cbd5e1" stroke-width="2.5"/>
    </g>

    <!-- Modern Sweeping Coach Headlight Units -->
    <!-- Left Projector Cluster -->
    <g transform="translate(130, 345)">
      <path d="M 0 0 Q 30 15 50 45 L 20 60 Q -5 25 0 0 Z" fill="#ffffff" stroke="#94a3b8" stroke-width="2"/>
      <circle cx="28" cy="35" r="9" fill="#38bdf8" stroke="#0284c7" stroke-width="2"/>
      <path d="M 5 5 Q 20 15 28 25 L 20 28 Z" fill="#f97316"/> <!-- Amber turn signal -->
      <line x1="8" y1="48" x2="28" y2="54" stroke="#eab308" stroke-width="2.5"/> <!-- LED strip -->
    </g>

    <!-- Right Projector Cluster -->
    <g transform="translate(470, 345)">
      <path d="M 50 0 Q 20 15 0 45 L 30 60 Q 55 25 50 0 Z" fill="#ffffff" stroke="#94a3b8" stroke-width="2"/>
      <circle cx="22" cy="35" r="9" fill="#38bdf8" stroke="#0284c7" stroke-width="2"/>
      <path d="M 45 5 Q 30 15 22 25 L 30 28 Z" fill="#f97316"/> <!-- Amber turn signal -->
      <line x1="42" y1="48" x2="22" y2="54" stroke="#eab308" stroke-width="2.5"/> <!-- LED strip -->
    </g>

    <!-- Heavy Lower Bumper Section -->
    <path d="M 120 415 L 530 415 L 515 465 L 135 465 Z" fill="#1e293b"/>
    <!-- Fog Lamps -->
    <circle cx="170" cy="442" r="11" fill="#fef08a" stroke="#475569" stroke-width="2.5"/>
    <circle cx="480" cy="442" r="11" fill="#fef08a" stroke="#475569" stroke-width="2.5"/>
    <rect x="200" y="432" width="50" height="18" rx="4" fill="#0f172a"/>
    <rect x="400" y="432" width="50" height="18" rx="4" fill="#0f172a"/>

    <!-- Venezuelan License Plate on Bumper -->
    <g transform="translate(275, 430)">
      <rect x="0" y="0" width="100" height="28" rx="5" fill="#ffffff" stroke="#090d16" stroke-width="2.5"/>
      <rect x="3" y="2" width="94" height="6" fill="#1d4ed8"/>
      <text x="50" y="22" font-family="'JetBrains Mono', monospace" font-weight="900" font-size="15" fill="#090d16" text-anchor="middle">${plate}</text>
    </g>

    <!-- Massive Coach Side Mirrors -->
    <!-- Left Mirror Arm & Pod -->
    <path d="M 130 190 L 75 195 L 75 270 L 125 245 Z" fill="#0f172a"/>
    <ellipse cx="80" cy="235" rx="12" ry="28" fill="#334155"/>
    <line x1="72" y1="210" x2="72" y2="240" stroke="#f97316" stroke-width="3"/> <!-- Turn indicator -->

    <!-- Right Mirror Arm & Pod -->
    <path d="M 520 190 L 575 195 L 575 270 L 525 245 Z" fill="#0f172a"/>
    <ellipse cx="570" cy="235" rx="12" ry="28" fill="#334155"/>
    <line x1="578" y1="210" x2="578" y2="240" stroke="#f97316" stroke-width="3"/> <!-- Turn indicator -->
  </g>

  <!-- Coach Wheels & Tires -->
  <g>
    <!-- Left Tire & Rim -->
    <rect x="140" y="455" width="36" height="46" rx="8" fill="#090d16"/>
    <rect x="145" y="465" width="26" height="30" rx="4" fill="#475569"/>
    <!-- Right Tire & Rim -->
    <rect x="474" y="455" width="36" height="46" rx="8" fill="#090d16"/>
    <rect x="479" y="465" width="26" height="30" rx="4" fill="#475569"/>
  </g>
</svg>
`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Pre-generated vector assets for each LASER fleet unit:
 * - Unidad 11: Autobús LASER Airlines (27 cap)
 * - Unidad 37: Autobús Rojo / Rubí (25 cap)
 * - Unidad 23: Autobús Gran Capacidad (40 cap)
 * - Unidad 42: Van JAC Sunray (18 cap)
 * - Unidad 43: Van JAC Sunray (18 cap - Circuito Corto)
 * - Unidad 44: Van JAC Sunray (18 cap - Estación Maracay)
 */
export const UNIDAD_11_SVG_DATA_URL = getLaserBusSvg('11', 'A011LAS', 'laser_green', 'Capacidad 27 Pasajeros');
export const UNIDAD_37_SVG_DATA_URL = getLaserBusSvg('37', 'A73AA8G', 'ruby_red', 'Capacidad 25 Pasajeros');
export const UNIDAD_23_SVG_DATA_URL = getLaserBusSvg('23', 'A023LAS', 'laser_white', 'Capacidad 40 Pasajeros');

export const UNIDAD_42_SVG_DATA_URL = getJacSunrayVanSvg('42', 'A0851AI', 'Concesionario');
export const UNIDAD_43_SVG_DATA_URL = getJacSunrayVanSvg('43', 'A0607MB', 'Circuito Corto');
export const UNIDAD_44_SVG_DATA_URL = getJacSunrayVanSvg('44', 'A0822NB', 'Estación Maracay');

/**
 * Returns default vector photo for any unit by unit number
 */
export function getUnitDefaultPhoto(unitNumber: string): string {
  const digits = unitNumber.replace(/\D/g, '');
  if (digits === '11') return UNIDAD_11_SVG_DATA_URL;
  if (digits === '37') return UNIDAD_37_SVG_DATA_URL;
  if (digits === '23') return UNIDAD_23_SVG_DATA_URL;
  if (digits === '42') return UNIDAD_42_SVG_DATA_URL;
  if (digits === '43') return UNIDAD_43_SVG_DATA_URL;
  if (digits === '44') return UNIDAD_44_SVG_DATA_URL;
  return getJacSunrayVanSvg(digits || '00', 'VENEZUELA');
}

export const OFFICIAL_UNIT_PHOTOS = [
  { id: '11', name: 'Unidad 11', type: 'Autobús LASER Airlines (27 cap)', url: UNIDAD_11_SVG_DATA_URL },
  { id: '37', name: 'Unidad 37', type: 'Autobús Rojo/Rubí (25 cap)', url: UNIDAD_37_SVG_DATA_URL },
  { id: '23', name: 'Unidad 23', type: 'Autobús Transporte Personal (40 cap)', url: UNIDAD_23_SVG_DATA_URL },
  { id: '42', name: 'Unidad 42', type: 'Van JAC Sunray (18 cap)', url: UNIDAD_42_SVG_DATA_URL },
  { id: '43', name: 'Unidad 43', type: 'Van JAC Sunray (18 cap - Circuito Corto)', url: UNIDAD_43_SVG_DATA_URL },
  { id: '44', name: 'Unidad 44', type: 'Van JAC Sunray (18 cap - Maracay)', url: UNIDAD_44_SVG_DATA_URL },
];
