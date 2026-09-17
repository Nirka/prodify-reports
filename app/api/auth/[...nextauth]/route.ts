import NextAuth, { AuthOptions } from "next-auth"
import AzureADProvider from "next-auth/providers/azure-ad"

const authOptions: AuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      authorization: {
        params: {
          scope: "openid profile email User.Read",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
    updateAge: 30 * 60,
  },
  callbacks: {
    async signIn({ profile }: any) {
      const email = profile?.email || profile?.preferred_username || ""
      return email.endsWith("@prodify.com")
    },
    async jwt({ token, account }: any) {
      if (account) {
        token.accessToken = account.access_token
        token.issuedAt = Date.now()
        token.tenantId = process.env.AZURE_AD_TENANT_ID
      }
      return token
    },
    async session({ session, token }: any) {
      session.issuedAt = token.issuedAt
      return session
    },
  },
  events: {
    async signOut({ token }: any) {
      // After NextAuth clears its cookie, we also need to clear Microsoft session
      // This is handled client-side via the logout page redirect
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
    signOut: "/logout",
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
