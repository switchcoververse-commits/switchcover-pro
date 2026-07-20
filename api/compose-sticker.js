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

/* --- Tamaño de placa: cálculo + red de seguridad ---------------------- */
function standardPlateSize(gangs) {
  return {
    w: STD_1GANG_W_MM + (gangs - 1) * GANG_PITCH_MM,
    h: STD_H_MM
  };
}

/**
 * Decide el tamaño real de la placa.
 * Prioridad: (1) proporción medida en la foto, (2) mm explícitos,
 * (3) tamaño Standard como respaldo.
 * Cualquier valor absurdo se descarta y cae al respaldo — nunca se imprime
 * un disparate por una lectura mala del modelo.
 */
function resolvePlateSize({ gangs, family, widthRatio, heightRatio, plateWidthMm, plateHeightMm }) {
  const std = standardPlateSize(gangs);
  const ref = WINDOW_FAMILIES[family].refWidthMm;

  // Límites de cordura, derivados de las series reales de fabricante:
  // la más chica es Standard; la más grande, Jumbo (+0.75" ancho y alto).
  // Se deja un 8% extra de tolerancia por error de medición.
  const minW = std.w * 0.92;
  const maxW = (std.w + 19.05) * 1.08;
  const minH = STD_H_MM * 0.92;
  const maxH = (STD_H_MM + 19.05) * 1.08;

  let w = null, h = null, source = 'standard_fallback';

  if (Number.isFinite(widthRatio) && widthRatio > 0) {
    w = widthRatio * ref;
    if (Number.isFinite(heightRatio) && heightRatio > 0) {
      h = heightRatio * WINDOW_FAMILIES[family].openings[0].h;
    }
    source = 'window_ratio';
  } else if (Number.isFinite(plateWidthMm) && plateWidthMm > 0) {
    w = plateWidthMm;
    h = Number.isFinite(plateHeightMm) ? plateHeightMm : null;
    source = 'explicit_mm';
  }

  // Si sólo tenemos ancho, deducimos el alto: en todas las series el alto
  // crece igual que el ancho de 1 gang (ambos "+3/16", "+3/8", "+3/4").
  if (w && !h) h = STD_H_MM + (w - std.w);

  const sane = w && h && w >= minW && w <= maxW && h >= minH && h <= maxH;
  if (!sane) return { ...std, source: 'standard_fallback', rejected: w ? { w, h } : null };

  return { w, h, source };
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
      size_source: size.source,          // window_ratio | explicit_mm | standard_fallback
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
