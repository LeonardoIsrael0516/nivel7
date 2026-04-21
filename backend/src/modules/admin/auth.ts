import argon2 from 'argon2';
import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../lib/prisma.js';

export async function loginAdmin(email: string, password: string) {
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin || !admin.isActive) return null;
  const valid = await argon2.verify(admin.passwordHash, password);
  if (!valid) return null;
  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() }
  });
  return admin;
}

export async function requireAdminAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    return reply.unauthorized('admin_auth_required');
  }
}
