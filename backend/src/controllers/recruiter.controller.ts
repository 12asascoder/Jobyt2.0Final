import { Request, Response, NextFunction } from 'express';
import { RecruiterService } from '../services/recruiter.service';
import { sendSuccess } from '../utils/response';

export const RecruiterController = {
  async createRecruiterProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { company_name, company_email, industry, description, company_size, website, location } = req.body;

      const profile = await RecruiterService.createRecruiterProfile(userId, {
        company_name,
        company_email,
        industry,
        description,
        company_size,
        website,
        location,
      });

      sendSuccess(res, profile, 'Recruiter profile created successfully', 201);
    } catch (err) {
      next(err);
    }
  },
};
