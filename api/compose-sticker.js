import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const OUTLET_MAP = {
  // Mapeo directo: si el nombre ya es un archivo, úsalo directamente
  "GFCI_Duplex_USA": { svg: "GFCI_Duplex_USA", w: 825, h: 1350 },
  "GFCI Duplex": { svg: "GFCI_Duplex_USA", w: 825, h: 1350 },
  "GFCI Duplex USA": { svg: "GFCI_Duplex_USA", w: 825, h: 1350 },
  "Standard_Duplex_USA": { svg: "Standard_Duplex_USA", w: 825, h: 1350 },
  "Standard Duplex": { svg: "Standard_Duplex_USA", w: 825, h: 1350 },
  "Standard Duplex USA": { svg: "Standard_Duplex_USA", w: 825, h: 1350 },
  "USB_Duplex_USA": { svg: "USB_Duplex_USA", w: 825, h: 1350 },
  "USB Duplex": { svg: "USB_Duplex_USA", w: 825, h: 1350 },
  "USB Duplex USA": { svg: "USB_Duplex_USA", w: 825, h: 1350 },
  "Single_Switch_USA": { svg: "Single_Switch_USA", w: 825, h: 1350 },
  "Single Switch": { svg: "Single_Switch_USA", w: 825, h: 1350 },
  "Single Switch USA": { svg: "Single_Switch_USA", w: 825, h: 1350 },
  "Double_Switch_USA": { svg: "Double_Switch_USA", w: 1350, h: 1350 },
  "Double Switch": { svg: "Double_Switch_USA", w: 1350, h: 1350 },
  "Double Switch USA": { svg: "Double_Switch_USA", w: 1350, h: 1350 },
  "Triple_Switch_USA": { svg: "Triple_Switch_USA", w: 1350, h: 825 },
  "Triple Switch": { svg: "Triple_Switch_USA", w: 1350, h: 825 },
  "Triple Switch USA": { svg: "Triple_Switch_USA", w: 1350, h: 825 },
  "Decora_Rocker_USA": { svg: "Decora_Rocker_USA", w: 825, h: 1350 },
  "Decora Rocker": { svg: "Decora_Rocker_USA", w: 825, h: 1350 },
  "Decora Outlet": { svg: "Decora_Rocker_USA", w: 825, h: 1350 },
  "Quad_Outlet_USA": { svg: "Quad_Outlet_USA", w: 1350, h: 1350 },
  "Quad Outlet": { svg: "Quad_Outlet_USA", w: 1350, h: 1350 },
  "Dimmer_Switch_USA": { svg: "Dimmer_Switch_USA", w: 825, h: 1350 },
  "Dimmer Switch": { svg: "Dimmer_Switch_USA", w: 825, h: 1350 },
  "AFCI_GFCI_Combo_USA": { svg: "AFCI_GFCI_Combo_USA", w: 825, h: 1350 },
  "Schuko_EU": { svg: "Schuko_EU", w: 945, h: 945 },
  "Schuko EU": { svg: "Schuko_EU", w: 945, h: 945 },
  "Type G": { svg: "Type_G_UK", w: 1016, h: 1016 },
  "Type_G_UK": { svg: "Type_G_UK", w: 1016, h: 1016 },
  "Type I": { svg: "Type_I_Australia", w: 898, h: 1350 },
  "Type_I_Australia": { svg: "Type_I_Australia", w: 898, h: 1350 },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { textureBase64, outletType, side } = req.body;
    if (!textureBase64 || !outletType || !side) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Si el nombre ya tiene guiones bajos, buscar directamente en el mapa
    let mapping = OUTLET_MAP[outletType] || OUTLET_MAP[outletType.trim()];
    
    // Si no hay mapeo y el nombre contiene guion bajo, asumir que es un archivo
    if (!mapping && outletType.includes('_')) {
      mapping = { svg: outletType, w: 825, h: 1350 };
    }

    if (!mapping) {
      return res.status(404).json({
        error: 'OUTLET_NOT_SUPPORTED',
        outlet_type_detected: outletType,
        action: 'NOTIFY_CUSTOMER_DELAY',
        customer_message: `We detected your outlet as "${outletType}". This specific model is not yet in our production database. Your order will be processed manually and may take 3-5 additional business days. We will notify you by email.`
      });
    }

    const maskPath = path.join(process.cwd(), 'masks', `${mapping.svg}_${side}.svg`);

    if (!fs.existsSync(maskPath)) {
      return res.status(404).json({
        error: 'OUTLET_NOT_SUPPORTED',
        outlet_type_detected: outletType,
        svg_attempted: `${mapping.svg}_${side}.svg`,
        action: 'NOTIFY_CUSTOMER_DELAY',
        customer_message: `We detected your outlet as "${outletType}". This specific model is not yet in our production database. Your order will be processed manually and may take 3-5 additional business days. We will notify you by email.`
      });
    }

    const textureBuffer = Buffer.from(textureBase64, 'base64');

    const result = await sharp(textureBuffer)
      .resize(mapping.w, mapping.h, { fit: 'fill' })
      .composite([{ input: maskPath, blend: 'dest-in' }])
      .png()
      .toBuffer();

    return res.status(200).json({
      imageBase64: result.toString('base64'),
      mimeType: 'image/png',
      outletType,
      svgUsed: `${mapping.svg}_${side}.svg`,
      side,
      dimensions: `${mapping.w}x${mapping.h}px (300 DPI)`,
      status: 'SUCCESS'
    });

  } catch (err) {
    console.error('Sharp error:', err);
    return res.status(500).json({ error: err.message });
  }
}
