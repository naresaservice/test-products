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

    const dirPath = path.join(process.cwd(), 'public', 'videos', codigo, marca);

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

    const imageUrls = imageFiles.map(file => `/videos/${codigo}/${marca}/${file}`);

    return NextResponse.json({ success: true, data: imageUrls });
  } catch (error) {
    console.error('Error reading product images:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
