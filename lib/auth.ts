
export interface AuthenticatedSession {
  address: string;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function isAuthenticated(session: unknown): session is AuthenticatedSession {
  return Boolean(session && typeof session === 'object' && session !== null && 
         'address' in session && typeof (session as { address: unknown }).address === 'string' && 
         (session as { address: string }).address.length > 0);
}