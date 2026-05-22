import { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  nome: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}
