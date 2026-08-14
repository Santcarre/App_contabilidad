import { auth } from "@/lib/auth";
import { getAllUsers } from "@/lib/get-or-create-user-sheet";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const users = await getAllUsers();
    const known = users
      .filter((u) => u.isActive === "TRUE" && u.email !== session.user?.email)
      .map((u) => ({ email: u.email, name: u.name, picture: u.picture }));

    return NextResponse.json({ users: known });
  } catch (error) {
    console.error("GET /api/auth/users error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
