export type ComprobanteLinea = {
  label: string;
  value: string | number | null | undefined;
};

const preciosPorEspecialidad: Record<string, number> = {
  cardiologia: 80,
  dermatologia: 70,
  pediatria: 65,
  ginecologia: 75,
  traumatologia: 75,
  odontologia: 60,
  neurologia: 90,
  oftalmologia: 70,
  'medicina general': 50,
};

export function precioPorEspecialidad(especialidad: string | null | undefined, precio?: number | null): number {
  if (typeof precio === 'number' && Number.isFinite(precio)) {
    return precio;
  }
  const clave = normalizar(especialidad || '');
  return preciosPorEspecialidad[clave] || 60;
}

export function formatoMoneda(monto: number): string {
  return `S/ ${monto.toFixed(2)}`;
}

export function descargarComprobantePdf(
  titulo: string,
  subtitulo: string,
  lineas: ComprobanteLinea[],
  nombreArchivo: string
): void {
  const pdf = crearPdf(titulo, subtitulo, lineas);
  const buffer = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
  const blob = new Blob([buffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreArchivo.endsWith('.pdf') ? nombreArchivo : `${nombreArchivo}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

function crearPdf(titulo: string, subtitulo: string, lineas: ComprobanteLinea[]): Uint8Array {
  const comandos: string[] = [
    '0.23 0.63 0.85 rg 0 760 595 82 re f',
    '0.61 0.84 0.36 rg 0 748 595 12 re f',
    texto(48, 800, 22, 'CHORRILLOS SALUD', 'F2', '1 1 1 rg'),
    texto(48, 778, 13, 'Red municipal - salud para todos', 'F1', '1 1 1 rg'),
    texto(48, 708, 24, titulo, 'F2', '0.08 0.16 0.24 rg'),
    texto(48, 682, 14, subtitulo, 'F1', '0.29 0.36 0.45 rg'),
    '0.90 0.94 0.97 rg 48 646 499 1 re f',
  ];

  let y = 612;
  lineas.forEach((linea, index) => {
    if (index % 2 === 0) {
      comandos.push('0.97 0.99 1 rg 42 ' + (y - 8) + ' 511 28 re f');
    }
    comandos.push(texto(58, y, 10, limpiarPdf(String(linea.label)).toUpperCase(), 'F2', '0.39 0.46 0.55 rg'));
    comandos.push(texto(230, y, 12, String(linea.value ?? '-'), 'F1', '0.07 0.10 0.15 rg'));
    y -= 30;
  });

  comandos.push('0.90 0.94 0.97 rg 48 92 499 1 re f');
  comandos.push(texto(48, 64, 10, `Generado: ${new Date().toLocaleString()}`, 'F1', '0.39 0.46 0.55 rg'));
  comandos.push(texto(360, 64, 10, 'Comprobante demo generado por el sistema', 'F1', '0.39 0.46 0.55 rg'));

  const contenido = comandos.join('\n');

  const objetos = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 6 0 R >> >> /Contents 5 0 R >> endobj\n',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n',
    `5 0 obj << /Length ${contenido.length} >> stream\n${contenido}\nendstream endobj\n`,
    '6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj\n',
  ];

  let salida = '%PDF-1.4\n';
  const offsets = [0];
  objetos.forEach((objeto) => {
    offsets.push(salida.length);
    salida += objeto;
  });

  const xrefOffset = salida.length;
  salida += `xref\n0 ${objetos.length + 1}\n`;
  salida += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    salida += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  salida += `trailer << /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(salida);
}

function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function sanitizar(valor: string): string {
  return limpiarPdf(valor).toLowerCase()
    .replace(/\s+/g, ' ');
}

function limpiarPdf(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 .,:#*/\-_()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escaparPdf(valor: string): string {
  return valor.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function texto(x: number, y: number, size: number, value: string, font: 'F1' | 'F2', color: string): string {
  return `${color} BT /${font} ${size} Tf ${x} ${y} Td (${escaparPdf(limpiarPdf(value))}) Tj ET`;
}
