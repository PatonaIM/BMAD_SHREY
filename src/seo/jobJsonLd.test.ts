import { describe, it, expect } from 'vitest';
import { buildJobsJsonLd } from './jobJsonLd';

describe('buildJobsJsonLd', () => {
  it('produces schema graph with job postings', () => {
    const jobs = [
      {
        _id: '1',
        workableId: 'wk-1',
        workableShortcode: 'WK1',
        lastSyncedAt: new Date('2025-01-01'),
        title: 'Frontend Engineer',
        description: 'Build UI components',
        requirements: 'React experience',
        location: 'Remote',
        department: 'Engineering',
        employmentType: 'full-time',
        experienceLevel: 'mid',
        salary: { min: 90000, max: 120000, currency: 'USD' },
        company: 'Teamified',
        companyDescription: 'AI powered hiring',
        status: 'active',
        postedAt: new Date('2025-01-02'),
        closedAt: undefined,
        skills: ['React', 'TypeScript'],
        embeddingVersion: 1,
        createdAt: new Date('2025-01-02'),
        updatedAt: new Date('2025-01-03'),
      },
    ];
    const jsonLd = buildJobsJsonLd(jobs as any);
    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@graph'].length).toBeGreaterThan(0);
    const first = jsonLd['@graph'][0] as any;
    expect(first['@type']).toBe('JobPosting');
    expect(first.title).toBe('Frontend Engineer');
  });
});
