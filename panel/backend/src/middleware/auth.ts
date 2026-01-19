import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Socket } from 'socket.io';
import config from '../config/index.js';

export interface JwtPayload {
  username: string;
  iat: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export interface AuthenticatedSocket extends Socket {
  user?: JwtPayload;
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, config.auth.jwtSecret) as JwtPayload;
  } catch {
    return null;
  }
}

export function getToken(req: Request): string | null {
  if (req.cookies?.token) {
    return req.cookies.token;
  }
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = getToken(req);

  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.user = decoded;
  next();
}

export function socketAuth(socket: AuthenticatedSocket, next: (err?: Error) => void): void {
  let token = socket.handshake.auth?.token as string | undefined;

  if (!token) {
    const cookies = socket.handshake.headers.cookie;
    if (cookies) {
      const match = cookies.match(/token=([^;]+)/);
      if (match) token = match[1];
    }
  }

  if (!token) {
    next(new Error('Authentication required'));
    return;
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    next(new Error('Invalid or expired token'));
    return;
  }

  socket.user = decoded;
  next();
}

export function generateToken(username: string): string {
  return jwt.sign({ username, iat: Date.now() }, config.auth.jwtSecret, {
    expiresIn: config.auth.tokenExpiry as jwt.SignOptions['expiresIn']
  });
}
