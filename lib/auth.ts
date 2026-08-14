import NextAuth from "next-auth";
import { authOptions } from "./auth-options";

export const { auth, handlers, signIn, signOut } = NextAuth(authOptions);