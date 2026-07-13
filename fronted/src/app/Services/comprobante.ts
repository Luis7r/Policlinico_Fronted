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

export function precioPorEspecialidad(especialidad: string | null | undefined): number {
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
  const contenido = [
    'CHORRILLOS SALUD',
    titulo,
    subtitulo,
    '',
    ...lineas.map((linea) => `${linea.label}: ${linea.value ?? '-'}`),
    '',
    `Generado: ${new Date().toLocaleString()}`,
  ];

  const pdf = crearPdf(contenido);
  const buffer = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
  const blob = new Blob([buffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreArchivo.endsWith('.pdf') ? nombreArchivo : `${nombreArchivo}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

function crearPdf(lineas: string[]): Uint8Array {
  const contenido = lineas
    .map((linea, index) => {
      const y = 780 - index * 22;
      return `BT /F1 12 Tf 50 ${y} Td (${escaparPdf(sanitizar(linea))}) Tj ET`;
    })
    .join('\n');

  const objetos = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n',
    `5 0 obj << /Length ${contenido.length} >> stream\n${contenido}\nendstream endobj\n`,
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
  return normalizar(valor)
    .replace(/[^a-z0-9 .,:#/-]/g, '')
    .replace(/\s+/g, ' ');
}

function escaparPdf(valor: string): string {
  return valor.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}
