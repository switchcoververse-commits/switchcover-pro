const fs = require('fs');
const path = require('path');

const MM = 11.811;

// Portrait canvas for vertical outlets, landscape for horizontal
const outlets = [
  // USA Portrait (70x114mm) — canvas 825x1350px
  { id: 'GFCI_Duplex_USA', w: 70, h: 114, border: 5, canvas_w: 825, canvas_h: 1350,
    openings: [
      { x: 15, y: 18, w: 14, h: 20, r: 3, label: 'slot_top_left' },
      { x: 41, y: 18, w: 14, h: 20, r: 3, label: 'slot_top_right' },
      { x: 28, y: 42, w: 10, h: 10, r: 5, label: 'ground_top' },
      { x: 20, y: 57, w: 30, h: 12, r: 2, label: 'reset_btn' },
      { x: 20, y: 72, w: 30, h: 12, r: 2, label: 'test_btn' },
      { x: 15, y: 88, w: 14, h: 20, r: 3, label: 'slot_bot_left' },
      { x: 41, y: 88, w: 14, h: 20, r: 3, label: 'slot_bot_right' },
      { x: 28, y: 110, w: 10, h: 10, r: 5, label: 'ground_bot' },
    ],
    screws: [{ x: 35, y: 5, r: 3 }, { x: 35, y: 109, r: 3 }]
  },
  { id: 'Standard_Duplex_USA', w: 70, h: 114, border: 5, canvas_w: 825, canvas_h: 1350,
    openings: [
      { x: 15, y: 20, w: 14, h: 20, r: 3 },
      { x: 41, y: 20, w: 14, h: 20, r: 3 },
      { x: 28, y: 44, w: 10, h: 10, r: 5 },
      { x: 15, y: 72, w: 14, h: 20, r: 3 },
      { x: 41, y: 72, w: 14, h: 20, r: 3 },
      { x: 28, y: 96, w: 10, h: 10, r: 5 },
    ],
    screws: [{ x: 35, y: 5, r: 3 }, { x: 35, y: 109, r: 3 }]
  },
  { id: 'USB_Duplex_USA', w: 70, h: 114, border: 5, canvas_w: 825, canvas_h: 1350,
    openings: [
      { x: 15, y: 14, w: 14, h: 20, r: 3 },
      { x: 41, y: 14, w: 14, h: 20, r: 3 },
      { x: 28, y: 38, w: 10, h: 10, r: 5 },
      { x: 18, y: 52, w: 15, h: 7, r: 2 },
      { x: 37, y: 52, w: 15, h: 7, r: 2 },
      { x: 15, y: 70, w: 14, h: 20, r: 3 },
      { x: 41, y: 70, w: 14, h: 20, r: 3 },
      { x: 28, y: 94, w: 10, h: 10, r: 5 },
    ],
    screws: [{ x: 35, y: 5, r: 3 }, { x: 35, y: 109, r: 3 }]
  },
  { id: 'Single_Switch_USA', w: 70, h: 114, border: 5, canvas_w: 825, canvas_h: 1350,
    openings: [
      { x: 14, y: 38, w: 42, h: 38, r: 3 },
    ],
    screws: [{ x: 35, y: 5, r: 3 }, { x: 35, y: 109, r: 3 }]
  },
  { id: 'Decora_Rocker_USA', w: 70, h: 114, border: 5, canvas_w: 825, canvas_h: 1350,
    openings: [
      { x: 12, y: 22, w: 46, h: 70, r: 4 },
    ],
    screws: [{ x: 35, y: 5, r: 3 }, { x: 35, y: 109, r: 3 }]
  },
  { id: 'Dimmer_Switch_USA', w: 70, h: 114, border: 5, canvas_w: 825, canvas_h: 1350,
    openings: [
      { x: 12, y: 22, w: 46, h: 55, r: 4 },
      { x: 22, y: 85, w: 26, h: 10, r: 2 },
    ],
    screws: [{ x: 35, y: 5, r: 3 }, { x: 35, y: 109, r: 3 }]
  },
  // USA Landscape Double/Triple (114x114mm) — canvas 1350x1350px
  { id: 'Double_Switch_USA', w: 114, h: 114, border: 5, canvas_w: 1350, canvas_h: 1350,
    openings: [
      { x: 12, y: 38, w: 42, h: 38, r: 3 },
      { x: 60, y: 38, w: 42, h: 38, r: 3 },
    ],
    screws: [{ x: 57, y: 5, r: 3 }, { x: 57, y: 109, r: 3 }]
  },
  { id: 'Triple_Switch_USA', w: 158, h: 114, border: 5, canvas_w: 1350, canvas_h: 825,
    openings: [
      { x: 8,  y: 38, w: 42, h: 38, r: 3 },
      { x: 58, y: 38, w: 42, h: 38, r: 3 },
      { x: 108,y: 38, w: 42, h: 38, r: 3 },
    ],
    screws: [{ x: 79, y: 5, r: 3 }, { x: 79, y: 109, r: 3 }]
  },
  { id: 'Quad_Outlet_USA', w: 114, h: 114, border: 5, canvas_w: 1350, canvas_h: 1350,
    openings: [
      { x: 8,  y: 14, w: 14, h: 20, r: 3 },
      { x: 26, y: 14, w: 14, h: 20, r: 3 },
      { x: 17, y: 38, w: 10, h: 10, r: 5 },
      { x: 76, y: 14, w: 14, h: 20, r: 3 },
      { x: 94, y: 14, w: 14, h: 20, r: 3 },
      { x: 85, y: 38, w: 10, h: 10, r: 5 },
      { x: 8,  y: 72, w: 14, h: 20, r: 3 },
      { x: 26, y: 72, w: 14, h: 20, r: 3 },
      { x: 17, y: 96, w: 10, h: 10, r: 5 },
      { x: 76, y: 72, w: 14, h: 20, r: 3 },
      { x: 94, y: 72, w: 14, h: 20, r: 3 },
      { x: 85, y: 96, w: 10, h: 10, r: 5 },
    ],
    screws: [{ x: 57, y: 5, r: 3 }, { x: 57, y: 109, r: 3 }]
  },
  // EU Square (80x80mm) — canvas 945x945px
  { id: 'Schuko_EU', w: 80, h: 80, border: 5, canvas_w: 945, canvas_h: 945,
    openings: [
      { type: 'circle', cx: 40, cy: 40, r: 22 },
      { type: 'circle', cx: 14, cy: 40, r: 4 },
      { type: 'circle', cx: 66, cy: 40, r: 4 },
    ],
    screws: [{ x: 40, y: 5, r: 2.5 }, { x: 40, y: 75, r: 2.5 }]
  },
  { id: 'Type_E_France', w: 80, h: 80, border: 5, canvas_w: 945, canvas_h: 945,
    openings: [
      { type: 'circle', cx: 40, cy: 40, r: 22 },
      { type: 'circle', cx: 40, cy: 16, r: 4 },
    ],
    screws: [{ x: 40, y: 5, r: 2.5 }, { x: 40, y: 75, r: 2.5 }]
  },
  { id: 'Single_Switch_EU', w: 80, h: 80, border: 5, canvas_w: 945, canvas_h: 945,
    openings: [
      { x: 15, y: 15, w: 50, h: 50, r: 4 },
    ],
    screws: [{ x: 40, y: 5, r: 2.5 }, { x: 40, y: 75, r: 2.5 }]
  },
  { id: 'Double_Switch_EU', w: 140, h: 80, border: 5, canvas_w: 1350, canvas_h: 945,
    openings: [
      { x: 10, y: 15, w: 50, h: 50, r: 4 },
      { x: 80, y: 15, w: 50, h: 50, r: 4 },
    ],
    screws: [{ x: 70, y: 5, r: 2.5 }, { x: 70, y: 75, r: 2.5 }]
  },
  { id: 'Swiss_Type_J', w: 80, h: 80, border: 5, canvas_w: 945, canvas_h: 945,
    openings: [
      { type: 'circle', cx: 40, cy: 20, r: 4.5 },
      { type: 'circle', cx: 24, cy: 52, r: 4.5 },
      { type: 'circle', cx: 56, cy: 52, r: 4.5 },
    ],
    screws: [{ x: 40, y: 5, r: 2.5 }, { x: 40, y: 75, r: 2.5 }]
  },
  { id: 'Italian_Type_L', w: 80, h: 80, border: 5, canvas_w: 945, canvas_h: 945,
    openings: [
      { type: 'circle', cx: 24, cy: 40, r: 4.5 },
      { type: 'circle', cx: 40, cy: 40, r: 4.5 },
      { type: 'circle', cx: 56, cy: 40, r: 4.5 },
    ],
    screws: [{ x: 40, y: 5, r: 2.5 }, { x: 40, y: 75, r: 2.5 }]
  },
  // UK (86x86mm) — canvas 1016x1016px
  { id: 'Type_G_UK', w: 86, h: 86, border: 5, canvas_w: 1016, canvas_h: 1016,
    openings: [
      { x: 33, y: 12, w: 20, h: 10, r: 2 },
      { x: 12, y: 55, w: 12, h: 20, r: 2 },
      { x: 62, y: 55, w: 12, h: 20, r: 2 },
    ],
    screws: [{ x: 43, y: 5, r: 2.5 }, { x: 43, y: 81, r: 2.5 }]
  },
  { id: 'Single_Switch_UK', w: 86, h: 86, border: 5, canvas_w: 1016, canvas_h: 1016,
    openings: [
      { x: 20, y: 25, w: 46, h: 36, r: 3 },
    ],
    screws: [{ x: 43, y: 5, r: 2.5 }, { x: 43, y: 81, r: 2.5 }]
  },
  // Australia (76x114mm portrait) — canvas 898x1350px
  { id: 'Type_I_Australia', w: 76, h: 114, border: 5, canvas_w: 898, canvas_h: 1350,
    openings: [
      { x: 22, y: 22, w: 10, h: 20, r: 2 },
      { x: 44, y: 22, w: 10, h: 20, r: 2 },
      { type: 'circle', cx: 38, cy: 50, r: 5 },
      { x: 22, y: 66, w: 10, h: 20, r: 2 },
      { x: 44, y: 66, w: 10, h: 20, r: 2 },
      { type: 'circle', cx: 38, cy: 94, r: 5 },
    ],
    screws: [{ x: 38, y: 5, r: 2.5 }, { x: 38, y: 109, r: 2.5 }]
  },
  // Brazil (80x80mm) — canvas 945x945px
  { id: 'Brazilian_ABNT', w: 80, h: 80, border: 5, canvas_w: 945, canvas_h: 945,
    openings: [
      { type: 'circle', cx: 40, cy: 22, r: 5.5 },
      { type: 'circle', cx: 24, cy: 54, r: 4.5 },
      { type: 'circle', cx: 56, cy: 54, r: 4.5 },
    ],
    screws: [{ x: 40, y: 5, r: 2.5 }, { x: 40, y: 75, r: 2.5 }]
  },
  // Asia Type C (80x80mm) — canvas 945x945px
  { id: 'Type_C_Asia', w: 80, h: 80, border: 5, canvas_w: 945, canvas_h: 945,
    openings: [
      { type: 'circle', cx: 30, cy: 40, r: 4.5 },
      { type: 'circle', cx: 50, cy: 40, r: 4.5 },
    ],
    screws: [{ x: 40, y: 5, r: 2.5 }, { x: 40, y: 75, r: 2.5 }]
  },
  // Japan Type B (70x114mm portrait) — canvas 825x1350px
  { id: 'Type_B_Japan_USA', w: 70, h: 114, border: 5, canvas_w: 825, canvas_h: 1350,
    openings: [
      { x: 18, y: 18, w: 8, h: 18, r: 2 },
      { x: 44, y: 18, w: 8, h: 18, r: 2 },
      { x: 18, y: 78, w: 8, h: 18, r: 2 },
      { x: 44, y: 78, w: 8, h: 18, r: 2 },
    ],
    screws: [{ x: 35, y: 5, r: 2.5 }, { x: 35, y: 109, r: 2.5 }]
  },
];

function mmToPx(mm) { return mm * MM; }

function generateFrontSVG(o) {
  const pw = mmToPx(o.w);
  const ph = mmToPx(o.h);
  const border = mmToPx(o.border);
  const sw = pw + border * 2;
  const sh = ph + border * 2;
  const W = o.canvas_w;
  const H = o.canvas_h;
  const offsetX = (W - sw) / 2;
  const offsetY = (H - sh) / 2;

  let openingsSVG = '';
  (o.openings || []).forEach(op => {
    if (op.type === 'circle') {
      const cx = offsetX + border + mmToPx(op.cx);
      const cy = offsetY + border + mmToPx(op.cy);
      const r = mmToPx(op.r);
      openingsSVG += `  <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="black"/>\n`;
    } else {
      const x = offsetX + border + mmToPx(op.x);
      const y = offsetY + border + mmToPx(op.y);
      const w = mmToPx(op.w);
      const h = mmToPx(op.h);
      openingsSVG += `  <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${op.r||0}" fill="black"/>\n`;
    }
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <!-- CamoPro FRONT mask: ${o.id} | ${o.w}x${o.h}mm + ${o.border}mm border | Canvas: ${W}x${H}px 300DPI -->
  <rect width="${W}" height="${H}" fill="black"/>
  <rect x="${offsetX.toFixed(1)}" y="${offsetY.toFixed(1)}" width="${sw.toFixed(1)}" height="${sh.toFixed(1)}" rx="12" ry="12" fill="white"/>
${openingsSVG}</svg>`;
}

function generateBackSVG(o) {
  const pw = mmToPx(o.w);
  const ph = mmToPx(o.h);
  const border = mmToPx(o.border);
  const sw = pw + border * 2;
  const sh = ph + border * 2;
  const W = o.canvas_w;
  const H = o.canvas_h;
  const offsetX = (W - sw) / 2;
  const offsetY = (H - sh) / 2;
  const foldX = offsetX + border;
  const foldY = offsetY + border;

  let screwSVG = '';
  (o.screws || []).forEach(s => {
    const cx = offsetX + border + mmToPx(s.x);
    const cy = offsetY + border + mmToPx(s.y);
    const r = mmToPx(s.r) + 4;
    screwSVG += `  <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="#666" stroke-width="1.5" stroke-dasharray="3,2"/>\n`;
    screwSVG += `  <line x1="${(cx-r-3).toFixed(1)}" y1="${cy.toFixed(1)}" x2="${(cx+r+3).toFixed(1)}" y2="${cy.toFixed(1)}" stroke="#666" stroke-width="1"/>\n`;
    screwSVG += `  <line x1="${cx.toFixed(1)}" y1="${(cy-r-3).toFixed(1)}" x2="${cx.toFixed(1)}" y2="${(cy+r+3).toFixed(1)}" stroke="#666" stroke-width="1"/>\n`;
  });

  let openingMarkers = '';
  (o.openings || []).forEach(op => {
    if (op.type === 'circle') {
      const cx = offsetX + border + mmToPx(op.cx);
      const cy = offsetY + border + mmToPx(op.cy);
      const r = mmToPx(op.r);
      openingMarkers += `  <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="#e8e8e8" stroke="#999" stroke-width="1"/>\n`;
    } else {
      const x = offsetX + border + mmToPx(op.x);
      const y = offsetY + border + mmToPx(op.y);
      const w = mmToPx(op.w);
      const h = mmToPx(op.h);
      openingMarkers += `  <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${op.r||0}" fill="#e8e8e8" stroke="#999" stroke-width="1"/>\n`;
    }
  });

  const cx = offsetX + sw/2;
  const instrX = offsetX + 15;
  const instrY = offsetY + border + ph * 0.15;
  const lineH = Math.min(ph * 0.1, 20);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <!-- CamoPro BACK: ${o.id} | Canvas: ${W}x${H}px 300DPI -->
  <rect width="${W}" height="${H}" fill="white"/>
  <rect x="${offsetX.toFixed(1)}" y="${offsetY.toFixed(1)}" width="${sw.toFixed(1)}" height="${sh.toFixed(1)}" rx="12" ry="12" fill="white" stroke="#333" stroke-width="2"/>
  <rect x="${foldX.toFixed(1)}" y="${foldY.toFixed(1)}" width="${pw.toFixed(1)}" height="${ph.toFixed(1)}" rx="8" ry="8" fill="none" stroke="#333" stroke-width="1.5" stroke-dasharray="8,4"/>
  <text x="${(foldX+pw/2).toFixed(1)}" y="${(foldY-6).toFixed(1)}" font-family="Arial" font-size="9" fill="#555" text-anchor="middle">FOLD LINE</text>
  <text x="${(foldX+pw/2).toFixed(1)}" y="${(foldY+ph+14).toFixed(1)}" font-family="Arial" font-size="9" fill="#555" text-anchor="middle">FOLD LINE</text>
  <text x="${(foldX-6).toFixed(1)}" y="${(foldY+ph/2).toFixed(1)}" font-family="Arial" font-size="9" fill="#555" text-anchor="middle" transform="rotate(-90,${(foldX-6).toFixed(1)},${(foldY+ph/2).toFixed(1)})">FOLD LINE</text>
  <text x="${(foldX+pw+14).toFixed(1)}" y="${(foldY+ph/2).toFixed(1)}" font-family="Arial" font-size="9" fill="#555" text-anchor="middle" transform="rotate(90,${(foldX+pw+14).toFixed(1)},${(foldY+ph/2).toFixed(1)})">FOLD LINE</text>
${openingMarkers}
${screwSVG}
  <text x="${cx.toFixed(1)}" y="${(offsetY+20).toFixed(1)}" font-family="Arial" font-size="14" font-weight="bold" fill="#222" text-anchor="middle">CamoPro Sticker</text>
  <text x="${cx.toFixed(1)}" y="${(offsetY+35).toFixed(1)}" font-family="Arial" font-size="9" fill="#666" text-anchor="middle">${o.id.replace(/_/g,' ')}</text>
  <text x="${instrX.toFixed(1)}" y="${instrY.toFixed(1)}" font-family="Arial" font-size="10" font-weight="bold" fill="#333">Installation:</text>
  <text x="${instrX.toFixed(1)}" y="${(instrY+lineH).toFixed(1)}" font-family="Arial" font-size="9" fill="#444">1. Clean plate surface</text>
  <text x="${instrX.toFixed(1)}" y="${(instrY+lineH*2).toFixed(1)}" font-family="Arial" font-size="9" fill="#444">2. Peel backing paper</text>
  <text x="${instrX.toFixed(1)}" y="${(instrY+lineH*3).toFixed(1)}" font-family="Arial" font-size="9" fill="#444">3. Align with plate edges</text>
  <text x="${instrX.toFixed(1)}" y="${(instrY+lineH*4).toFixed(1)}" font-family="Arial" font-size="9" fill="#444">4. Press firmly from center</text>
  <text x="${instrX.toFixed(1)}" y="${(instrY+lineH*5).toFixed(1)}" font-family="Arial" font-size="9" fill="#444">5. Fold border edges around plate</text>
  <text x="${cx.toFixed(1)}" y="${(offsetY+sh-18).toFixed(1)}" font-family="Arial" font-size="8" fill="#cc0000" text-anchor="middle">Do not cover live electrical contacts</text>
  <text x="${cx.toFixed(1)}" y="${(offsetY+sh-6).toFixed(1)}" font-family="Arial" font-size="7" fill="#999" text-anchor="middle">${o.w}x${o.h}mm + ${o.border}mm border</text>
</svg>`;
}

outlets.forEach(o => {
  fs.writeFileSync(`/workspaces/switchcover-pro/masks/${o.id}_front.svg`, generateFrontSVG(o));
  fs.writeFileSync(`/workspaces/switchcover-pro/masks/${o.id}_back.svg`, generateBackSVG(o));
  console.log(`✅ ${o.id} — canvas: ${o.canvas_w}x${o.canvas_h}px`);
});
console.log('Done!');
