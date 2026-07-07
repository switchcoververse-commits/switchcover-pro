import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const OUTLET_MAP = {
  "GFCI Duplex": { svg: "GFCI_Duplex_USA", w: 825, h: 1350 },
  "GFCI Duplex USA": { svg: "GFCI_Duplex_USA", w: 825, h: 1350 },
  "Standard Duplex": { svg: "Standard_Duplex_USA", w: 825, h: 1350 },
  "Standard Duplex USA": { svg: "Standard_Duplex_USA", w: 825, h: 1350 },
  "USB Duplex": { svg: "USB_Duplex_USA", w: 825, h: 1350 },
  "USB-C Duplex": { svg: "USB_Duplex_USA", w: 825, h: 1350 },
  "Single Switch": { svg: "Single_Switch_USA", w: 825, h: 1350 },
  "Single Switch USA": { svg: "Single_Switch_USA", w: 825, h: 1350 },
  "Double Switch": { svg: "Double_Switch_USA", w: 1350, h: 1350 },
  "Double Switch USA": { svg: "Double_Switch_USA", w: 1350, h: 1350 },
  "Triple Switch": { svg: "Triple_Switch_USA", w: 1350, h: 825 },
  "Triple Switch USA": { svg: "Triple_Switch_USA", w: 1350, h: 825 },
  "Decora Rocker": { svg: "Decora_Rocker_USA", w: 825, h: 1350 },
  "Decora Outlet": { svg: "Decora_Rocker_USA", w: 825, h: 1350 },
  "Quad Outlet": { svg: "Quad_Outlet_USA", w: 1350, h: 1350 },
  "Dimmer Switch": { svg: "Dimmer_Switch_USA", w: 825, h: 1350 },
  "Smart Outlet": { svg: "Standard_Duplex_USA", w: 825, h: 1350 },
  "Smart Switch": { svg: "Single_Switch_USA", w: 825, h: 1350 },
  "3-Way Switch": { svg: "Single_Switch_USA", w: 825, h: 1350 },
  "4-Way Switch": { svg: "Single_Switch_USA", w: 825, h: 1350 },
  "Fan Switch": { svg: "Single_Switch_USA", w: 825, h: 1350 },
  "Switch Outlet Combo": { svg: "Standard_Duplex_USA", w: 825, h: 1350 },
  "Floor Outlet": { svg: "Standard_Duplex_USA", w: 825, h: 1350 },
  "Schuko EU": { svg: "Schuko_EU", w: 945, h: 945 },
  "Schuko Type F": { svg: "Schuko_EU", w: 945, h: 945 },
  "Type F": { svg: "Schuko_EU", w: 945, h: 945 },
  "French Type E": { svg: "Type_E_France", w: 945, h: 945 },
  "Belgian Type E": { svg: "Type_E_France", w: 945, h: 945 },
  "Type E": { svg: "Type_E_France", w: 945, h: 945 },
  "Single Switch EU": { svg: "Single_Switch_EU", w: 945, h: 945 },
  "Double Switch EU": { svg: "Double_Switch_EU", w: 1350, h: 945 },
  "Swiss Type J": { svg: "Swiss_Type_J", w: 945, h: 945 },
  "Type J": { svg: "Swiss_Type_J", w: 945, h: 945 },
  "Italian Type L": { svg: "Italian_Type_L", w: 945, h: 945 },
  "Type L": { svg: "Italian_Type_L", w: 945, h: 945 },
  "UK BS1363": { svg: "Type_G_UK", w: 1016, h: 1016 },
  "Type G": { svg: "Type_G_UK", w: 1016, h: 1016 },
  "Single Switch UK": { svg: "Single_Switch_UK", w: 1016, h: 1016 },
  "Australian AS/NZS": { svg: "Type_I_Australia", w: 898, h: 1350 },
  "Type I": { svg: "Type_I_Australia", w: 898, h: 1350 },
  "Brazilian ABNT": { svg: "Brazilian_ABNT", w: 945, h: 945 },
  "Brazilian ABNT NBR": { svg: "Brazilian_ABNT", w: 945, h: 945 },
  "Type N": { svg: "Brazilian_ABNT", w: 945, h: 945 },
  "Type C": { svg: "Type_C_Asia", w: 945, h: 945 },
  "Type C Asia": { svg: "Type_C_Asia", w: 945, h: 945 },
  "Type B Japan": { svg: "Type_B_Japan_USA", w: 825, h: 1350 },
  "Type A": { svg: "Standard_Duplex_USA", w: 825, h: 1350 },
  "Type B": { svg: "Standard_Duplex_USA", w: 825, h: 1350 },
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

    const mapping = OUTLET_MAP[outletType] || OUTLET_MAP[outletType.trim()];

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
