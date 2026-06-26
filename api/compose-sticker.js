import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

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

    // Load SVG mask
    const maskPath = path.join(process.cwd(), 'masks', `${outletType}_${side}.svg`);
    
    if (!fs.existsSync(maskPath)) {
      return res.status(404).json({ error: `SVG mask not found: ${outletType}_${side}.svg` });
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
      side,
      dimensions: '1350x825px (300 DPI)'
    });

  } catch (err) {
    console.error('Sharp error:', err);
    return res.status(500).json({ error: err.message });
  }
}
