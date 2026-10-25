// ============================================================================
// SVG Export Module
// Converts Excalidraw scene elements into standalone, scalable vector XML markup.
// Reference: packages/excalidraw/scene/export.ts in Excalidraw
// ============================================================================

import { getSceneBounds } from './export-png.js';
import { getFontFamilyName } from '../drawing/text.js';

// Escapes special characters for XML/SVG safety.
function escapeXml(unsafe) {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Converts a single Excalidraw element to its corresponding SVG markup string.
function elementToSvgTag(element, originX, originY) {
  if (!element || element.isDeleted) return '';

  const x = element.x - originX;
  const y = element.y - originY;
  const stroke = element.strokeColor || '#1e1e24';
  const fill = element.backgroundColor && element.backgroundColor !== 'transparent' ? element.backgroundColor : 'none';
  const strokeWidth = element.strokeWidth || 2;
  const opacity = typeof element.opacity === 'number' ? element.opacity / 100 : 1;

  let dashArrayAttr = '';
  if (element.strokeStyle === 'dashed') {
    dashArrayAttr = 'stroke-dasharray="8 8"';
  } else if (element.strokeStyle === 'dotted') {
    dashArrayAttr = 'stroke-dasharray="3 4"';
  }

  let transformAttr = '';
  if (element.angle && element.angle !== 0) {
    const cx = x + element.width / 2;
    const cy = y + element.height / 2;
    const deg = (element.angle * 180) / Math.PI;
    transformAttr = `transform="rotate(${deg} ${cx} ${cy})"`;
  }

  const commonAttrs = `stroke="${escapeXml(stroke)}" fill="${escapeXml(fill)}" stroke-width="${strokeWidth}" opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round" ${dashArrayAttr} ${transformAttr}`.trim();

  switch (element.type) {
    case 'rectangle': {
      const rx = 6;
      return `<rect x="${x}" y="${y}" width="${element.width}" height="${element.height}" rx="${rx}" ${commonAttrs} />`;
    }

    case 'ellipse': {
      const cx = x + element.width / 2;
      const cy = y + element.height / 2;
      const rx = Math.abs(element.width) / 2;
      const ry = Math.abs(element.height) / 2;
      return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${commonAttrs} />`;
    }

    case 'diamond': {
      const cx = x + element.width / 2;
      const cy = y + element.height / 2;
      const p1 = `${cx},${y}`;
      const p2 = `${x + element.width},${cy}`;
      const p3 = `${cx},${y + element.height}`;
      const p4 = `${x},${cy}`;
      return `<polygon points="${p1} ${p2} ${p3} ${p4}" ${commonAttrs} />`;
    }

    case 'line': {
      if (Array.isArray(element.points) && element.points.length >= 2) {
        const pointsStr = element.points.map(([px, py]) => `${x + px},${y + py}`).join(' ');
        return `<polyline points="${pointsStr}" ${commonAttrs} fill="none" />`;
      }
      return `<line x1="${x}" y1="${y}" x2="${x + element.width}" y2="${y + element.height}" ${commonAttrs} />`;
    }

    case 'arrow': {
      const p1x = x;
      const p1y = y;
      const p2x = x + element.width;
      const p2y = y + element.height;

      // Calculate arrowhead tip
      const angle = Math.atan2(element.height, element.width);
      const arrowLen = Math.min(20, Math.max(12, strokeWidth * 6));
      const tip1X = p2x - arrowLen * Math.cos(angle - Math.PI / 6);
      const tip1Y = p2y - arrowLen * Math.sin(angle - Math.PI / 6);
      const tip2X = p2x - arrowLen * Math.cos(angle + Math.PI / 6);
      const tip2Y = p2y - arrowLen * Math.sin(angle + Math.PI / 6);

      return `
        <g ${transformAttr}>
          <line x1="${p1x}" y1="${p1y}" x2="${p2x}" y2="${p2y}" stroke="${escapeXml(stroke)}" stroke-width="${strokeWidth}" stroke-linecap="round" opacity="${opacity}" ${dashArrayAttr} />
          <polygon points="${p2x},${p2y} ${tip1X},${tip1Y} ${tip2X},${tip2Y}" fill="${escapeXml(stroke)}" stroke="${escapeXml(stroke)}" stroke-width="1" opacity="${opacity}" />
        </g>
      `.trim();
    }

    case 'freedraw': {
      if (!Array.isArray(element.points) || element.points.length === 0) return '';
      if (element.points.length === 1) {
        const [px, py] = element.points[0];
        return `<circle cx="${x + px}" cy="${y + py}" r="${strokeWidth}" fill="${escapeXml(stroke)}" opacity="${opacity}" />`;
      }

      let d = `M ${x + element.points[0][0]} ${y + element.points[0][1]}`;
      for (let i = 1; i < element.points.length - 1; i++) {
        const midX = (element.points[i][0] + element.points[i + 1][0]) / 2;
        const midY = (element.points[i][1] + element.points[i + 1][1]) / 2;
        d += ` Q ${x + element.points[i][0]} ${y + element.points[i][1]}, ${x + midX} ${y + midY}`;
      }
      const lastPt = element.points[element.points.length - 1];
      d += ` L ${x + lastPt[0]} ${y + lastPt[1]}`;

      return `<path d="${d}" stroke="${escapeXml(stroke)}" fill="none" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}" />`;
    }

    case 'text': {
      const lines = (element.text || '').split('\n');
      const fontSize = element.fontSize || 20;
      const fontFamilyCss = getFontFamilyName(element.fontFamily || 1);
      const lineHeightMultiplier = element.lineHeight || 1.25;
      const lineHeightPx = fontSize * lineHeightMultiplier;

      const tspans = lines.map((line, idx) => {
        const dy = idx === 0 ? fontSize * 0.85 : lineHeightPx;
        return `<tspan x="${x}" dy="${dy}">${escapeXml(line)}</tspan>`;
      }).join('');

      return `<text x="${x}" y="${y}" font-family="${escapeXml(fontFamilyCss)}" font-size="${fontSize}" fill="${escapeXml(stroke)}" opacity="${opacity}" ${transformAttr}>${tspans}</text>`;
    }

    default:
      return `<rect x="${x}" y="${y}" width="${element.width}" height="${element.height}" ${commonAttrs} />`;
  }
}

// Converts elements to a complete, standalone SVG document string.
export function exportToSvgString(elements, options = {}) {
  const {
    withBackground = true,
    backgroundColor = '#ffffff',
    padding = 30
  } = options;

  const validElements = elements.filter(el => !el.isDeleted);
  const bounds = getSceneBounds(validElements, padding);

  let bgRect = '';
  if (withBackground && backgroundColor && backgroundColor !== 'transparent') {
    bgRect = `<rect width="${bounds.width}" height="${bounds.height}" fill="${escapeXml(backgroundColor)}" />`;
  }

  const elementsSvg = validElements
    .map(el => elementToSvgTag(el, bounds.minX, bounds.minY))
    .join('\n  ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 ${bounds.width} ${bounds.height}" width="${bounds.width}" height="${bounds.height}"
  xmlns="http://www.w3.org/2000/svg"
  version="1.1">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&amp;family=Inter:wght@400;500;600;700&amp;display=swap');
    </style>
  </defs>
  ${bgRect}
  ${elementsSvg}
</svg>`;
}

// Triggers a browser download of the scene rendered as an SVG file.
export function downloadSvg(elements, options = {}, filename = 'drawing.svg') {
  const svgString = exportToSvgString(elements, options);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const downloadLink = document.createElement('a');
  downloadLink.download = filename.endsWith('.svg') ? filename : `${filename}.svg`;
  downloadLink.href = url;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
