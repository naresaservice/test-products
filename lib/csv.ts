import fs from 'fs';
import path from 'path';

export interface Product {
  id?: string;
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
    
    // Parse CSV properly respecting quotes and newlines inside fields
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      const nextChar = data[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentField += '"';
          i++; // skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentField);
        currentField = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; // skip \n
        }
        currentRow.push(currentField);
        if (currentRow.some(val => val.trim().length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
    
    // Flush last row if any
    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField);
      if (currentRow.some(val => val.trim().length > 0)) {
        rows.push(currentRow);
      }
    }
    
    if (rows.length <= 1) return []; // Only header or empty
    
    const products: Product[] = [];
    
    for (let i = 1; i < rows.length; i++) {
      const values = rows[i];
      // Clean values: trim and strip wrapping quotes if any
      const cleanedValues = values.map(val => {
        let cleaned = val.trim();
        if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
          cleaned = cleaned.slice(1, -1).trim();
        }
        return cleaned;
      });

      if (cleanedValues.length >= 6) {
        const codigo = cleanedValues[0];
        const nombre = cleanedValues[1];
        const marca = cleanedValues[2];
        
        // Skip header row if found in the middle, or corrupt/empty rows
        if (codigo.toLowerCase() === 'codigo' || !nombre || !marca) {
          continue;
        }
        
        // A valid product code must start with a digit
        // and a valid brand name (marca) should NOT be numeric
        const isNumericCodigo = /^\d+/.test(codigo);
        const isNumericMarca = /^\d+$/.test(marca);
        if (!isNumericCodigo || isNumericMarca) {
          continue;
        }

        // Strategy to handle observations with commas even if not quoted:
        // Everything from index 5 onwards is observations, except for the last column
        // if it represents a date (or an empty space after a trailing comma).
        const lastValue = cleanedValues[cleanedValues.length - 1];
        const hasDateAtEnd = /\d{4}-\d{2}-\d{2}/.test(lastValue) || lastValue === '';
        
        let observaciones = '';
        let fechaModificacion = '';
        
        if (hasDateAtEnd) {
          fechaModificacion = lastValue;
          // Join index 5 to second-to-last
          observaciones = cleanedValues.slice(5, cleanedValues.length - 1).join(', ');
        } else {
          fechaModificacion = '';
          // Join index 5 to the very end
          observaciones = cleanedValues.slice(5).join(', ');
        }

        products.push({
          id: String(products.length), // Set sequential id
          codigo,
          nombre,
          marca,
          estatus: cleanedValues[3],
          revisadoPor: cleanedValues[4] || '',
          observaciones,
          fechaModificacion,
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
