import { Request, Response, NextFunction } from 'express';
import { JobService } from '../services/job.service';
import { JobType } from '../models/job.model';
import { sendSuccess, sendPaginated } from '../utils/response';

export const JobController = {
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        keyword: req.query.keyword as string,
        location: req.query.location as string,
        type: req.query.type as JobType | undefined,
        salary_min: req.query.salary_min ? parseInt(req.query.salary_min as string) : undefined,
        salary_max: req.query.salary_max ? parseInt(req.query.salary_max as string) : undefined,
        skills: req.query.skills ? (req.query.skills as string).split(',') : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        sort: req.query.sort as 'relevance' | 'date' | 'salary',
      };
      const { jobs, total } = await JobService.searchJobs(filters);
      sendPaginated(res, jobs, total, filters.page!, filters.limit!);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const job = await JobService.getJobById(req.params.id as string);
      sendSuccess(res, job);
    } catch (err) {
      next(err);
    }
  },

  async createJob(req: Request, res: Response, next: NextFunction) {
    try {
      const recruiterId = req.user!.userId;
      const job = await JobService.createJob(recruiterId, req.body);
      sendSuccess(res, job, 'Job created successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    return JobController.createJob(req, res, next);
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const job = await JobService.updateJob(req.user!.userId, req.params.id as string, req.body);
      sendSuccess(res, job, 'Job updated');
    } catch (err) {
      next(err);
    }
  },

  async publish(req: Request, res: Response, next: NextFunction) {
    try {
      const job = await JobService.publishJob(req.user!.userId, req.params.id as string);
      sendSuccess(res, job, 'Job published');
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await JobService.deleteJob(req.user!.userId, req.params.id as string);
      sendSuccess(res, null, 'Job deleted');
    } catch (err) {
      next(err);
    }
  },

  async myJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const jobs = await JobService.getRecruiterJobs(req.user!.userId);
      sendSuccess(res, jobs);
    } catch (err) {
      next(err);
    }
  },
};
