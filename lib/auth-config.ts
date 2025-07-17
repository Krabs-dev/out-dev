import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { recoverMessageAddress } from 'viem';
import prisma from '@/lib/prisma';

declare module 'next-auth' {
  interface Session {
    address: string;
    user: {
      id: string;
      address: string;
    };
  }
  interface User {
    id: string;
    address: string;
  }
  interface JWT {
    address?: string;
    userId?: string;
  }
}

function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function validateSiweMessage(lines: string[]): boolean {
  if (lines.length < 8) return false;
  
  if (!lines[0].includes('wants you to sign in with your Ethereum account:')) {
    return false;
  }
  
  if (!isValidEthereumAddress(lines[1])) {
    return false;
  }
  
  const expectedDomain = process.env.NEXTAUTH_URL?.replace('http://', '').replace('https://', '') || 'localhost:3000';
  if (!lines[0].startsWith(expectedDomain)) {
    console.warn('Domain mismatch:', lines[0], 'expected:', expectedDomain);
    return false;
  }
  
  const chainIdLine = lines.find(line => line.trim() === 'Chain ID: 999');
  if (!chainIdLine) {
    return false;
  }
  
  const uriLine = lines.find(line => line.startsWith('URI: '));
  const expectedUri = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  if (!uriLine || !uriLine.includes(expectedUri)) {
    console.warn('URI mismatch:', uriLine, 'expected:', expectedUri);
    return false;
  }
  
  const nonceLine = lines.find(line => line.startsWith('Nonce: '));
  if (!nonceLine || nonceLine.length < 15) {
    return false;
  }
  
  const issuedAtLine = lines.find(line => line.startsWith('Issued At: '));
  if (!issuedAtLine) {
    return false;
  }
  
  const issuedAt = new Date(issuedAtLine.replace('Issued At: ', ''));
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  
  if (issuedAt < fiveMinutesAgo || issuedAt > now) {
    return false;
  }
  
  return true;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Ethereum',
      credentials: {
        message: {
          label: 'Message',
          type: 'text',
          placeholder: '0x0',
        },
        signature: {
          label: 'Signature',
          type: 'text',
          placeholder: '0x0',
        },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.message || !credentials?.signature) {
            return null;
          }

          const messageLines = credentials.message.split('\n');
          
                  if (!validateSiweMessage(messageLines)) {
            return null;
          }

          const addressLine = messageLines[1];
          if (!isValidEthereumAddress(addressLine)) {
            return null;
          }

          const recoveredAddress = await recoverMessageAddress({
            message: credentials.message,
            signature: credentials.signature as `0x${string}`,
          });

          if (recoveredAddress.toLowerCase() !== addressLine.toLowerCase()) {
            return null;
          }

          try {
            const user = await prisma.user.upsert({
              where: { address: addressLine.toLowerCase() },
              update: { updatedAt: new Date() },
              create: { address: addressLine.toLowerCase() },
            });

            return {
              id: user.id,
              address: user.address,
            };
          } catch (dbError) {
            console.error('Erreur création utilisateur:', dbError);
            return null;
          }
        } catch {
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.address = user.address;
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.address && isValidEthereumAddress(token.address as string)) {
        session.address = token.address as string;
        if (session.user && token.userId) {
          session.user.id = token.userId as string;
          session.user.address = token.address as string;
        }
      }
      return session;
    },
  },
};