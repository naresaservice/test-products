import { NextResponse } from 'next/server';
import { readCSV, writeCSV, Product } from '@/lib/csv';

export async function GET() {
  try {
    const products = readCSV();
    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { codigo, marca, estatus, revisadoPor, observaciones } = body;

    if (!codigo || !marca) {
      return NextResponse.json({ success: false, error: 'Both Codigo and Marca are required to identify the product' }, { status: 400 });
    }

    const products = readCSV();
    const index = products.findIndex(p => p.codigo === codigo && p.marca === marca);

    if (index === -1) {
      return NextResponse.json({ success: false, error: `Product with code ${codigo} and brand ${marca} not found` }, { status: 404 });
    }

    // Capture modification time in America/Hermosillo timezone (sv-SE format gives YYYY-MM-DD HH:mm:ss)
    const hermosilloTime = new Date().toLocaleString('sv-SE', { timeZone: 'America/Hermosillo' });

    // Update fields (Marca and Codigo are read-only)
    products[index] = {
      ...products[index],
      estatus: estatus || products[index].estatus,
      revisadoPor: revisadoPor !== undefined ? revisadoPor : products[index].revisadoPor,
      observaciones: observaciones !== undefined ? observaciones : products[index].observaciones,
      fechaModificacion: hermosilloTime,
    };

    writeCSV(products);

    return NextResponse.json({ success: true, data: products[index] });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
