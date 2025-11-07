/**
 * Debug script to check applications and subscriptions
 * Run with: node --import tsx/esm scripts/debug-applications.ts
 */

import { config } from 'dotenv';
import { ObjectId } from 'mongodb';

// Load environment variables
config();

import { getMongoClient } from '../src/data-access/mongoClient';

const TARGET_JOB_ID = '6901abf11f54928bf9275781';

async function debugApplications() {
  try {
    const client = await getMongoClient();
    const db = client.db();

    console.log('\n=== DEBUGGING JOB ID:', TARGET_JOB_ID, '===\n');

    // Check if job exists
    console.log('=== JOB ===');
    const job = await db
      .collection('jobs')
      .findOne({ _id: new ObjectId(TARGET_JOB_ID) });

    if (job) {
      console.log(`✅ Job found: ${job.title} at ${job.company}`);
      console.log(`   Status: ${job.status}, Posted: ${job.postedAt}`);
    } else {
      console.log(`❌ Job NOT found with ID: ${TARGET_JOB_ID}`);
    }

    console.log('\n=== APPLICATIONS FOR THIS JOB ===');
    const applications = await db
      .collection('applications')
      .find({ jobId: TARGET_JOB_ID })
      .toArray();
    console.log(`Found ${applications.length} applications for this job:`);
    applications.forEach((app, i) => {
      console.log(
        `${i + 1}. Candidate: ${app.candidateEmail}, Status: ${app.status}, Score: ${app.matchScore || 'N/A'}`
      );
    });

    console.log('\n=== RECRUITER SUBSCRIPTIONS FOR THIS JOB ===');
    const subscriptions = await db
      .collection('recruiterSubscriptions')
      .find({ jobId: new ObjectId(TARGET_JOB_ID) })
      .toArray();
    console.log(`Found ${subscriptions.length} subscriptions for this job:`);
    subscriptions.forEach((sub, i) => {
      console.log(
        `${i + 1}. Recruiter: ${sub.recruiterId}, Active: ${sub.isActive}, Subscribed: ${sub.subscribedAt}`
      );
    });

    console.log('\n=== ALL SUBSCRIPTIONS (any job) ===');
    const allSubscriptions = await db
      .collection('recruiterSubscriptions')
      .find({})
      .limit(10)
      .toArray();
    console.log(`Found ${allSubscriptions.length} total subscriptions:`);
    allSubscriptions.forEach((sub, i) => {
      console.log(
        `${i + 1}. Recruiter: ${sub.recruiterId}, Job: ${sub.jobId}, Active: ${sub.isActive}`
      );
    });

    console.log('\n=== DIAGNOSIS ===');

    if (applications.length === 0) {
      console.log('❌ No applications found for this job.');
    } else if (subscriptions.length === 0) {
      console.log('❌ No recruiter subscriptions found for this job.');
      console.log(
        '\n💡 TO FIX: Create a subscription for your recruiter user:'
      );
      console.log('   1. Go to /recruiter dashboard');
      console.log('   2. Click "Subscribe" on the job');
      console.log(
        '   OR manually insert into recruiterSubscriptions collection:'
      );
      console.log('   {');
      console.log(`     jobId: ObjectId("${TARGET_JOB_ID}"),`);
      console.log('     recruiterId: "your-recruiter-user-id",');
      console.log('     subscribedAt: new Date(),');
      console.log('     isActive: true,');
      console.log('     notificationsEnabled: true');
      console.log('   }');
    } else {
      console.log('✅ Found both applications and subscriptions for this job!');
      console.log('   Applications should appear in the UI.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugApplications();
