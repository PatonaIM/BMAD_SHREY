import { getEnv } from '../../config/env';
import { logger } from '../../monitoring/logger';

export interface WorkableJobResponse {
  id: string;
  shortcode?: string;
  title: string;
  description: string;
  requirements?: string;
  department?: string;
  employment_type?: string;
  experience?: string;
  location?: {
    city?: string;
    region?: string;
    country?: string;
    remote?: boolean;
  } | null;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
  salary?: { min?: number; max?: number; currency?: string } | null;
  state: 'published' | 'archived' | string;
}

export class WorkableClient {
  private apiKey: string | undefined;
  private subdomain: string | undefined;

  constructor() {
    const env = getEnv();
    this.apiKey = env.WORKABLE_API_KEY;
    this.subdomain = env.WORKABLE_SUBDOMAIN;
  }

  private get baseUrl(): string {
    if (!this.subdomain) throw new Error('Missing WORKABLE_SUBDOMAIN');
    return `https://${this.subdomain}.workable.com/spi/v3`; // v3 is stable
  }

  private headers(): HeadersInit {
    if (!this.apiKey) throw new Error('Missing WORKABLE_API_KEY');
    return {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: 'application/json',
    };
  }

  async listJobs(): Promise<WorkableJobResponse[]> {
    const url = `${this.baseUrl}/jobs?limit=200`;
    logger.info({ event: 'workable_jobs_fetch_start', url });
    const res = await fetch(url, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`Workable API error: ${res.status}`);
    const json = (await res.json()) as { jobs: WorkableJobResponse[] };
    logger.info({
      event: 'workable_jobs_fetch_complete',
      count: json.jobs?.length || 0,
    });
    return json.jobs || [];
  }

  async getJobDetails(shortcode: string): Promise<WorkableJobResponse | null> {
    const url = `${this.baseUrl}/jobs/${shortcode}`;
    logger.info({ event: 'workable_job_detail_fetch_start', shortcode });
    const res = await fetch(url, { headers: this.headers() });
    if (res.status === 404) {
      logger.warn({ event: 'workable_job_detail_not_found', shortcode });
      return null;
    }
    if (!res.ok) throw new Error(`Workable job detail error: ${res.status}`);
    const json = (await res.json()) as WorkableJobResponse;
    logger.info({ event: 'workable_job_detail_fetch_complete', shortcode });
    return json;
  }
}

export const workableClient = new WorkableClient();
