import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email:    { label: 'E-mail',  type: 'email'    },
        password: { label: 'Senha',   type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        try {
          const res = await fetch(`${API_URL}/api/auth/login`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              email:    credentials.email,
              password: credentials.password,
            }),
          })

          if (!res.ok) return null

          const data = await res.json() as {
            token: string
            user:  { id: string; name: string; email: string }
          }

          return {
            id:           data.user.id,
            name:         data.user.name,
            email:        data.user.email,
            backendToken: data.token,
          }
        } catch {
          return null
        }
      },
    }),
  ],

  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId       = user.id
        token.backendToken = (user as { backendToken: string }).backendToken
      }
      return token
    },
    session({ session, token }) {
      session.user.id       = token.userId as string
      session.backendToken  = token.backendToken as string
      return session
    },
  },

  pages: {
    signIn: '/login',
    error:  '/login',
  },

  session: { strategy: 'jwt' },
  secret:  process.env.NEXTAUTH_SECRET,
}

// ── Extensão de tipos do NextAuth ──
declare module 'next-auth' {
  interface Session {
    user:         { id: string; name?: string | null; email?: string | null }
    backendToken: string
  }
  interface User {
    backendToken: string
  }
}
declare module 'next-auth/jwt' {
  interface JWT {
    userId:       string
    backendToken: string
  }
}
