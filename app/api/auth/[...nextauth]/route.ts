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
  callbacks: {
    async signIn({ account, profile }: any) {
      const email = profile?.email || profile?.preferred_username || ""
      return email.endsWith("@prodify.com")
    },
    async session({ session, token }: any) {
      return session
    },
    async jwt({ token, account }: any) {
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  debug: true,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
