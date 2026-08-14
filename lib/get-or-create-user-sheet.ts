import { google, sheets_v4 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { encrypt } from "./encryption";

const USERS_SPREADSHEET_ID = process.env.GOOGLE_USERS_SPREADSHEET_ID ?? "";
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "";
const SERVICE_ACCOUNT_KEY = (process.env.GOOGLE_SERVICE_ACCOUNT_KEY ?? "").replace(/\\n/g, "\n");

let serviceAccountAuth: OAuth2Client | null = null;

function getServiceAccountAuth(): OAuth2Client {
  if (!serviceAccountAuth) {
    serviceAccountAuth = new google.auth.JWT({
      email: SERVICE_ACCOUNT_EMAIL,
      key: SERVICE_ACCOUNT_KEY,
      scopes: ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive.file"],
    });
  }
  return serviceAccountAuth;
}

async function getUsersSheet(): Promise<sheets_v4.Sheets> {
  const auth = getServiceAccountAuth();
  return google.sheets({ version: "v4", auth });
}

export interface UserRow {
  email: string;
  name: string;
  picture: string;
  accessTokenEnc: string;
  refreshTokenEnc: string;
  spreadsheetId: string;
  currencyBase: string;
  createdAt: string;
  lastLogin: string;
  isActive: string;
  rowIndex: number;
}

export async function getAllUsers(): Promise<Array<Pick<UserRow, "email" | "name" | "picture" | "isActive">>> {
  const sheets = await getUsersSheet();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: USERS_SPREADSHEET_ID,
    range: "Usuarios!A:J",
  });
  const rows = res.data.values ?? [];
  return rows.slice(1).map((row) => ({
    email: row[0],
    name: row[1],
    picture: row[2],
    isActive: row[9],
  }));
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const sheets = await getUsersSheet();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: USERS_SPREADSHEET_ID,
    range: "Usuarios!A:J",
  });
  const rows = res.data.values ?? [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[0] === email) {
      return {
        email: row[0],
        name: row[1],
        picture: row[2],
        accessTokenEnc: row[3],
        refreshTokenEnc: row[4],
        spreadsheetId: row[5],
        currencyBase: row[6],
        createdAt: row[7],
        lastLogin: row[8],
        isActive: row[9],
        rowIndex: i + 1,
      };
    }
  }
  return null;
}

async function writeHeadersAndSeed(sheets: sheets_v4.Sheets, spreadsheetId: string, accessToken: string): Promise<void> {
  const userSheets = new SheetsClient(accessToken, spreadsheetId);

  const headers = {
    Transacciones: ["id", "type", "amountOriginal", "currencyOriginal", "amountBase", "currencyBase", "categoryId", "sourceId", "date", "note", "recurringId", "createdAt", "updatedAt"],
    Categorias: ["id", "name", "type", "icon", "color", "order", "active", "isDefault"],
    Fuentes: ["id", "name", "type", "icon", "color", "initialBalance", "active", "isDefault"],
    Presupuestos: ["id", "categoryId", "limitAmount", "month", "alert80", "alert100", "createdAt"],
    Recurrentes: ["id", "type", "amountOriginal", "currencyOriginal", "categoryId", "sourceId", "frequency", "dayOfMonth", "startDate", "endDate", "active", "nextGeneration", "lastGenerated", "createdAt", "note"],
    Configuracion: ["key", "value", "updatedAt"],
    TasasCambio: ["baseCurrency", "targetCurrency", "rate", "source", "date", "fetchedAt"],
  };

  for (const [sheetName, header] of Object.entries(headers)) {
    await userSheets.append(sheetName, header);
  }

  // Seed default categories
  const defaultCategories = [
    { id: crypto.randomUUID(), name: "Alimentación", type: "gasto", icon: "utensils", color: "orange-500", order: 1, active: true, isDefault: true },
    { id: crypto.randomUUID(), name: "Transporte", type: "gasto", icon: "bus", color: "blue-500", order: 2, active: true, isDefault: true },
    { id: crypto.randomUUID(), name: "Ocio", type: "gasto", icon: "gamepad-2", color: "purple-500", order: 3, active: true, isDefault: true },
    { id: crypto.randomUUID(), name: "Suscripciones", type: "gasto", icon: "credit-card", color: "cyan-500", order: 4, active: true, isDefault: true },
    { id: crypto.randomUUID(), name: "Salud", type: "gasto", icon: "heart-pulse", color: "red-500", order: 5, active: true, isDefault: true },
    { id: crypto.randomUUID(), name: "Otros", type: "gasto", icon: "more-horizontal", color: "gray-500", order: 6, active: true, isDefault: true },
    { id: crypto.randomUUID(), name: "Salario", type: "ingreso", icon: "briefcase", color: "green-500", order: 1, active: true, isDefault: true },
    { id: crypto.randomUUID(), name: "Inversiones", type: "ingreso", icon: "trending-up", color: "emerald-500", order: 2, active: true, isDefault: true },
    { id: crypto.randomUUID(), name: "Freelance", type: "ingreso", icon: "laptop", color: "teal-500", order: 3, active: true, isDefault: true },
  ];

  for (const cat of defaultCategories) {
    await userSheets.append("Categorias", [cat.id, cat.name, cat.type, cat.icon, cat.color, cat.order, cat.active, cat.isDefault]);
  }

  // Seed default sources
  const defaultSources = [
    { id: crypto.randomUUID(), name: "Efectivo", type: "efectivo", icon: "wallet", color: "amber-500", initialBalance: 0, active: true, isDefault: true },
    { id: crypto.randomUUID(), name: "Nequi", type: "digital", icon: "smartphone", color: "green-500", initialBalance: 0, active: true, isDefault: true },
    { id: crypto.randomUUID(), name: "Bancolombia", type: "banco", icon: "building-2", color: "blue-500", initialBalance: 0, active: true, isDefault: true },
    { id: crypto.randomUUID(), name: "Davivienda", type: "banco", icon: "building-2", color: "red-500", initialBalance: 0, active: true, isDefault: true },
    { id: crypto.randomUUID(), name: "Tarjeta Crédito", type: "tarjeta", icon: "credit-card", color: "rose-500", initialBalance: 0, active: true, isDefault: true },
  ];

  for (const src of defaultSources) {
    await userSheets.append("Fuentes", [src.id, src.name, src.type, src.icon, src.color, src.initialBalance, src.active, src.isDefault]);
  }

  // Seed config
  const now = new Date().toISOString();
  await userSheets.append("Configuracion", ["currencyBase", "COP", now]);
  await userSheets.append("Configuracion", ["theme", "system", now]);
  await userSheets.append("Configuracion", ["language", "es", now]);
  await userSheets.append("Configuracion", ["dateFormat", "DD/MM/YYYY", now]);
  await userSheets.append("Configuracion", ["budgetStrictMode", "false", now]);
  await userSheets.append("Configuracion", ["knownUsers", "[]", now]);
}

export async function getOrCreateUserSheet(email: string, accessToken: string, refreshToken?: string): Promise<string> {
  const existing = await findUserByEmail(email);
  if (existing?.spreadsheetId) {
    const sheets = await getUsersSheet();
    const now = new Date().toISOString();
    const updates: { range: string; values: any[][] }[] = [
      {
        range: `Usuarios!I${existing.rowIndex}:J${existing.rowIndex}`,
        values: [[now, await encrypt(accessToken)]],
      },
    ];
    if (refreshToken) {
      updates.push({ range: `Usuarios!E${existing.rowIndex}`, values: [[await encrypt(refreshToken)]] });
    }
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: USERS_SPREADSHEET_ID,
      requestBody: { valueInputOption: "USER_ENTERED", data: updates },
    });
    return existing.spreadsheetId;
  }

  const oauth2Client = new OAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });
  const sheetsApi = google.sheets({ version: "v4", auth: oauth2Client });
  const spreadsheet = await sheetsApi.spreadsheets.create({
    requestBody: {
      properties: { title: `${email}_contabilidad` },
      sheets: [
        { properties: { title: "Transacciones", gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: "Categorias", gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: "Fuentes", gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: "Presupuestos", gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: "Recurrentes", gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: "Configuracion", gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: "TasasCambio", gridProperties: { frozenRowCount: 1 } } },
      ],
    },
  });
  const spreadsheetId = spreadsheet.data.spreadsheetId!;

  const drive = google.drive({ version: "v3", auth: oauth2Client });
  await drive.permissions.create({
    fileId: spreadsheetId,
    requestBody: { role: "writer", type: "user", emailAddress: SERVICE_ACCOUNT_EMAIL },
    sendNotificationEmail: false,
  });

  const sheetsOAuth = new OAuth2Client();
  sheetsOAuth.setCredentials({ access_token: accessToken });
  const sheets = google.sheets({ version: "v4", auth: sheetsOAuth });
  await writeHeadersAndSeed(sheets, spreadsheetId, accessToken);

  const usersSheet = await getUsersSheet();
  const now = new Date().toISOString();
  await usersSheet.spreadsheets.values.append({
    spreadsheetId: USERS_SPREADSHEET_ID,
    range: "Usuarios!A:J",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[email, "", "", await encrypt(accessToken), await encrypt(refreshToken ?? ""), spreadsheetId, "COP", now, now, "TRUE"]],
    },
  });

  return spreadsheetId;
}

class SheetsClient {
  private sheets: sheets_v4.Sheets;
  private spreadsheetId: string;

  constructor(accessToken: string, spreadsheetId: string) {
    const auth = new OAuth2Client();
    auth.setCredentials({ access_token: accessToken });
    this.sheets = google.sheets({ version: "v4", auth });
    this.spreadsheetId = spreadsheetId;
  }

  async append(sheetName: string, values: any[]): Promise<string> {
    const res = await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!A:Z`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [values] },
    });
    return res.data.updates?.updatedRange ?? "";
  }
}