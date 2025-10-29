/**
 * Skill Normalization Service
 *
 * Handles mapping skill variations to canonical forms to improve matching
 * and reduce duplicates in skill data.
 */

import { NormalizedSkill } from '../../shared/types/profile';

export interface SkillMapping {
  canonical: string;
  variations: string[];
  category: string;
}

export class SkillNormalizationService {
  private mappings: Map<string, SkillMapping> = new Map();

  constructor() {
    this.initializeMappings();
  }

  /**
   * Normalize a single skill name
   */
  normalizeSkill(skill: string): NormalizedSkill {
    const original = skill;
    // Handle empty or whitespace-only strings
    if (!skill || skill.trim() === '') {
      return {
        original,
        normalized: '',
        category: null,
        confidence: 1.0,
      };
    }

    // Clean the skill name
    const cleaned = this.cleanSkillName(skill);

    // Handle cleaned empty strings
    if (!cleaned) {
      return {
        original,
        normalized: '',
        category: null,
        confidence: 1.0,
      };
    }

    // Check for exact match in mappings
    const mapping = this.mappings.get(cleaned.toLowerCase());
    if (mapping) {
      return {
        original,
        normalized: mapping.canonical,
        category: mapping.category,
        confidence: 1.0,
      };
    }

    // Try fuzzy matching for partial matches
    const fuzzyMatch = this.findFuzzyMatch(cleaned);
    if (fuzzyMatch) {
      return {
        original,
        normalized: fuzzyMatch.canonical,
        category: fuzzyMatch.category,
        confidence: 0.8,
      };
    }

    // If no match found, return the cleaned skill with guessed category
    const normalized = this.capitalizeSkill(cleaned);
    return {
      original,
      normalized,
      category: this.guessCategory(normalized),
      confidence: 0.5,
    };
  }

  /**
   * Normalize multiple skills at once
   */
  normalizeSkills(skills: string[]): NormalizedSkill[] {
    return skills.map(skill => this.normalizeSkill(skill));
  }

  /**
   * Get all canonical skills for a category
   */
  getSkillsByCategory(category: string): string[] {
    return Array.from(this.mappings.values())
      .filter(mapping => mapping.category === category)
      .map(mapping => mapping.canonical);
  }

  /**
   * Clean skill name (remove extra whitespace, special chars, etc.)
   */
  private cleanSkillName(skill: string): string {
    return skill
      .trim()
      .replace(/[^\w\s.#+-]/g, '') // Keep alphanumeric, spaces, dots, #, +, -
      .replace(/\s+/g, ' ')
      .replace(/^(the\s+)?/, '') // Remove leading "the "
      .replace(/\s+(programming|language|framework|library|js|\.js)$/i, '') // Remove common suffixes
      .trim();
  }

  /**
   * Capitalize skill name properly
   */
  private capitalizeSkill(skill: string): string {
    const specialCases: Record<string, string> = {
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      nodejs: 'Node.js',
      reactjs: 'React',
      vuejs: 'Vue.js',
      angularjs: 'AngularJS',
      jquery: 'jQuery',
      mongodb: 'MongoDB',
      postgresql: 'PostgreSQL',
      mysql: 'MySQL',
      github: 'GitHub',
      aws: 'AWS',
      gcp: 'Google Cloud Platform',
      docker: 'Docker',
      kubernetes: 'Kubernetes',
    };

    const lower = skill.toLowerCase();
    if (specialCases[lower]) {
      return specialCases[lower];
    }

    // Default capitalization
    return skill
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Find fuzzy match for a skill
   */
  private findFuzzyMatch(skill: string): SkillMapping | null {
    const lower = skill.toLowerCase();

    for (const [, mapping] of this.mappings) {
      // Check canonical name
      if (
        lower.includes(mapping.canonical.toLowerCase()) ||
        mapping.canonical.toLowerCase().includes(lower)
      ) {
        return mapping;
      }

      // Check if skill is contained in any variation
      for (const variation of mapping.variations) {
        const variationLower = variation.toLowerCase();
        if (lower.includes(variationLower) || variationLower.includes(lower)) {
          return mapping;
        }
      }
    }
    return null;
  }

  /**
   * Guess category based on skill name patterns
   */
  private guessCategory(skill: string): string {
    const lower = skill.toLowerCase();

    const patterns = [
      {
        pattern: /(mysql|postgresql|mongodb|redis|sqlite|oracle)/,
        category: 'databases',
      },
      {
        pattern:
          /(java|python|javascript|typescript|c\+\+|rust|go|php|ruby|swift|kotlin)/,
        category: 'programming_languages',
      },
      {
        pattern: /(react|vue|angular|express|django|flask|spring|laravel)/,
        category: 'frameworks_libraries',
      },
      {
        pattern: /(aws|azure|gcp|docker|kubernetes|heroku|firebase)/,
        category: 'cloud_platforms',
      },
      {
        pattern: /(git|jira|figma|photoshop|slack|teams)/,
        category: 'tools_software',
      },
      {
        pattern: /(agile|scrum|devops|ci\/cd|tdd|microservices)/,
        category: 'methodologies',
      },
      {
        pattern: /(leadership|communication|teamwork|problem.solving)/,
        category: 'soft_skills',
      },
    ];

    for (const { pattern, category } of patterns) {
      if (pattern.test(lower)) {
        return category;
      }
    }

    return 'other';
  }

  /**
   * Initialize skill mappings with common variations
   */
  private initializeMappings(): void {
    const skillMappings: SkillMapping[] = [
      // Programming Languages
      {
        canonical: 'JavaScript',
        variations: [
          'js',
          'javascript',
          'java script',
          'ecmascript',
          'es6',
          'es2015',
          'es2017',
        ],
        category: 'programming_languages',
      },
      {
        canonical: 'TypeScript',
        variations: ['ts', 'typescript', 'type script'],
        category: 'programming_languages',
      },
      {
        canonical: 'Python',
        variations: ['python', 'python3', 'py'],
        category: 'programming_languages',
      },
      {
        canonical: 'Java',
        variations: ['java', 'java 8', 'java 11', 'java 17', 'openjdk'],
        category: 'programming_languages',
      },
      {
        canonical: 'C++',
        variations: ['c++', 'cpp', 'c plus plus', 'cplusplus'],
        category: 'programming_languages',
      },
      {
        canonical: 'C#',
        variations: ['c#', 'csharp', 'c sharp', 'dotnet'],
        category: 'programming_languages',
      },

      // Frameworks & Libraries
      {
        canonical: 'React',
        variations: ['react', 'reactjs', 'react.js', 'react js'],
        category: 'frameworks_libraries',
      },
      {
        canonical: 'Vue.js',
        variations: ['vue', 'vuejs', 'vue.js', 'vue js'],
        category: 'frameworks_libraries',
      },
      {
        canonical: 'Angular',
        variations: ['angular', 'angular 2', 'angular2', 'angularjs'],
        category: 'frameworks_libraries',
      },
      {
        canonical: 'Node.js',
        variations: ['node', 'nodejs', 'node.js', 'node js'],
        category: 'frameworks_libraries',
      },
      {
        canonical: 'Express.js',
        variations: ['express', 'expressjs', 'express.js'],
        category: 'frameworks_libraries',
      },
      {
        canonical: 'Django',
        variations: ['django', 'django framework'],
        category: 'frameworks_libraries',
      },
      {
        canonical: 'Flask',
        variations: ['flask', 'flask framework'],
        category: 'frameworks_libraries',
      },
      {
        canonical: 'Spring Boot',
        variations: ['spring', 'spring boot', 'springboot', 'spring framework'],
        category: 'frameworks_libraries',
      },

      // Databases
      {
        canonical: 'MongoDB',
        variations: ['mongodb', 'mongo', 'mongo db'],
        category: 'databases',
      },
      {
        canonical: 'PostgreSQL',
        variations: ['postgresql', 'postgres', 'postgre'],
        category: 'databases',
      },
      {
        canonical: 'MySQL',
        variations: ['mysql', 'my sql'],
        category: 'databases',
      },
      {
        canonical: 'Redis',
        variations: ['redis', 'redis cache'],
        category: 'databases',
      },

      // Cloud Platforms
      {
        canonical: 'AWS',
        variations: ['aws', 'amazon web services', 'amazon aws'],
        category: 'cloud_platforms',
      },
      {
        canonical: 'Google Cloud Platform',
        variations: ['gcp', 'google cloud', 'google cloud platform'],
        category: 'cloud_platforms',
      },
      {
        canonical: 'Microsoft Azure',
        variations: ['azure', 'microsoft azure', 'azure cloud'],
        category: 'cloud_platforms',
      },
      {
        canonical: 'Docker',
        variations: ['docker', 'docker containers', 'containerization'],
        category: 'cloud_platforms',
      },
      {
        canonical: 'Kubernetes',
        variations: ['kubernetes', 'k8s', 'kube'],
        category: 'cloud_platforms',
      },

      // Tools & Software
      {
        canonical: 'Git',
        variations: ['git', 'git version control', 'github', 'gitlab'],
        category: 'tools_software',
      },
      {
        canonical: 'JIRA',
        variations: ['jira', 'atlassian jira'],
        category: 'tools_software',
      },
      {
        canonical: 'Figma',
        variations: ['figma', 'figma design'],
        category: 'tools_software',
      },

      // Methodologies
      {
        canonical: 'Agile',
        variations: ['agile', 'agile methodology', 'agile development'],
        category: 'methodologies',
      },
      {
        canonical: 'Scrum',
        variations: ['scrum', 'scrum methodology', 'scrum master'],
        category: 'methodologies',
      },
      {
        canonical: 'DevOps',
        variations: ['devops', 'dev ops', 'ci/cd', 'continuous integration'],
        category: 'methodologies',
      },
    ];

    // Build the lookup map
    for (const mapping of skillMappings) {
      // Add canonical form
      this.mappings.set(mapping.canonical.toLowerCase(), mapping);

      // Add all variations
      for (const variation of mapping.variations) {
        this.mappings.set(variation.toLowerCase(), mapping);
      }
    }
  }

  /**
   * Add a new skill mapping dynamically
   */
  addMapping(mapping: SkillMapping): void {
    this.mappings.set(mapping.canonical.toLowerCase(), mapping);
    for (const variation of mapping.variations) {
      this.mappings.set(variation.toLowerCase(), mapping);
    }
  }
}

export const skillNormalizationService = new SkillNormalizationService();
