import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getAuthConfig, getAuthDiagnostics, normalizeSubmittedCredentials } from "@/lib/auth-config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      credentials: {
        username: { label: "用户名", type: "text" },
        password: { label: "密码", type: "password" },
      },
      authorize: async (credentials) => {
        const { adminUsername, adminPassword, regularUsername, regularPassword } = getAuthConfig();
        const { username, password } = normalizeSubmittedCredentials(credentials);

        if (!adminUsername || !adminPassword) {
          console.error("[auth] Missing BASIC_USER or BASIC_PASS in runtime environment", getAuthDiagnostics());
          return null;
        }

        if (username === adminUsername && password === adminPassword) {
          return {
            id: 1,
            name: adminUsername,
            email: "admin@example.com",
            role: "admin",
            createdAt: new Date().toISOString(),
          };
        }

        if (regularUsername && regularPassword && username === regularUsername && password === regularPassword) {
          return {
            id: 2,
            name: regularUsername,
            email: "user@example.com",
            role: "user",
            createdAt: new Date().toISOString(),
          };
        }

        console.warn("[auth] Credentials rejected", {
          usernameLength: username.length,
          hasAdminCredentials: Boolean(adminUsername && adminPassword),
          hasRegularCredentials: Boolean(regularUsername && regularPassword),
        });
        return null;
      },
    })
  ],
  pages: {
    signIn: "/login",
    signOut: "/",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  secret: getAuthConfig().secret || "00Fv/YUm0enwy04IgP4KoNOWLODe2iJ1tvBzr+4kEZ8=",
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.role = user.role;
        token.createdAt = user.createdAt;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.name = token.name;
      session.user.email = token.email;
      session.user.role = token.role;
      session.user.createdAt = token.createdAt;
      return session;
    },
    async authorized({ auth }) {
      const isAuthenticated = !!auth?.user;
      return isAuthenticated;
    },
  },
  trustHost: true,
});

