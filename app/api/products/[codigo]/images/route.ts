import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ codigo: string }> | { codigo: string } }
) {
  try {
    const resolvedParams = await params;
    const codigo = resolvedParams.codigo;

    const { searchParams } = new URL(request.url);
    const marca = searchParams.get('marca');

    if (!codigo) {
      return NextResponse.json({ success: false, error: 'Codigo parameter is required' }, { status: 400 });
    }

    if (!marca) {
      return NextResponse.json({ success: false, error: 'Marca query parameter is required' }, { status: 400 });
    }

    const parentDir = path.join(process.cwd(), 'public', 'videos', codigo);

    if (!fs.existsSync(parentDir)) {
      return NextResponse.json({ success: true, data: [] });
    }

    const subdirs = fs.readdirSync(parentDir);

    // Search for a subdirectory containing 'naresa' (case-insensitive)
    let matchedDir = subdirs.find(dir => {
      try {
        const fullPath = path.join(parentDir, dir);
        return fs.statSync(fullPath).isDirectory() && dir.toLowerCase().includes('naresa');
      } catch {
        return false;
      }
    });

    // Fallback: search for a subdirectory containing the brand name (case-insensitive)
    if (!matchedDir) {
      matchedDir = subdirs.find(dir => {
        try {
          const fullPath = path.join(parentDir, dir);
          return fs.statSync(fullPath).isDirectory() && dir.toLowerCase().includes(marca.toLowerCase());
        } catch {
          return false;
        }
      });
    }

    const dirName = matchedDir || marca;
    const dirPath = path.join(parentDir, dirName);

    if (!fs.existsSync(dirPath)) {
      return NextResponse.json({ success: true, data: [] });
    }

    const files = fs.readdirSync(dirPath);
    
    // Filter for images and sort alphabetically
    const imageFiles = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.png', '.jpg', '.jpeg', '.webp'].includes(ext);
      })
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    const imageUrls = imageFiles.map(file => `/videos/${codigo}/${dirName}/${file}`);

    return NextResponse.json({ success: true, data: imageUrls });
  } catch (error) {
    console.error('Error reading product images:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
