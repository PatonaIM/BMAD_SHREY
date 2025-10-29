import { jobRepo } from '../data-access/repositories/jobRepo';

interface SitemapEntry {
  url: string;
  lastModified?: string | Date;
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export default async function sitemap(): Promise<SitemapEntry[]> {
  // Core static pages
  const staticEntries: SitemapEntry[] = [
    { url: `${BASE_URL}/` },
    { url: `${BASE_URL}/login` },
    { url: `${BASE_URL}/register` },
    { url: `${BASE_URL}/password-reset` },
  ];

  // Fetch active jobs (limit large enough for initial MVP)
  const jobs = await jobRepo.findActive(500);
  const jobEntries: SitemapEntry[] = jobs.map(job => ({
    url: `${BASE_URL}/jobs/${job.workableId || job._id}`,
    lastModified: job.updatedAt.toISOString(),
  }));

  return [...staticEntries, ...jobEntries];
}
