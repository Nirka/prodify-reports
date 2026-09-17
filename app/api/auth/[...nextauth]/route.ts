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
    maxAge: 8 * 60 * 60,      // 8 hours absolute max lifetime
    updateAge: 30 * 60,        // extend session every 30 min if active
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
      }
      return token
    },
    async session({ session, token }: any) {
      session.issuedAt = token.issuedAt
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }