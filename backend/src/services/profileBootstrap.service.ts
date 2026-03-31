import prisma from '../config/prisma';
import { UserRole } from '../types';

export const ProfileBootstrapService = {
  async ensureRoleProfile(userId: string, role: UserRole): Promise<void> {
    if (role === 'applicant') {
      await prisma.applicant_profiles.upsert({
        where: { user_id: userId },
        update: {},
        create: { user_id: userId },
      });
      return;
    }

    if (role === 'recruiter') {
      await prisma.recruiter_profiles.upsert({
        where: { user_id: userId },
        update: {},
        create: { user_id: userId },
      });
    }
  },
};
