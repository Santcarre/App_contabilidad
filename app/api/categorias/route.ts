import { getSpreadsheetId, getAccessToken } from "@/lib/get-spreadsheet-id";
import { SheetsClient } from "@/lib/google-sheets";
import { categorySchema } from "@/lib/validation";
import { NextRequest, NextResponse } from "next/server";

async function getCategories(sheets: SheetsClient): Promise<any[]> {
  const res = await sheets.getRows("Categorias!A:H");
  return res.slice(1).map((row) => ({
    id: row[0], name: row[1], type: row[2], icon: row[3], color: row[4], order: parseInt(row[5]), active: row[6] === "TRUE", isDefault: row[7] === "TRUE",
  }));
}

export async function GET() {
  try {
    const spreadsheetId = await getSpreadsheetId();
    const accessToken = await getAccessToken();
    const sheets = new SheetsClient(accessToken, spreadsheetId);
    const categories = await getCategories(sheets);
    return NextResponse.json({ categories });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const spreadsheetId = await getSpreadsheetId();
    const accessToken = await getAccessToken();
    const sheets = new SheetsClient(accessToken, spreadsheetId);

    const existing = await getCategories(sheets);
    if (existing.some((c) => c.name === parsed.data.name && c.type === parsed.data.type && c.active)) {
      return NextResponse.json({ error: "CATEGORY_EXISTS" }, { status: 409 });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const maxOrder = Math.max(0, ...existing.filter((c) => c.type === parsed.data.type).map((c) => c.order));

    await sheets.append("Categorias", [
      id, parsed.data.name, parsed.data.type, parsed.data.icon, parsed.data.color,
      parsed.data.order ?? maxOrder + 1, true, false,
    ]);

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });

    const spreadsheetId = await getSpreadsheetId();
    const accessToken = await getAccessToken();
    const sheets = new SheetsClient(accessToken, spreadsheetId);

    const res = await sheets.getRows("Categorias!A:H");
    const rowIndex = res.slice(1).findIndex((r) => r[0] === id);
    if (rowIndex === -1) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const existing = res[rowIndex + 1];
    const order = data.order ?? (parseInt(existing?.[5] ?? "0") || 0);

    const sheetRow = rowIndex + 2;
    await sheets.update(`Categorias!B${sheetRow}:G${sheetRow}`, [[
      data.name, data.type, data.icon, data.color, order, true,
    ]]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });

    const spreadsheetId = await getSpreadsheetId();
    const accessToken = await getAccessToken();
    const sheets = new SheetsClient(accessToken, spreadsheetId);

    const res = await sheets.getRows("Categorias!A:H");
    const rowIndex = res.slice(1).findIndex((r) => r[0] === id);
    if (rowIndex === -1) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const txRows = await sheets.getRows("Transacciones!A:M");
    const inUseCount = txRows.slice(1).filter((r) => r[6] === id).length;
    if (inUseCount > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: hay ${inUseCount} transacción(es) con esta categoría.` },
        { status: 409 }
      );
    }

    await sheets.deleteRows("Categorias", rowIndex + 2);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}