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
        token.issuedAt = Date.now()
      }
      return token
    },
    async session({ session, token }: any) {
      session.issuedAt = token.issuedAt
      session.user = {
        name: token.name,
        email: token.email,
        image: token.picture,
      }
      return session
    },
  },
  events: {
    async signOut({}: any) {},
  },
  pages: {
    signIn: "/login",
    error: "/login",
    signOut: "/logout",
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
