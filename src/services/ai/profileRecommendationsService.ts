import OpenAI from 'openai';
import type {
  EditableProfile,
  CompletenessScore,
} from '../../shared/types/profileEditing';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface RecommendationItem {
  recommendation: string;
  reason: string;
  example?: string;
}

export interface RecommendationSection {
  title: string;
  items: RecommendationItem[];
}

export interface ProfileRecommendations {
  sections: RecommendationSection[];
  summary: string;
}

export async function generateProfileRecommendations(
  profile: EditableProfile,
  completenessScore: CompletenessScore | null
): Promise<ProfileRecommendations> {
  try {
    // Build context about the profile
    const profileContext = {
      summary: profile.summary || 'Not provided',
      about: profile.about || 'Not provided',
      skills: profile.skills?.map(s => s.name).join(', ') || 'None listed',
      experienceCount: profile.experience?.length || 0,
      educationCount: profile.education?.length || 0,
      certificationsCount: profile.certifications?.length || 0,
      completenessScore: completenessScore?.score || 0,
      weakSections: completenessScore
        ? Object.entries(completenessScore.breakdown)
            .filter(([, score]) => score < 0.7)
            .map(([section]) => section)
        : [],
    };

    const prompt = `You are an expert career advisor analyzing a professional profile. Based on the following profile data, provide detailed, personalized recommendations to improve their profile and increase their chances of getting hired.

Profile Summary:
- Professional Summary: ${profileContext.summary}
- About: ${profileContext.about}
- Skills: ${profileContext.skills}
- Work Experience: ${profileContext.experienceCount} positions
- Education: ${profileContext.educationCount} degrees/programs
- Certifications: ${profileContext.certificationsCount} certifications
- Profile Completeness Score: ${profileContext.completenessScore}%
- Weak Sections: ${profileContext.weakSections.join(', ') || 'None'}

Please provide comprehensive recommendations organized into these categories:
1. Professional Summary
2. Skills & Expertise
3. Work Experience
4. Education & Certifications
5. About Section & Personal Branding

For EACH recommendation, provide:
- A clear, actionable recommendation
- The reason why this will help (benefit to the candidate)
- A concrete example they can use or adapt

Format your response as a JSON object with this structure:
{
  "summary": "A brief 2-3 sentence overview of the profile's strengths and key areas for improvement",
  "sections": [
    {
      "title": "Section Name",
      "items": [
        {
          "recommendation": "Clear action to take",
          "reason": "Why this matters and how it helps",
          "example": "Specific example they can use"
        }
      ]
    }
  ]
}

Make recommendations specific, actionable, and personalized based on their actual profile data. Focus on high-impact improvements that will make their profile stand out to recruiters and AI matching systems.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert career advisor and profile optimization specialist. Provide detailed, personalized, and actionable recommendations.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const recommendations: ProfileRecommendations = JSON.parse(response);

    return recommendations;
  } catch (error) {
    // Log error for monitoring
    if (error instanceof Error) {
      // eslint-disable-next-line no-console
      console.error('Error generating profile recommendations:', error.message);
    }

    // Return fallback recommendations if AI fails
    return {
      summary:
        'Complete your profile sections to improve your visibility and match score with potential employers.',
      sections: [
        {
          title: 'Professional Summary',
          items: [
            {
              recommendation:
                'Add a compelling professional summary that highlights your key strengths',
              reason:
                'A strong summary is the first thing recruiters see and helps AI systems understand your expertise',
              example:
                'Experienced Full Stack Developer with 5+ years building scalable web applications. Specialized in React, Node.js, and cloud infrastructure. Passionate about creating user-centric solutions that drive business growth.',
            },
          ],
        },
        {
          title: 'Skills & Expertise',
          items: [
            {
              recommendation:
                'List both technical and soft skills relevant to your target roles',
              reason:
                'Comprehensive skill listings improve your match score with job postings and help recruiters find you',
              example:
                'Technical: JavaScript, TypeScript, React, Node.js, PostgreSQL, AWS. Soft Skills: Team Leadership, Agile Methodologies, Problem Solving, Communication',
            },
          ],
        },
        {
          title: 'Work Experience',
          items: [
            {
              recommendation:
                'Include quantifiable achievements in each role description',
              reason:
                'Numbers and metrics make your impact concrete and memorable',
              example:
                'Increased application performance by 40% through code optimization and caching strategies, resulting in improved user retention',
            },
          ],
        },
        {
          title: 'Education & Certifications',
          items: [
            {
              recommendation:
                'Add relevant certifications and continuing education',
              reason:
                'Certifications demonstrate commitment to professional development and validate your expertise',
              example:
                'AWS Certified Solutions Architect, Google Cloud Professional, Certified Scrum Master (CSM)',
            },
          ],
        },
        {
          title: 'About Section & Personal Branding',
          items: [
            {
              recommendation:
                'Add an engaging about section that tells your professional story',
              reason:
                'Personal narrative helps recruiters understand your motivation and cultural fit',
              example:
                "I discovered my passion for software development while automating tasks in my previous role. Since transitioning to tech, I've focused on building products that solve real-world problems. Outside of work, I contribute to open-source projects and mentor aspiring developers.",
            },
          ],
        },
      ],
    };
  }
}
