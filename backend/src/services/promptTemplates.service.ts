import prisma from '../config/prisma';

export interface PromptTemplate {
  name: string;
  template: string;
  variables: string[];
  description: string;
}

export const PromptTemplatesService = {
  /**
   * Get a prompt template by name from the database
   */
  async getTemplate(name: string): Promise<PromptTemplate | null> {
    const template = await prisma.prompt_templates.findUnique({
      where: { name },
    });
    return template as PromptTemplate | null;
  },

  /**
   * Get all available prompt templates from the database
   */
  async getAllTemplates(): Promise<PromptTemplate[]> {
    const templates = await prisma.prompt_templates.findMany();
    return templates as PromptTemplate[];
  },

  /**
   * Get names of all available templates
   */
  async getAvailableTemplates(): Promise<string[]> {
    const templates = await this.getAllTemplates();
    return templates.map((t) => t.name);
  },

  /**
   * Render a template with provided variables
   */
  async renderTemplate(templateName: string, variables: Record<string, any>): Promise<string> {
    const template = await this.getTemplate(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found in database.`);
    }

    let rendered = template.template;

    // Replace all variables in the template
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      rendered = rendered.replace(new RegExp(placeholder, 'g'), String(value));
    }

    // Check for any remaining unsubstituted variables
    const remainingVars = rendered.match(/\\{\\{(\\w+)\\}\\}/g);
    if (remainingVars) {
      const missingVars = [...new Set(remainingVars.map(v => v.slice(2, -2)))];
      throw new Error(`Missing required variables: ${missingVars.join(', ')}`);
    }

    return rendered;
  },

  /**
   * Validate that all required variables are provided for a template
   */
  async validateVariables(templateName: string, variables: Record<string, any>): Promise<boolean> {
    const template = await this.getTemplate(templateName);
    if (!template) {
      return false;
    }

    return template.variables.every(varName => Object.prototype.hasOwnProperty.call(variables, varName));
  },

  /**
   * Create a new prompt template
   */
  async createTemplate(data: Omit<PromptTemplate, 'id'>): Promise<PromptTemplate> {
    const existing = await this.getTemplate(data.name);
    if (existing) {
      throw new Error(`Template with name '${data.name}' already exists.`);
    }

    const created = await prisma.prompt_templates.create({
      data: {
        name: data.name,
        description: data.description,
        template: data.template,
        variables: data.variables,
        version: 1,
      },
    });

    return created as unknown as PromptTemplate;
  },

  /**
   * Update an existing prompt template
   */
  async updateTemplate(name: string, data: Partial<Omit<PromptTemplate, 'id' | 'name'>>): Promise<PromptTemplate> {
    const existing = await prisma.prompt_templates.findUnique({ where: { name } });
    if (!existing) {
      throw new Error(`Template '${name}' not found.`);
    }

    const updated = await prisma.prompt_templates.update({
      where: { name },
      data: {
        ...data,
        version: existing.version + 1,
      },
    });

    return updated as unknown as PromptTemplate;
  },

  /**
   * Delete a prompt template
   */
  async deleteTemplate(name: string): Promise<boolean> {
    try {
      await prisma.prompt_templates.delete({ where: { name } });
      return true;
    } catch (e) {
      return false;
    }
  }
};
