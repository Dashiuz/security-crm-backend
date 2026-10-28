import { Injectable, Logger } from '@nestjs/common';

export interface InterpolationResult {
  interpolatedContent: string;
  substitutedVariables: string[];
  missingVariables: string[];
}

@Injectable()
export class FormatInterpolationService {
  private readonly logger = new Logger(FormatInterpolationService.name);
  private readonly variableRegex = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

  /**
   * Extrae todas las variables únicas con sintaxis {{variable}} de una plantilla
   */
  extractVariables(template: string): string[] {
    if (!template) return [];
    const matches = new Set<string>();
    let match: RegExpExecArray | null;

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
      // Normalizamos clave por si el template usa minúsculas/mayúsculas
      const lowerKey = variable.toLowerCase();
      let matchedVal = values[variable];
      if (matchedVal === undefined) {
        matchedVal = values[lowerKey];
      }

      if (matchedVal !== undefined && matchedVal !== null) {
        let replacement = String(matchedVal);
        const isImageToken =
          variable.includes('logo') ||
          variable.includes('foto') ||
          variable.includes('firma') ||
          variable.includes('plano') ||
          variable.includes('image');

        const isUrlOrBase64 =
          typeof matchedVal === 'string' &&
          (matchedVal.startsWith('http://') ||
            matchedVal.startsWith('https://') ||
            matchedVal.startsWith('data:image/'));

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
          replacement = `<img src="${matchedVal}" class="noxia-interpolated-image" style="max-width: 100%; height: auto; display: block; margin: 12px auto; border-radius: 4px;" alt="${variable}" />`;
        }

        const pattern = new RegExp(`\\{\\{\\s*${variable}\\s*\\}\\}`, 'gi');
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
}
