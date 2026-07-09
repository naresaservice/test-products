import fs from 'fs';
import path from 'path';

export interface Product {
  codigo: string;
  nombre: string;
  marca: string;
  estatus: string;
  revisadoPor: string;
  observaciones: string;
  fechaModificacion: string;
}

const csvDir = path.join(process.cwd(), 'data');
const csvFilePath = path.join(csvDir, 'products.csv');

const DUMMY_PRODUCTS: Product[] = [
  { codigo: '6902', nombre: 'Producto NARESA 6902', marca: 'Naresa', estatus: 'Por revisar', revisadoPor: '', observaciones: '', fechaModificacion: '' },
  { codigo: '100001', nombre: 'Engrane Reductor Metal', marca: 'Naresa', estatus: 'Por revisar', revisadoPor: '', observaciones: '', fechaModificacion: '' },
  { codigo: '100001', nombre: 'Engrane Reductor Metal', marca: 'Equilinea', estatus: 'Por revisar', revisadoPor: '', observaciones: '', fechaModificacion: '' },
  { codigo: '100002', nombre: 'Válvula de Presión Industrial', marca: 'Proquip', estatus: 'Por revisar', revisadoPor: '', observaciones: '', fechaModificacion: '' },
  { codigo: '100003', nombre: 'Motor Eléctrico Trifásico', marca: 'Naresa', estatus: 'Por revisar', revisadoPor: '', observaciones: '', fechaModificacion: '' },
  { codigo: '100004', nombre: 'Bomba Hidráulica 12V', marca: 'Equilinea', estatus: 'Por revisar', revisadoPor: '', observaciones: '', fechaModificacion: '' },
].map(p => ({
  ...p,
  revisadoPor: p.revisadoPor || '',
  observaciones: p.observaciones || '',
  fechaModificacion: p.fechaModificacion || ''
}));

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map(val => {
    let cleaned = val.trim();
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1);
    }
    return cleaned;
  });
}

function formatCSVValue(val: string): string {
  const str = String(val || '');
  const escaped = str.replace(/"/g, '""');
  if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('\r') || escaped.includes('"')) {
    return `"${escaped}"`;
  }
  return escaped;
}

export function initializeCSV() {
  if (!fs.existsSync(csvDir)) {
    fs.mkdirSync(csvDir, { recursive: true });
  }
  if (!fs.existsSync(csvFilePath)) {
    writeCSV(DUMMY_PRODUCTS);
  }
}

export function readCSV(): Product[] {
  initializeCSV();
  try {
    const data = fs.readFileSync(csvFilePath, 'utf-8');
    const lines = data.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length <= 1) return []; // Only header or empty
    
    const products: Product[] = [];
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length >= 6) {
        products.push({
          codigo: values[0],
          nombre: values[1],
          marca: values[2],
          estatus: values[3],
          revisadoPor: values[4] || '',
          observaciones: values[5] || '',
          fechaModificacion: values[6] || '',
        });
      }
    }
    return products;
  } catch (error) {
    console.error('Error reading CSV file:', error);
    return [];
  }
}

export function writeCSV(products: Product[]): void {
  try {
    if (!fs.existsSync(csvDir)) {
      fs.mkdirSync(csvDir, { recursive: true });
    }
    const header = 'Codigo,Nombre,Marca,Estatus,Asignado a,Observaciones,Fecha Modificacion';
    const rows = products.map(p => {
      return [
        formatCSVValue(p.codigo),
        formatCSVValue(p.nombre),
        formatCSVValue(p.marca),
        formatCSVValue(p.estatus),
        formatCSVValue(p.revisadoPor),
        formatCSVValue(p.observaciones),
        formatCSVValue(p.fechaModificacion),
      ].join(',');
    });
    const csvContent = [header, ...rows].join('\n') + '\n';
    fs.writeFileSync(csvFilePath, csvContent, 'utf-8');
  } catch (error) {
    console.error('Error writing CSV file:', error);
  }
}
