import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Map from Gemini outlet_type to SVG filename
const OUTLET_MAP = {
  "GFCI Duplex": "GFCI_Duplex_USA",
  "GFCI Duplex USA": "GFCI_Duplex_USA",
  "Standard Duplex": "Standard_Duplex_USA",
  "Standard Duplex USA": "Standard_Duplex_USA",
  "USB Duplex": "USB_Duplex_USA",
  "USB-C Duplex": "USB_Duplex_USA",
  "USB Duplex USA": "USB_Duplex_USA",
  "Single Switch": "Single_Switch_USA",
  "Single Switch USA": "Single_Switch_USA",
  "Double Switch": "Double_Switch_USA",
  "Double Switch USA": "Double_Switch_USA",
  "Triple Switch": "Triple_Switch_USA",
  "Triple Switch USA": "Triple_Switch_USA",
  "Decora Rocker": "Decora_Rocker_USA",
  "Decora Outlet": "Decora_Rocker_USA",
  "Quad Outlet": "Quad_Outlet_USA",
  "Quad Outlet USA": "Quad_Outlet_USA",
  "Dimmer Switch": "Dimmer_Switch_USA",
  "Dimmer Switch USA": "Dimmer_Switch_USA",
  "Smart Outlet": "Standard_Duplex_USA",
  "Smart Switch": "Single_Switch_USA",
  "Floor Outlet": "Standard_Duplex_USA",
  "Schuko EU": "Schuko_EU",
  "Schuko Type F": "Schuko_EU",
  "Type F": "Schuko_EU",
  "French Type E": "Type_E_France",
  "Belgian Type E": "Type_E_France",
  "Type E": "Type_E_France",
  "Swiss Type J": "Swiss_Type_J",
  "Type J": "Swiss_Type_J",
  "Italian Type L": "Italian_Type_L",
  "Type L": "Italian_Type_L",
  "Single Switch EU": "Single_Switch_EU",
  "Double Switch EU": "Double_Switch_EU",
  "UK BS1363": "Type_G_UK",
  "Type G": "Type_G_UK",
  "British Standard": "Type_G_UK",
  "Single Switch UK": "Single_Switch_UK",
  "Australian AS/NZS": "Type_I_Australia",
  "Type I": "Type_I_Australia",
  "Brazilian ABNT": "Brazilian_ABNT",
  "Brazilian ABNT NBR": "Brazilian_ABNT",
  "Type N": "Brazilian_ABNT",
  "Type C": "Type_C_Asia",
  "Type C Asia": "Type_C_Asia",
  "Europlug": "Type_C_Asia",
  "Type B Japan": "Type_B_Japan_USA",
  "Type A": "Standard_Duplex_USA",
  "Type B": "Standard_Duplex_USA",
  "Unknown Wall Plate": null,
  "Switch Outlet Combo": "Standard_Duplex_USA",
  "3-Way Switch": "Single_Switch_USA",
  "4-Way Switch": "Single_Switch_USA",
  "Fan Switch": "Single_Switch_USA",
  "Ceiling Outlet": "Standard_Duplex_USA"
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
      return res.status(400).json({ error: 'Missing required fields: textureBase64, outletType, side' });
    }

    // Resolve SVG filename from outlet type
    const svgName = OUTLET_MAP[outletType] || OUTLET_MAP[outletType.trim()];
    
    // If outlet type not in map or explicitly null
    if (!svgName) {
      return res.status(404).json({
        error: 'OUTLET_NOT_SUPPORTED',
        message: `Outlet type "${outletType}" is not yet in our database.`,
        outlet_type_detected: outletType,
        action: 'NOTIFY_CUSTOMER_DELAY',
        customer_message: `We detected your outlet as "${outletType}". This specific model is not yet in our production database. Your order will be processed manually and may take 3-5 additional business days. We will notify you by email.`
      });
    }

    // Load SVG mask
    const maskPath = path.join(process.cwd(), 'masks', `${svgName}_${side}.svg`);
    
    // If SVG file not found
    if (!fs.existsSync(maskPath)) {
      return res.status(404).json({
        error: 'OUTLET_NOT_SUPPORTED',
        message: `SVG mask not found for "${outletType}" (mapped to ${svgName}).`,
        outlet_type_detected: outletType,
        svg_attempted: `${svgName}_${side}.svg`,
        action: 'NOTIFY_CUSTOMER_DELAY',
        customer_message: `We detected your outlet as "${outletType}". This specific model is not yet in our production database. Your order will be processed manually and may take 3-5 additional business days. We will notify you by email.`
      });
    }

    // Convert base64 texture to buffer
    const textureBuffer = Buffer.from(textureBase64, 'base64');

    // Compose: texture + SVG mask at 300 DPI (1350x825px)
    const result = await sharp(textureBuffer)
      .resize(1350, 825, { fit: 'fill' })
      .composite([{
        input: maskPath,
        blend: 'dest-in'
      }])
      .png()
      .toBuffer();

    return res.status(200).json({
      imageBase64: result.toString('base64'),
      mimeType: 'image/png',
      outletType,
      svgUsed: `${svgName}_${side}.svg`,
      side,
      dimensions: '1350x825px (300 DPI)',
      status: 'SUCCESS'
    });

  } catch (err) {
    console.error('Sharp error:', err);
    return res.status(500).json({ error: err.message });
  }
}
