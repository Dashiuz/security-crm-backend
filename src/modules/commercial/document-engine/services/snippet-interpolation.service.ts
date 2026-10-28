import { Injectable, Logger } from '@nestjs/common';

export interface InterpolationResult {
  interpolatedContent: string;
  substitutedVariables: string[];
  missingVariables: string[];
}

@Injectable()
export class SnippetInterpolationService {
  private readonly logger = new Logger(SnippetInterpolationService.name);
  private readonly variableRegex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

  /**
   * Extrae todas las variables únicas con sintaxis {{variable}} de una plantilla
   */
  extractVariables(template: string): string[] {
    if (!template) return [];
    const matches = new Set<string>();
    let match: RegExpExecArray | null;

    // Reset regex state
    this.variableRegex.lastIndex = 0;
    while ((match = this.variableRegex.exec(template)) !== null) {
      matches.add(match[1]);
    }

    return Array.from(matches);
  }

  /**
   * Reemplaza de forma segura las {{variables}} por sus valores correspondientes
   */
  interpolate(
    template: string,
    values: Record<string, any>,
  ): InterpolationResult {
    if (!template) {
      return {
        interpolatedContent: '',
        substitutedVariables: [],
        missingVariables: [],
      };
    }

    const foundVariables = this.extractVariables(template);
    const substituted: string[] = [];
    const missing: string[] = [];

    let result = template;

    for (const variable of foundVariables) {
      if (values[variable] !== undefined && values[variable] !== null) {
        let replacement = String(values[variable]);
        const isImageToken =
          variable.includes('logo') ||
          variable.includes('foto') ||
          variable.includes('firma') ||
          variable.includes('plano') ||
          variable.includes('image');

        const isUrlOrBase64 =
          typeof values[variable] === 'string' &&
          (values[variable].startsWith('http://') ||
            values[variable].startsWith('https://') ||
            values[variable].startsWith('data:image/'));

        const inSrcAttrPattern = new RegExp(
          `src=["'][^"']*?\\{\\{\\s*${variable}\\s*\\}\\}[^"']*?["']`,
          'i',
        );
        const isAlreadyInSrc = inSrcAttrPattern.test(template);

        if (
          (isImageToken || isUrlOrBase64) &&
          !isAlreadyInSrc &&
          isUrlOrBase64
        ) {
          replacement = `<img src="${values[variable]}" class="noxia-interpolated-image" style="max-width: 100%; height: auto; display: block; margin: 12px auto; border-radius: 4px;" alt="${variable}" />`;
        }

        const pattern = new RegExp(`\\{\\{\\s*${variable}\\s*\\}\\}`, 'g');
        result = result.replace(pattern, replacement);
        substituted.push(variable);
      } else {
        missing.push(variable);
      }
    }

    return {
      interpolatedContent: result,
      substitutedVariables: substituted,
      missingVariables: missing,
    };
  }

  /**
   * Valida si una plantilla contiene tokens no permitidos en el catálogo
   */
  validateTemplate(
    template: string,
    allowedVariables: string[] = [],
  ): { isValid: boolean; unallowed: string[]; found: string[] } {
    const found = this.extractVariables(template);
    const allowedSet = new Set(allowedVariables);

    if (allowedVariables.length === 0) {
      return { isValid: true, unallowed: [], found };
    }

    const unallowed = found.filter((v) => !allowedSet.has(v));

    return {
      isValid: unallowed.length === 0,
      unallowed,
      found,
    };
  }
}
