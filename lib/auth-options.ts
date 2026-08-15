import { NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

export const authOptions: NextAuthConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
    Credentials({
      id: "switch",
      name: "Cambio de cuenta",
      credentials: { email: { label: "Email", type: "email" } },
      async authorize(credentials) {
        const email = credentials?.email;
        if (typeof email !== "string" || !email) return null;
        try {
          const { findUserByEmail } = await import("./get-or-create-user-sheet");
          const { decrypt } = await import("./encryption");
          const { refreshAccessToken } = await import("./refresh-token");

          const user = await findUserByEmail(email);
          if (!user) return null;

          const refreshToken = await decrypt(user.refreshTokenEnc);
          const accessToken = await decrypt(user.accessTokenEnc);
          const tokens = await refreshAccessToken({
            accessToken,
            refreshToken,
            accessTokenExpires: 0,
            email: user.email,
            spreadsheetId: user.spreadsheetId,
          });

          if (tokens.error) return null;

          return {
            id: user.email,
            name: user.name || user.email,
            email: user.email,
            image: user.picture,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken ?? refreshToken,
            accessTokenExpires: tokens.accessTokenExpires,
            spreadsheetId: user.spreadsheetId,
          };
        } catch (error) {
          console.error("Switch authorize error:", error);
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  // Necesario en producción (next start / Vercel): Auth.js exige confiar en el
  // host o rechaza /api/auth/* con UntrustedHost. En dev localhost se auto-confía.
  trustHost: true,
  callbacks: {
    async signIn({ user, account }) {
      if (account && !account.refresh_token) return false;
      return true;
    },
    async jwt({ token, account, user }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = (account.expires_at as number) * 1000;
        if (account.access_token) {
          // getOrCreateUserSheet se llama desde el callback, que es server-side
          const { getOrCreateUserSheet } = await import("./get-or-create-user-sheet");
          token.spreadsheetId = await getOrCreateUserSheet(user.email!, account.access_token, account.refresh_token);
        }
      } else if (user) {
        // Cambio de cuenta vía provider "switch" (sin account OAuth)
        token.accessToken = user.accessToken ?? "";
        token.refreshToken = user.refreshToken ?? "";
        token.accessTokenExpires = user.accessTokenExpires ?? 0;
        token.spreadsheetId = user.spreadsheetId ?? "";
        token.email = user.email ?? undefined;
      }
      if (Date.now() < (token.accessTokenExpires as number)) return token;
      const { refreshAccessToken } = await import("./refresh-token");
      return await refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.spreadsheetId = token.spreadsheetId as string;
      session.user.email = token.email as string;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
};
