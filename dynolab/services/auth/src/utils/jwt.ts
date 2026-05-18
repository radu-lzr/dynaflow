import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_ACCESS_TTL = process.env.JWT_ACCESS_TTL as string;

if (!JWT_SECRET || !JWT_ACCESS_TTL) {
    throw new Error('JWT_SECRET and JWT_ACCESS_TTL must be defined in environment variables');
}

export function generateAccessToken(userId: string, accountType: string): string {
    const payload = {
        userId,
        accountType,
        jti: crypto.randomUUID(),
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: parseInt(JWT_ACCESS_TTL) });
}

export function verifyAccessToken(token: string): { userId: string, accountType: string, jti: string, exp: number } {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string, accountType: string, jti: string, exp: number };
    return decoded;
}