async function getSession(): Promise<any> {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session) throw new Error("No session. Redirect to login.");
  return session;
}

export async function getSpreadsheetId(): Promise<string> {
  const session = await getSession();
  if (!session.spreadsheetId) throw new Error("No spreadsheetId in session");
  return session.spreadsheetId;
}

export async function getUserEmail(): Promise<string> {
  const session = await getSession();
  return session.user?.email;
}

export async function getAccessToken(): Promise<string> {
  const session = await getSession();
  if (!session.accessToken) throw new Error("No access token in session");
  return session.accessToken;
}
