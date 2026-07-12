import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const OUTLET_MAP = {
  // 🇺🇸 USA
  "GFCI_Duplex_USA": { svg: "GFCI_Duplex_USA", w: 825, h: 1350, region: "USA" },
  "GFCI Duplex": { svg: "GFCI_Duplex_USA", w: 825, h: 1350, region: "USA" },
  "GFCI Duplex USA": { svg: "GFCI_Duplex_USA", w: 825, h: 1350, region: "USA" },
  "Standard_Duplex_USA": { svg: "Standard_Duplex_USA", w: 825, h: 1350, region: "USA" },
  "Standard Duplex": { svg: "Standard_Duplex_USA", w: 825, h: 1350, region: "USA" },
  "Standard Duplex USA": { svg: "Standard_Duplex_USA", w: 825, h: 1350, region: "USA" },
  "USB_Duplex_USA": { svg: "USB_Duplex_USA", w: 825, h: 1350, region: "USA" },
  "USB Duplex": { svg: "USB_Duplex_USA", w: 825, h: 1350, region: "USA" },
  "USB Duplex USA": { svg: "USB_Duplex_USA", w: 825, h: 1350, region: "USA" },
  "Single_Switch_USA": { svg: "Single_Switch_USA", w: 825, h: 1350, region: "USA" },
  "Single Switch": { svg: "Single_Switch_USA", w: 825, h: 1350, region: "USA" },
  "Single Switch USA": { svg: "Single_Switch_USA", w: 825, h: 1350, region: "USA" },
  "Double_Switch_USA": { svg: "Double_Switch_USA", w: 1350, h: 1350, region: "USA" },
  "Double Switch": { svg: "Double_Switch_USA", w: 1350, h: 1350, region: "USA" },
  "Double Switch USA": { svg: "Double_Switch_USA", w: 1350, h: 1350, region: "USA" },
  "Triple_Switch_USA": { svg: "Triple_Switch_USA", w: 1350, h: 825, region: "USA" },
  "Triple Switch": { svg: "Triple_Switch_USA", w: 1350, h: 825, region: "USA" },
  "Triple Switch USA": { svg: "Triple_Switch_USA", w: 1350, h: 825, region: "USA" },
  "Decora_Rocker_USA": { svg: "Decora_Rocker_USA", w: 825, h: 1350, region: "USA" },
  "Decora Rocker": { svg: "Decora_Rocker_USA", w: 825, h: 1350, region: "USA" },
  "Decora Outlet": { svg: "Decora_Rocker_USA", w: 825, h: 1350, region: "USA" },
  "Quad_Outlet_USA": { svg: "Quad_Outlet_USA", w: 1350, h: 1350, region: "USA" },
  "Quad Outlet": { svg: "Quad_Outlet_USA", w: 1350, h: 1350, region: "USA" },
  "Dimmer_Switch_USA": { svg: "Dimmer_Switch_USA", w: 825, h: 1350, region: "USA" },
  "Dimmer Switch": { svg: "Dimmer_Switch_USA", w: 825, h: 1350, region: "USA" },
  "AFCI_GFCI_Combo_USA": { svg: "AFCI_GFCI_Combo_USA", w: 825, h: 1350, region: "USA" },
  "Type_A_Mexico": { svg: "Type_A_Mexico", w: 825, h: 1350, region: "USA" },

  // 🇪🇺 EU
  "Schuko_EU": { svg: "Schuko_EU", w: 945, h: 945, region: "EU" },
  "Schuko EU": { svg: "Schuko_EU", w: 945, h: 945, region: "EU" },
  "Double_Schuko_EU": { svg: "Double_Schuko_EU", w: 1350, h: 945, region: "EU" },
  "Type_E_France": { svg: "Type_E_France", w: 945, h: 945, region: "EU" },
  "Single_Switch_EU": { svg: "Single_Switch_EU", w: 945, h: 945, region: "EU" },
  "Double_Switch_EU": { svg: "Double_Switch_EU", w: 1350, h: 945, region: "EU" },
  "Triple_Rocker_EU": { svg: "Triple_Rocker_EU", w: 1350, h: 945, region: "EU" },

  // 🇬🇧 UK
  "Type_G_UK": { svg: "Type_G_UK", w: 1016, h: 1016, region: "UK" },
  "Type G": { svg: "Type_G_UK", w: 1016, h: 1016, region: "UK" },
  "Type_G_Double_UK": { svg: "Type_G_Double_UK", w: 1350, h: 1016, region: "UK" },

  // 🌏 Asia
  "Type_I_Australia": { svg: "Type_I_Australia", w: 898, h: 1350, region: "Asia" },
  "Type I": { svg: "Type_I_Australia", w: 898, h: 1350, region: "Asia" },
  "Type_I_Double_AU": { svg: "Type_I_Double_AU", w: 1350, h: 1350, region: "Asia" },
  "Type_A_Japan_Single": { svg: "Type_A_Japan_Single", w: 825, h: 1350, region: "Asia" },
  "Type_B_Japan_Ground": { svg: "Type_B_Japan_Ground", w: 825, h: 1350, region: "Asia" },

  // 🌎 Others
  "Frame_55_Berker_EU": { svg: "Frame_55_Berker_EU", w: 650, h: 650, region: "Others" },
  "Swiss_Type_J": { svg: "Swiss_Type_J", w: 945, h: 945, region: "Others" },
  "Italian_Type_L": { svg: "Italian_Type_L", w: 945, h: 945, region: "Others" },
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

    // Buscar en el mapa
    let mapping = OUTLET_MAP[outletType] || OUTLET_MAP[outletType.trim()];

    // Si no hay mapeo y el nombre contiene guion bajo, intentar inferir
    if (!mapping && outletType.includes('_')) {
      // Inferir región por sufijo
      let region = 'USA';
      if (outletType.endsWith('_EU')) region = 'EU';
      else if (outletType.endsWith('_UK')) region = 'UK';
      else if (outletType.endsWith('_AU')) region = 'Asia';
      else if (outletType.endsWith('_JP')) region = 'Asia';
      mapping = { svg: outletType, w: 825, h: 1350, region };
    }

    if (!mapping) {
      return res.status(404).json({
        error: 'OUTLET_NOT_SUPPORTED',
        outlet_type_detected: outletType,
        action: 'NOTIFY_CUSTOMER_DELAY',
        customer_message: `We detected your outlet as "${outletType}". This specific model is not yet in our production database. Your order will be processed manually and may take 3-5 additional business days. We will notify you by email.`
      });
    }

    // Ruta dinámica con región
    const maskPath = path.join(process.cwd(), 'masks', mapping.region, `${mapping.svg}_${side}.svg`);

    if (!fs.existsSync(maskPath)) {
      return res.status(404).json({
        error: 'OUTLET_NOT_SUPPORTED',
        outlet_type_detected: outletType,
        svg_attempted: `${mapping.region}/${mapping.svg}_${side}.svg`,
        action: 'NOTIFY_CUSTOMER_DELAY',
        customer_message: `We detected your outlet as "${outletType}". This specific model is not yet in our production database. Your order will be processed manually and may take 3-5 additional business days. We will notify you by email.`
      });
    }

    const textureBuffer = Buffer.from(textureBase64, 'base64');

    const result = await sharp(textureBuffer)
      .resize(mapping.w, mapping.h, { fit: 'fill' })
      .composite([{ input: maskPath, blend: 'src-over' }])
      .png()
      .toBuffer();

    return res.status(200).json({
      imageBase64: result.toString('base64'),
      mimeType: 'image/png',
      outletType,
      svgUsed: `${mapping.region}/${mapping.svg}_${side}.svg`,
      side,
      dimensions: `${mapping.w}x${mapping.h}px (300 DPI)`,
      status: 'SUCCESS'
    });

  } catch (err) {
    console.error('Sharp error:', err);
    return res.status(500).json({ error: err.message });
  }
}
