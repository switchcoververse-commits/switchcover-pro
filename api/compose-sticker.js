import sharp from 'sharp';

/* =====================================================================
 * CamoPro — compose-sticker  (v3, 20 jul 2026)
 * ---------------------------------------------------------------------
 * QUÉ CAMBIÓ RESPECTO DE v2 Y POR QUÉ
 *
 * v2 leía una máscara SVG pre-dibujada desde /masks y asumía un tamaño
 * de placa fijo por cada tipo. Eso no puede funcionar, porque la misma
 * placa de 1 toggle se fabrica en al menos seis anchos distintos según
 * marca y serie (69.8mm Standard … 88.9mm Jumbo = 19mm de diferencia), y
 * ninguno de esos datos es legible en una foto.
 *
 * v3 elimina por completo los archivos de máscara. La máscara se dibuja
 * aquí, en el momento, con la geometría real del pedido. Ventajas:
 *   - Quedan soportados Standard, TradeMaster, Junior-Jumbo, Jumbo,
 *     Screwless y cualquier marca futura sin agregar un solo archivo.
 *   - No pueden volver a convivir dos versiones de la misma máscara.
 *   - Corregir una medida es cambiar un número en este archivo.
 *
 * CÓMO SE DETERMINA EL TAMAÑO REAL DE LA PLACA
 * La ventana del dispositivo está estandarizada (NEMA): mide lo mismo en
 * Leviton, Hubbell o Pass & Seymour. El contorno de la placa no lo está.
 * Por eso la ventana sirve de regla de calibración: se le pide a Gemini la
 * PROPORCIÓN ancho_placa/ancho_ventana medida en la foto, y como el ancho
 * de ventana es un valor conocido, el ancho real sale por regla de tres.
 * Si la proporción falta o cae fuera de rango, se usa el tamaño Standard.
 *
 * TODAS LAS MEDIDAS DE ABAJO VIENEN DE FICHA DE FABRICANTE
 * - Pass & Seymour/Legrand, "Style Selector Guide – Custom Metal Wall
 *   Plates", hojas S-47/S-48: Style 1 (Toggle), Style 8 (Duplex),
 *   Style 26 (Decorator/GFCI). Ventanas acotadas.
 * - Pass & Seymour/Legrand, catálogo Wall Plates, hojas I-41/I-42:
 *   tabla de tamaños por serie, margen al primer gang y pitch.
 * - Leviton "Wallplate Size Guide" Q-1289: 2.75"x4.5", +1.81"/gang,
 *   grosor 0.22" plástico / 0.19" metal.
 * - Eaton (Arrow Hart): "1.81 in Gang to Gang", "1-3/8 in First Gang to Edge".
 * Ninguna medida de este archivo proviene de blogs ni de tiendas.
 * ===================================================================== */

const DPI = 300;
const PX_PER_MM = DPI / 25.4;              // 11.811
const mm = (v) => v * PX_PER_MM;

/* --- Geometría universal, confirmada en 5 series distintas ----------- */
const GANG_PITCH_MM = 46.04;               // 1.8125" — idéntico en todas las series
const STD_1GANG_W_MM = 69.85;              // 2.75"
const STD_H_MM = 114.30;                   // 4.50"

/* --- Wrap: franja que envuelve el canto de la placa ------------------ *
 * Grosores de ficha: plástico 5.6mm, metal 4.7mm, midway/oversize 6.5mm.
 * 11mm deja entre 4.5 y 6.4mm de solapa por detrás para que agarre.
 * PENDIENTE: confirmar con una prueba física antes de imprimir en volumen. */
const WRAP_MM = 11;

/* --- Radio de esquina de la PLACA ------------------------------------ *
 * No viene acotado en las fichas (varía por fabricante). 4.74mm es el
 * valor medido en la prueba física #3 y se ve correcto. Sin confirmar. */
const PLATE_CORNER_R_MM = 4.74;

/* --- Familias de ventana (medidas de ficha, en mm) ------------------- */
const WINDOW_FAMILIES = {
  // Style 26 — Decorator/GFCI. Cubre además GFCI, USB duplex y AFCI/GFCI
  // combo: Leviton vende todos ésos con el mismo molde de placa.
  decora: {
    label: 'Decora / GFCI',
    openings: [{ w: 33.32, h: 66.90, dy: 0, rx: 2.38, ry: 2.38 }],
    refWidthMm: 33.32   // referencia de calibración
  },

  // Style 8 — Duplex. DOS aberturas por gang, centros a 38.89mm.
  // Lados semicirculares, arriba y abajo planos -> rx = ry = altura/2.
  duplex: {
    label: 'Standard duplex',
    openings: [
      { w: 34.13, h: 28.58, dy: -19.445, rx: 14.29, ry: 14.29 },
      { w: 34.13, h: 28.58, dy: +19.445, rx: 14.29, ry: 14.29 }
    ],
    refWidthMm: 34.13
  },

  // Style 1 — Toggle. Ranura angosta y alta.
  toggle: {
    label: 'Toggle switch',
    openings: [{ w: 10.32, h: 23.81, dy: 0, rx: 1.0, ry: 1.0 }],
    refWidthMm: 10.32
  }
};

/* --- Catálogo: nombre -> familia + cantidad de gangs ------------------
 * Ya NO contiene medidas. Sólo dice qué forma tiene la ventana y cuántas
 * hay. El tamaño se calcula en cada pedido. */
const OUTLET_MAP = {};
const register = (names, family, gangs) => {
  names.forEach((n) => { OUTLET_MAP[n] = { family, gangs }; });
};

// Decora y sus equivalentes (mismo molde de placa)
register(['Decora_Rocker_USA', 'Decora Rocker', 'Decora Outlet',
          'GFCI_Duplex_USA', 'GFCI Duplex', 'GFCI Duplex USA',
          'USB_Duplex_USA', 'USB Duplex', 'USB Duplex USA',
          'AFCI_GFCI_Combo_USA', 'Dimmer_Switch_USA', 'Dimmer Switch'], 'decora', 1);
for (let g = 2; g <= 6; g++) register([`Decora_Rocker_${g}Gang_USA`], 'decora', g);

// Duplex estándar
register(['Standard_Duplex_USA', 'Standard Duplex', 'Standard Duplex USA',
          'Type_A_Mexico'], 'duplex', 1);
for (let g = 2; g <= 6; g++) register([`Standard_Duplex_${g}Gang_USA`], 'duplex', g);

// Toggle
register(['Single_Switch_USA', 'Single Switch', 'Single Switch USA'], 'toggle', 1);
register(['Double_Switch_USA', 'Double Switch', 'Double Switch USA'], 'toggle', 2);
register(['Triple_Switch_USA', 'Triple Switch', 'Triple Switch USA'], 'toggle', 3);
for (let g = 4; g <= 6; g++) register([`Toggle_${g}Gang_USA`], 'toggle', g);

/* --- Series reales de fabricante -------------------------------------- *
 * Fuente: Pass & Seymour/Legrand, catálogo Wall Plates, hojas I-41/I-42 y
 * S-3/S-4. Leviton Q-1289 coincide (su "Midway" = Junior-Jumbo).
 * Los fabricantes SÓLO producen estos cinco tamaños. Cualquier resultado
 * fuera de esta lista es, por definición, un error de medición. */
const PLATE_SERIES = [
  { key: 'standard',          w1: 69.85, h: 114.30 },  // 2.75"  x 4.5"
  { key: 'trademaster',       w1: 74.61, h: 119.06 },  // 2.9375" x 4.6875"
  { key: 'midway_juniorjumbo',w1: 79.38, h: 123.83 },  // 3.125" x 4.875"
  { key: 'trademaster_jumbo', w1: 84.14, h: 128.59 },  // 3.3125" x 5.0625"
  { key: 'jumbo',             w1: 88.90, h: 133.35 }   // 3.5"   x 5.25"
];

function seriesSize(series, gangs) {
  return { w: series.w1 + (gangs - 1) * GANG_PITCH_MM, h: series.h };
}

function standardPlateSize(gangs) {
  return seriesSize(PLATE_SERIES[0], gangs);
}

/**
 * Decide el tamaño real de la placa.
 *
 * POR QUÉ ASÍ (aprendido en la PRUEBA 6, 21 jul):
 * La primera versión calculaba ancho y alto por separado a partir de las dos
 * proporciones que devuelve el modelo. Resultado real: 95.8 x 108.6mm en una
 * placa que mide 69.85 x 114.3 — una placa casi cuadrada, que no existe.
 * Causa: el ancho se calibraba contra la ventana del toggle, que mide 10.32mm
 * y ocupa poquísimos píxeles; un error de 2px ahí se multiplica por 7. El alto
 * (ventana de 23.81mm) salió con sólo 5% de error.
 *
 * Solución: NO dejar el tamaño libre. Se usa la proporción más confiable — la
 * de ALTO, porque la ventana siempre es más alta que ancha en las tres
 * familias — para elegir a cuál de las cinco series de fabricante pertenece la
 * placa, y el ancho sale de la tabla oficial. Así el resultado sólo puede ser
 * un tamaño que realmente se fabrica.
 */
function resolvePlateSize({ gangs, family, widthRatio, heightRatio, plateWidthMm, plateHeightMm }) {
  const fam = WINDOW_FAMILIES[family];
  const refW = fam.refWidthMm;
  const refH = fam.openings[0].h;

  // Milímetros explícitos tienen prioridad (uso manual / reproceso).
  if (Number.isFinite(plateWidthMm) && plateWidthMm > 0 &&
      Number.isFinite(plateHeightMm) && plateHeightMm > 0) {
    return { w: plateWidthMm, h: plateHeightMm, source: 'explicit_mm' };
  }

  // Estimación de la ALTURA de la placa. Preferimos la proporción vertical;
  // si no vino, la deducimos de la horizontal como último recurso.
  let hEstimate = null, basis = null;
  if (Number.isFinite(heightRatio) && heightRatio > 0) {
    hEstimate = heightRatio * refH;
    basis = 'height_ratio';
  } else if (Number.isFinite(widthRatio) && widthRatio > 0) {
    const wEstimate = widthRatio * refW;
    // Convertimos ancho -> alto usando la relación de la serie Standard.
    hEstimate = PLATE_SERIES[0].h + (wEstimate - standardPlateSize(gangs).w);
    basis = 'width_ratio_fallback';
  }

  if (!hEstimate) {
    return { ...standardPlateSize(gangs), source: 'standard_fallback', rejected: null };
  }

  // Tolerancia: si la estimación queda muy lejos de CUALQUIER serie real,
  // la medición no es de fiar y usamos Standard.
  const MAX_DEV_MM = 12;
  let best = null, bestDev = Infinity;
  for (const s of PLATE_SERIES) {
    const dev = Math.abs(hEstimate - s.h);
    if (dev < bestDev) { bestDev = dev; best = s; }
  }

  if (bestDev > MAX_DEV_MM) {
    return {
      ...standardPlateSize(gangs),
      source: 'standard_fallback',
      rejected: { estimated_height_mm: Number(hEstimate.toFixed(1)), basis }
    };
  }

  return {
    ...seriesSize(best, gangs),
    source: `series:${best.key}`,
    basis,
    estimated_height_mm: Number(hEstimate.toFixed(1))
  };
}

/* --- Generación de la máscara ---------------------------------------- *
 * Blanco = se imprime (la placa). Negro = agujero (la ventana).
 * El lienzo incluye el wrap en los cuatro lados. */
function buildMaskSvg({ plateWmm, plateHmm, family, gangs }) {
  const fam = WINDOW_FAMILIES[family];
  const totalWmm = plateWmm + 2 * WRAP_MM;
  const totalHmm = plateHmm + 2 * WRAP_MM;

  const W = Math.round(mm(totalWmm));
  const H = Math.round(mm(totalHmm));

  // La placa va centrada en el lienzo; el wrap es el margen.
  const plateX = mm(WRAP_MM);
  const plateY = mm(WRAP_MM);
  const plateW = mm(plateWmm);
  const plateH = mm(plateHmm);

  const cx = plateX + plateW / 2;
  const cy = plateY + plateH / 2;

  // Centros de gang: simétricos respecto del centro, separados 46.04mm.
  // Verificado contra ficha: en una placa Standard de 3 gangs esto deja el
  // primer centro a 34.9mm del borde, que es el 1-3/8" que especifica Eaton.
  const rects = [];
  for (let i = 0; i < gangs; i++) {
    const gx = cx + (i - (gangs - 1) / 2) * mm(GANG_PITCH_MM);
    fam.openings.forEach((o) => {
      const ow = mm(o.w), oh = mm(o.h);
      rects.push(
        `<rect x="${(gx - ow / 2).toFixed(2)}" y="${(cy + mm(o.dy) - oh / 2).toFixed(2)}" ` +
        `width="${ow.toFixed(2)}" height="${oh.toFixed(2)}" ` +
        `rx="${mm(o.rx).toFixed(2)}" ry="${mm(o.ry).toFixed(2)}" fill="black"/>`
      );
    });
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<rect width="${W}" height="${H}" fill="black"/>` +
    `<rect x="${plateX.toFixed(2)}" y="${plateY.toFixed(2)}" ` +
    `width="${plateW.toFixed(2)}" height="${plateH.toFixed(2)}" ` +
    `rx="${mm(PLATE_CORNER_R_MM).toFixed(2)}" fill="white"/>` +
    rects.join('') +
    `</svg>`;

  return { svg, W, H };
}

/* --- Endpoint --------------------------------------------------------- */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      textureBase64,
      outletType,
      side,
      widthRatio,        // ancho_placa / ancho_ventana, medido en la foto
      heightRatio,       // alto_placa / alto_ventana (opcional)
      plateWidthMm,      // alternativa: milímetros explícitos
      plateHeightMm
    } = req.body || {};

    if (!textureBase64 || !outletType || !side) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const entry = OUTLET_MAP[outletType] || OUTLET_MAP[String(outletType).trim()];
    if (!entry) {
      return res.status(404).json({
        error: 'OUTLET_NOT_SUPPORTED',
        outlet_type_detected: outletType,
        supported: Object.keys(OUTLET_MAP),
        action: 'NOTIFY_CUSTOMER_DELAY',
        customer_message: `We detected your outlet as "${outletType}". This specific model is not yet in our production database. Your order will be processed manually and may take 3-5 additional business days. We will notify you by email.`
      });
    }

    const { family, gangs } = entry;
    const size = resolvePlateSize({
      gangs, family,
      widthRatio: Number(widthRatio),
      heightRatio: Number(heightRatio),
      plateWidthMm: Number(plateWidthMm),
      plateHeightMm: Number(plateHeightMm)
    });

    const { svg, W, H } = buildMaskSvg({
      plateWmm: size.w, plateHmm: size.h, family, gangs
    });

    // Textura estirada al lienzo completo (cara + wrap), sin alfa propio.
    // OJO: .removeAlpha() es imprescindible. Con .ensureAlpha() aquí, sharp
    // mete un canal opaco que pisa la máscara y el recorte desaparece.
    const texture = await sharp(Buffer.from(textureBase64, 'base64'))
      .resize(W, H, { fit: 'fill' })
      .removeAlpha()
      .png()
      .toBuffer();

    // Máscara -> canal alfa. Mismo fit:'fill' que la textura: sin él, sharp
    // usa 'cover' por defecto y recorta en silencio.
    const alpha = await sharp(Buffer.from(svg))
      .resize(W, H, { fit: 'fill' })
      .ensureAlpha()
      .extractChannel('red')
      .toBuffer();

    const result = await sharp(texture).joinChannel(alpha).png().toBuffer();

    return res.status(200).json({
      imageBase64: result.toString('base64'),
      mimeType: 'image/png',
      outletType,
      window_family: WINDOW_FAMILIES[family].label,
      gangs,
      plate_mm: `${size.w.toFixed(1)} x ${size.h.toFixed(1)}`,
      size_source: size.source,          // series:<nombre> | explicit_mm | standard_fallback
      size_basis: size.basis || null,    // height_ratio | width_ratio_fallback
      size_estimated_height_mm: size.estimated_height_mm || null,
      size_rejected: size.rejected || null,
      wrap_mm: WRAP_MM,
      dimensions: `${W}x${H}px (${DPI} DPI)`,
      side,
      status: 'SUCCESS'
    });

  } catch (err) {
    console.error('compose-sticker error:', err);
    return res.status(500).json({ error: err.message });
  }
}
