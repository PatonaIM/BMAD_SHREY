/**
 * Script to populate the database with test users and applications
 *
 * What it does:
 * 1. Creates 100 test users with default password
 * 2. Generates text resumes for each user with dummy data
 * 3. Uploads resumes to storage
 * 4. Randomly picks 10 jobs from the database
 * 5. Has 8-12 random users apply to each job
 *
 * Usage:
 *   npm run seed:test-data
 *   npm run seed:test-data -- --users=50 --jobs=5
 */

// Load environment variables from .env file
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env file from project root
config({ path: resolve(__dirname, '../.env') });

// @ts-expect-error - bcryptjs types not needed for this script
import * as bcryptjs from 'bcryptjs';
import {
  createUser,
  findUserByEmail,
} from '../src/data-access/repositories/userRepo';
import { jobRepo } from '../src/data-access/repositories/jobRepo';
import jwt from 'jsonwebtoken';
// @ts-expect-error - formdata-node types not needed for this script
import { FormData, Blob } from 'formdata-node';

// Configuration
const DEFAULT_PASSWORD = 'test1234';
const NUM_USERS = 100;
const NUM_JOBS_TO_APPLY = 10;
const MIN_APPLICATIONS_PER_JOB = 8;
const MAX_APPLICATIONS_PER_JOB = 12;
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key-here';

// Dummy data for generating realistic resumes
const FIRST_NAMES = [
  'James',
  'Mary',
  'John',
  'Patricia',
  'Robert',
  'Jennifer',
  'Michael',
  'Linda',
  'William',
  'Elizabeth',
  'David',
  'Barbara',
  'Richard',
  'Susan',
  'Joseph',
  'Jessica',
  'Thomas',
  'Sarah',
  'Charles',
  'Karen',
  'Christopher',
  'Nancy',
  'Daniel',
  'Lisa',
  'Matthew',
  'Betty',
  'Anthony',
  'Margaret',
  'Mark',
  'Sandra',
  'Donald',
  'Ashley',
  'Steven',
  'Kimberly',
  'Paul',
  'Emily',
  'Andrew',
  'Donna',
  'Joshua',
  'Michelle',
  'Kenneth',
  'Dorothy',
  'Kevin',
  'Carol',
  'Brian',
  'Amanda',
  'George',
  'Melissa',
  'Edward',
  'Deborah',
  'Ronald',
  'Stephanie',
  'Timothy',
  'Rebecca',
  'Jason',
  'Sharon',
  'Jeffrey',
  'Laura',
  'Ryan',
  'Cynthia',
  'Jacob',
  'Kathleen',
  'Gary',
  'Amy',
  'Nicholas',
  'Shirley',
  'Eric',
  'Angela',
  'Jonathan',
  'Helen',
  'Stephen',
  'Anna',
  'Larry',
  'Brenda',
  'Justin',
  'Pamela',
  'Scott',
  'Nicole',
  'Brandon',
  'Emma',
  'Benjamin',
  'Samantha',
  'Samuel',
  'Katherine',
  'Raymond',
  'Christine',
  'Gregory',
  'Debra',
  'Frank',
  'Rachel',
  'Alexander',
  'Catherine',
  'Patrick',
  'Carolyn',
  'Raymond',
  'Janet',
  'Jack',
  'Ruth',
  'Dennis',
  'Maria',
  'Jerry',
  'Heather',
  'Tyler',
  'Diane',
];

const LAST_NAMES = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Hernandez',
  'Lopez',
  'Gonzalez',
  'Wilson',
  'Anderson',
  'Thomas',
  'Taylor',
  'Moore',
  'Jackson',
  'Martin',
  'Lee',
  'Perez',
  'Thompson',
  'White',
  'Harris',
  'Sanchez',
  'Clark',
  'Ramirez',
  'Lewis',
  'Robinson',
  'Walker',
  'Young',
  'Allen',
  'King',
  'Wright',
  'Scott',
  'Torres',
  'Nguyen',
  'Hill',
  'Flores',
  'Green',
  'Adams',
  'Nelson',
  'Baker',
  'Hall',
  'Rivera',
  'Campbell',
  'Mitchell',
  'Carter',
  'Roberts',
  'Gomez',
  'Phillips',
  'Evans',
  'Turner',
  'Diaz',
  'Parker',
  'Cruz',
  'Edwards',
  'Collins',
  'Reyes',
  'Stewart',
  'Morris',
  'Morales',
  'Murphy',
  'Cook',
  'Rogers',
  'Gutierrez',
  'Ortiz',
  'Morgan',
  'Cooper',
  'Peterson',
  'Bailey',
  'Reed',
  'Kelly',
  'Howard',
  'Ramos',
  'Kim',
  'Cox',
  'Ward',
  'Richardson',
  'Watson',
  'Brooks',
  'Chavez',
  'Wood',
  'James',
  'Bennett',
  'Gray',
  'Mendoza',
  'Ruiz',
  'Hughes',
  'Price',
  'Alvarez',
  'Castillo',
  'Sanders',
  'Patel',
  'Myers',
];

const SKILLS = [
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  'C++',
  'React',
  'Node.js',
  'Angular',
  'Vue.js',
  'SQL',
  'MongoDB',
  'PostgreSQL',
  'AWS',
  'Azure',
  'Docker',
  'Kubernetes',
  'Git',
  'REST APIs',
  'GraphQL',
  'HTML',
  'CSS',
  'Tailwind',
  'Next.js',
  'Express',
  'Django',
  'Flask',
  'Spring Boot',
  'Machine Learning',
  'Data Analysis',
  'TensorFlow',
  'Project Management',
  'Agile',
  'Scrum',
  'Leadership',
  'Communication',
  'Problem Solving',
  'CI/CD',
  'Jenkins',
  'GitHub Actions',
  'Testing',
  'Jest',
  'Cypress',
  'Selenium',
  'Microservices',
  'System Design',
  'Redis',
  'Elasticsearch',
  'Kafka',
  'RabbitMQ',
];

const COMPANIES = [
  'Tech Solutions Inc',
  'Digital Innovations LLC',
  'Cloud Systems Corp',
  'Data Dynamics',
  'Smart Software Ltd',
  'Web Services Group',
  'Enterprise Solutions',
  'NextGen Technologies',
  'Global Tech Partners',
  'Innovation Labs',
  'Quantum Computing Inc',
  'AI Systems Corp',
  'Cyber Security Group',
  'Mobile Apps Ltd',
  'Platform Technologies',
  'DevOps Solutions',
];

const JOB_TITLES = [
  'Software Engineer',
  'Senior Developer',
  'Full Stack Developer',
  'Frontend Developer',
  'Backend Developer',
  'DevOps Engineer',
  'Data Engineer',
  'QA Engineer',
  'Product Manager',
  'Technical Lead',
  'System Architect',
  'UI/UX Designer',
  'Data Analyst',
  'Machine Learning Engineer',
  'Cloud Engineer',
  'Security Engineer',
];

const CITIES = [
  'New York',
  'San Francisco',
  'Seattle',
  'Austin',
  'Boston',
  'Chicago',
  'Los Angeles',
  'Denver',
  'Atlanta',
  'Portland',
  'Miami',
  'Dallas',
];

/**
 * Generate a random element from an array
 */
function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a random integer between min and max (inclusive)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a random sample of N elements from an array
 */
function randomSample<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

/**
 * Generate a full name
 */
function generateName(): {
  firstName: string;
  lastName: string;
  fullName: string;
} {
  const firstName = randomElement(FIRST_NAMES);
  const lastName = randomElement(LAST_NAMES);
  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
  };
}

/**
 * Generate an email from a name
 */
function generateEmail(
  firstName: string,
  lastName: string,
  index: number
): string {
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${index}@testuser.com`;
}

/**
 * Generate a phone number
 */
function generatePhone(): string {
  const areaCode = randomInt(200, 999);
  const prefix = randomInt(200, 999);
  const line = randomInt(1000, 9999);
  return `(${areaCode}) ${prefix}-${line}`;
}

/**
 * Generate years of experience
 */
function generateYearsOfExperience(): number {
  return randomInt(0, 15);
}

/**
 * Generate a professional summary
 */
function generateSummary(yearsExp: number, skills: string[]): string {
  const skillList = skills.slice(0, 3).join(', ');
  return `Experienced professional with ${yearsExp} years in software development. Specialized in ${skillList}. Proven track record of delivering high-quality solutions and collaborating with cross-functional teams. Passionate about learning new technologies and solving complex problems.`;
}

/**
 * Generate work experience entries
 */
function generateExperience(yearsExp: number): string[] {
  const numJobs = Math.min(Math.ceil(yearsExp / 2) || 1, 4);
  const experiences: string[] = [];

  for (let i = 0; i < numJobs; i++) {
    const company = randomElement(COMPANIES);
    const title = randomElement(JOB_TITLES);
    const duration = randomInt(1, 4);
    const endYear = 2024 - i * 2;
    const startYear = endYear - duration;

    experiences.push(
      `${title} at ${company} (${startYear} - ${i === 0 ? 'Present' : endYear})\n` +
        `- Led development of key features and improvements\n` +
        `- Collaborated with team of ${randomInt(3, 10)} developers\n` +
        `- Improved system performance by ${randomInt(20, 50)}%\n` +
        `- Implemented best practices for code quality and testing`
    );
  }

  return experiences;
}

/**
 * Generate education
 */
function generateEducation(): string {
  const degrees = ['B.S.', 'B.A.', 'M.S.', 'M.B.A.'];
  const majors = [
    'Computer Science',
    'Software Engineering',
    'Information Technology',
    'Computer Engineering',
  ];
  const universities = [
    'State University',
    'Tech Institute',
    'University of Technology',
    'College of Engineering',
    'Metropolitan University',
    'Technical College',
  ];

  const degree = randomElement(degrees);
  const major = randomElement(majors);
  const university = randomElement(universities);
  const year = randomInt(2005, 2020);

  return `${degree} in ${major}\n${university}\nGraduated: ${year}`;
}

/**
 * Generate a text resume
 */
function generateResume(name: string, email: string, phone: string): string {
  const yearsExp = generateYearsOfExperience();
  const skills = randomSample(SKILLS, randomInt(6, 12));
  const summary = generateSummary(yearsExp, skills);
  const experiences = generateExperience(yearsExp);
  const education = generateEducation();
  const city = randomElement(CITIES);

  return `${name}
${email} | ${phone} | ${city}, USA

PROFESSIONAL SUMMARY
${summary}

SKILLS
${skills.join(' • ')}

PROFESSIONAL EXPERIENCE

${experiences.join('\n\n')}

EDUCATION
${education}

CERTIFICATIONS
- AWS Certified Solutions Architect
- Professional Scrum Master (PSM I)

LANGUAGES
- English (Native)
- Spanish (Conversational)
`;
}

/**
 * Create a session cookie for API authentication
 */
function createSessionCookie(userId: string, email: string): string {
  const sessionToken = jwt.sign(
    {
      sub: userId,
      email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
    },
    JWT_SECRET
  );
  return `next-auth.session-token=${sessionToken}`;
}

/**
 * Upload resume via API and trigger extraction
 */
async function uploadResumeViaAPI(
  userId: string,
  email: string,
  name: string
): Promise<string> {
  const phone = generatePhone();
  const resumeText = generateResume(name, email, phone);
  const fileName = `${name.replace(/\s+/g, '_')}_Resume.txt`;
  const buffer = Buffer.from(resumeText, 'utf-8');

  // Create session cookie
  const cookie = createSessionCookie(userId, email);

  // Upload resume
  const formData = new FormData();
  const blob = new Blob([buffer], { type: 'text/plain' });
  formData.append('file', blob, fileName);

  const uploadResponse = await fetch(
    `${API_BASE_URL}/api/profile/resume/upload`,
    {
      method: 'POST',
      headers: {
        Cookie: cookie,
      },
      body: formData as any,
    }
  );

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(
      `Resume upload failed: ${uploadResponse.status} ${errorText}`
    );
  }

  const uploadResult = await uploadResponse.json();
  if (!uploadResult.ok || !uploadResult.value?.currentVersionId) {
    throw new Error('Resume upload did not return version ID');
  }

  const resumeVersionId = uploadResult.value.currentVersionId;

  // Trigger extraction (which also triggers vectorization)
  const extractResponse = await fetch(`${API_BASE_URL}/api/profile/extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({ resumeVersionId }),
  });

  if (!extractResponse.ok) {
    console.warn(
      `  ⚠ Extraction failed for ${email}: ${extractResponse.status}`
    );
    // Continue anyway - extraction can be done later
  }

  return resumeVersionId;
}

/**
 * Submit application via API to trigger vectorization and scoring
 */
async function submitApplicationViaAPI(
  userId: string,
  email: string,
  jobId: string,
  resumeVersionId: string
): Promise<boolean> {
  const cookie = createSessionCookie(userId, email);

  const response = await fetch(`${API_BASE_URL}/api/applications/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({
      jobId,
      resumeVersionId,
    }),
  });

  if (response.status === 409) {
    // Already applied
    return false;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Application submission failed: ${response.status} ${errorText}`
    );
  }

  return true;
}

/**
 * Create a user in the database
 */
async function createTestUser(
  index: number
): Promise<{ userId: string; email: string; name: string }> {
  const { firstName, lastName, fullName } = generateName();
  const email = generateEmail(firstName, lastName, index);

  // Check if user already exists
  const existing = await findUserByEmail(email);
  if (existing) {
    console.log(`  ↪ User already exists: ${email}`);
    return { userId: (existing as any)._id, email, name: fullName };
  }

  // Hash password
  const passwordHash = bcryptjs.hashSync(DEFAULT_PASSWORD, 10);

  // Create user with type assertion for compatibility
  const user = await createUser({
    email,
    roles: ['USER'],
    passwordHash,
  } as any);

  return { userId: (user as any)._id, email, name: fullName };
}

/**
 * Main seeding function
 */
async function main() {
  console.log('🌱 Starting test data seeding...\n');

  // Verify environment variables are loaded
  if (!process.env.MONGODB_URI) {
    console.error('❌ Error: MONGODB_URI environment variable not found.');
    console.error(
      '   Make sure you have a .env file in the project root with MONGODB_URI set.'
    );
    process.exit(1);
  }

  if (!process.env.NEXTAUTH_SECRET) {
    console.error('❌ Error: NEXTAUTH_SECRET environment variable not found.');
    console.error(
      '   Make sure you have a .env file in the project root with NEXTAUTH_SECRET set.'
    );
    process.exit(1);
  }

  // Parse command line arguments
  const args = process.argv.slice(2);
  const numUsers =
    args.find(arg => arg.startsWith('--users='))?.split('=')[1] || NUM_USERS;
  const numJobsToApply =
    args.find(arg => arg.startsWith('--jobs='))?.split('=')[1] ||
    NUM_JOBS_TO_APPLY;

  const totalUsers = parseInt(String(numUsers), 10);
  const totalJobs = parseInt(String(numJobsToApply), 10);

  console.log(`Configuration:`);
  console.log(`  - Users to create: ${totalUsers}`);
  console.log(`  - Jobs to apply to: ${totalJobs}`);
  console.log(
    `  - Applications per job: ${MIN_APPLICATIONS_PER_JOB}-${MAX_APPLICATIONS_PER_JOB}`
  );
  console.log(`  - Default password: ${DEFAULT_PASSWORD}`);
  console.log(`  - API URL: ${API_BASE_URL}\n`);

  console.log(
    `⚠️  IMPORTANT: Make sure your Next.js server is running at ${API_BASE_URL}`
  );
  console.log(
    `   Run 'npm run dev' in another terminal before starting this script.\n`
  );

  // Wait a moment for user to see the message
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Step 1: Create users with resumes
  console.log(`📝 Step 1: Creating ${totalUsers} users with resumes...`);
  const users: Array<{
    userId: string;
    email: string;
    name: string;
    resumeVersionId: string;
  }> = [];

  for (let i = 0; i < totalUsers; i++) {
    try {
      const user = await createTestUser(i);
      const resumeVersionId = await uploadResumeViaAPI(
        user.userId,
        user.email,
        user.name
      );
      users.push({ ...user, resumeVersionId });

      if ((i + 1) % 10 === 0) {
        console.log(`  ✓ Created ${i + 1}/${totalUsers} users`);
      }
    } catch (error) {
      console.error(`  ✗ Failed to create user ${i}:`, error);
    }
  }

  console.log(`✓ Created ${users.length} users with resumes\n`);

  // Step 2: Get all active jobs and pick random ones
  console.log(`🎯 Step 2: Selecting ${totalJobs} random jobs...`);
  const allJobs = await jobRepo.findActive(1000);

  if (allJobs.length === 0) {
    console.error(
      '✗ No active jobs found in database. Please seed jobs first.'
    );
    process.exit(1);
  }

  if (allJobs.length < totalJobs) {
    console.warn(`⚠ Only ${allJobs.length} jobs available, using all of them`);
  }

  const selectedJobs = randomSample(allJobs, totalJobs);
  console.log(`✓ Selected ${selectedJobs.length} jobs:`);
  selectedJobs.forEach((job, idx) => {
    console.log(`  ${idx + 1}. ${job.title} at ${job.company}`);
  });
  console.log();

  // Step 3: Create applications
  console.log(`📤 Step 3: Creating applications...`);
  let totalApplications = 0;

  for (const job of selectedJobs) {
    const numApplications = randomInt(
      MIN_APPLICATIONS_PER_JOB,
      MAX_APPLICATIONS_PER_JOB
    );
    const applicants = randomSample(users, numApplications);

    console.log(`  Applying ${numApplications} users to: ${job.title}`);

    for (const applicant of applicants) {
      try {
        const submitted = await submitApplicationViaAPI(
          applicant.userId,
          applicant.email,
          job._id.toString(),
          applicant.resumeVersionId
        );
        if (submitted) {
          totalApplications++;
        } else {
          console.log(
            `    ↪ User ${applicant.email} already applied to ${job.title}`
          );
        }
      } catch (error) {
        console.error(`    ✗ Failed to submit application:`, error);
      }
    }
  }

  console.log(`\n✓ Created ${totalApplications} applications\n`);

  // Summary
  console.log(`🎉 Seeding complete!`);
  console.log(`\nSummary:`);
  console.log(`  - Users created: ${users.length}`);
  console.log(`  - Jobs selected: ${selectedJobs.length}`);
  console.log(`  - Applications created: ${totalApplications}`);
  console.log(
    `  - Average applications per job: ${(totalApplications / selectedJobs.length).toFixed(1)}`
  );
  console.log(`\nTest user credentials:`);
  console.log(`  - Email pattern: firstname.lastname.N@testuser.com`);
  console.log(`  - Password: ${DEFAULT_PASSWORD}`);
  console.log(`  - Example: ${users[0]?.email || 'N/A'}`);
}

// Run the script
main()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
