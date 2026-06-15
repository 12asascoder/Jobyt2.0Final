import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { sendSuccess } from '../utils/response';
import { AppError } from '../utils/appError';

export const ProjectController = {
  /**
   * Get all showcase projects for the current user or a target user.
   */
  async getProjects(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req.params.userId as string) || (req.user?.userId as string);
      if (!userId) {
        throw new AppError('User ID is required', 400);
      }

      const projects = await prisma.applicant_projects.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
      });

      sendSuccess(res, projects, 'Projects retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  /**
   * Add a new project to the user's showcase.
   */
  async addProject(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId as string;
      const { title, description, tech_stack, github_url, demo_url, media_url } = req.body;

      if (!title || typeof title !== 'string' || !title.trim()) {
        throw new AppError('Project title is required', 400);
      }

      // Parse tech_stack as array of strings
      let parsedTech: string[] = [];
      if (Array.isArray(tech_stack)) {
        parsedTech = tech_stack.map(t => String(t).trim()).filter(Boolean);
      } else if (typeof tech_stack === 'string') {
        parsedTech = tech_stack.split(',').map(t => t.trim()).filter(Boolean);
      }

      const project = await prisma.applicant_projects.create({
        data: {
          user_id: userId,
          title: title.trim(),
          description: description || null,
          tech_stack: parsedTech,
          github_url: github_url || null,
          demo_url: demo_url || null,
          media_url: media_url || null,
        },
      });

      sendSuccess(res, project, 'Project added successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update an existing project in the user's showcase.
   */
  async updateProject(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId as string;
      const id = req.params.id as string;
      const { title, description, tech_stack, github_url, demo_url, media_url } = req.body;

      // Verify ownership
      const existing = await prisma.applicant_projects.findFirst({
        where: { id, user_id: userId },
      });

      if (!existing) {
        throw new AppError('Project not found or unauthorized', 404);
      }

      // Parse tech_stack
      let parsedTech: string[] | undefined = undefined;
      if (tech_stack !== undefined) {
        if (Array.isArray(tech_stack)) {
          parsedTech = tech_stack.map(t => String(t).trim()).filter(Boolean);
        } else if (typeof tech_stack === 'string') {
          parsedTech = tech_stack.split(',').map(t => t.trim()).filter(Boolean);
        }
      }

      const updated = await prisma.applicant_projects.update({
        where: { id },
        data: {
          title: title !== undefined ? title.trim() : undefined,
          description: description !== undefined ? description : undefined,
          tech_stack: parsedTech !== undefined ? parsedTech : undefined,
          github_url: github_url !== undefined ? github_url : undefined,
          demo_url: demo_url !== undefined ? demo_url : undefined,
          media_url: media_url !== undefined ? media_url : undefined,
        },
      });

      sendSuccess(res, updated, 'Project updated successfully');
    } catch (err) {
      next(err);
    }
  },

  /**
   * Delete a project from the user's showcase.
   */
  async deleteProject(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId as string;
      const id = req.params.id as string;

      // Verify ownership
      const existing = await prisma.applicant_projects.findFirst({
        where: { id, user_id: userId },
      });

      if (!existing) {
        throw new AppError('Project not found or unauthorized', 404);
      }

      await prisma.applicant_projects.delete({
        where: { id },
      });

      sendSuccess(res, null, 'Project deleted successfully');
    } catch (err) {
      next(err);
    }
  },
};
