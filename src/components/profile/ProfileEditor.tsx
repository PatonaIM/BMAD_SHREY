'use client';

import { useState, useEffect, useRef } from 'react';
import type { EditableProfile } from '../../shared/types/profileEditing';

interface ProfileEditorProps {
  profile: EditableProfile;
  onChange: (_updated: Partial<EditableProfile>) => void;
  onSave: () => void;
}

const AUTOSAVE_DELAY = 1500; // 1.5 seconds

export function ProfileEditor({
  profile,
  onChange,
  onSave,
}: ProfileEditorProps) {
  const [localProfile, setLocalProfile] = useState(profile);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalProfile(profile);
  }, [profile]);

  const handleChange = (field: keyof EditableProfile, value: unknown) => {
    const updated = { ...localProfile, [field]: value };
    setLocalProfile(updated);
    onChange({ [field]: value });

    // Debounced auto-save
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      onSave();
    }, AUTOSAVE_DELAY);
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Summary
        </label>
        <textarea
          value={localProfile.summaryOverride || localProfile.summary || ''}
          onChange={e => handleChange('summaryOverride', e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Professional summary..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          About
        </label>
        <textarea
          value={localProfile.about || ''}
          onChange={e => handleChange('about', e.target.value)}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Tell us about yourself, your interests, and goals..."
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="isPrivate"
          checked={localProfile.isPrivate || false}
          onChange={e => handleChange('isPrivate', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="isPrivate" className="ml-2 block text-sm text-gray-700">
          Make profile private
        </label>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Skills</h3>
        <p className="text-sm text-gray-600 mb-3">
          Add or remove skills from your profile
        </p>
        <div className="space-y-3">
          {(localProfile.skills || []).map((skill, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <input
                type="text"
                value={skill.name}
                onChange={e => {
                  const updated = [...(localProfile.skills || [])];
                  updated[idx] = { ...skill, name: e.target.value };
                  handleChange('skills', updated);
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Skill name"
              />
              <select
                value={skill.proficiency || 'intermediate'}
                onChange={e => {
                  const updated = [...(localProfile.skills || [])];
                  updated[idx] = {
                    ...skill,
                    proficiency: e.target.value as
                      | 'beginner'
                      | 'intermediate'
                      | 'advanced'
                      | 'expert',
                  };
                  handleChange('skills', updated);
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  const updated = (localProfile.skills || []).filter(
                    (_, i) => i !== idx
                  );
                  handleChange('skills', updated);
                }}
                className="px-3 py-2 text-red-600 hover:text-red-800 border border-red-300 rounded-md hover:bg-red-50"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const updated = [
                ...(localProfile.skills || []),
                {
                  name: '',
                  proficiency: 'intermediate' as const,
                  category: 'technical' as const,
                },
              ];
              handleChange('skills', updated);
            }}
            className="px-4 py-2 text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md hover:bg-blue-50"
          >
            + Add Skill
          </button>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Experience</h3>
        <p className="text-sm text-gray-600 mb-3">
          Add or update your work experience
        </p>
        <div className="space-y-4">
          {(localProfile.experience || []).map((exp, idx) => (
            <div
              key={idx}
              className="p-4 border border-gray-200 rounded-lg space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={exp.position}
                    onChange={e => {
                      const updated = [...(localProfile.experience || [])];
                      updated[idx] = { ...exp, position: e.target.value };
                      handleChange('experience', updated);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Software Engineer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Company
                  </label>
                  <input
                    type="text"
                    value={exp.company}
                    onChange={e => {
                      const updated = [...(localProfile.experience || [])];
                      updated[idx] = {
                        ...exp,
                        company: e.target.value,
                      };
                      handleChange('experience', updated);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Company Name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Start Date
                  </label>
                  <input
                    type="text"
                    value={exp.startDate || ''}
                    onChange={e => {
                      const updated = [...(localProfile.experience || [])];
                      updated[idx] = {
                        ...exp,
                        startDate: e.target.value,
                      };
                      handleChange('experience', updated);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="2020-01"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    End Date (leave empty if current)
                  </label>
                  <input
                    type="text"
                    value={exp.endDate || ''}
                    onChange={e => {
                      const updated = [...(localProfile.experience || [])];
                      updated[idx] = {
                        ...exp,
                        endDate: e.target.value || undefined,
                        isCurrent: !e.target.value,
                      };
                      handleChange('experience', updated);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="2023-01 or leave empty"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Description
                </label>
                <textarea
                  value={exp.description || ''}
                  onChange={e => {
                    const updated = [...(localProfile.experience || [])];
                    updated[idx] = {
                      ...exp,
                      description: e.target.value,
                    };
                    handleChange('experience', updated);
                  }}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe your responsibilities and achievements..."
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const updated = (localProfile.experience || []).filter(
                    (_, i) => i !== idx
                  );
                  handleChange('experience', updated);
                }}
                className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded-md hover:bg-red-50"
              >
                Remove Experience
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const updated = [
                ...(localProfile.experience || []),
                {
                  position: '',
                  company: '',
                  startDate: '',
                  endDate: undefined,
                  isCurrent: false,
                  description: '',
                },
              ];
              handleChange('experience', updated);
            }}
            className="px-4 py-2 text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md hover:bg-blue-50"
          >
            + Add Experience
          </button>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Education</h3>
        <p className="text-sm text-gray-600 mb-3">
          Add or update your educational background
        </p>
        <div className="space-y-4">
          {(localProfile.education || []).map((edu, idx) => (
            <div
              key={idx}
              className="p-4 border border-gray-200 rounded-lg space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Degree
                  </label>
                  <input
                    type="text"
                    value={edu.degree || ''}
                    onChange={e => {
                      const updated = [...(localProfile.education || [])];
                      updated[idx] = { ...edu, degree: e.target.value };
                      handleChange('education', updated);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Bachelor of Science"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Field of Study
                  </label>
                  <input
                    type="text"
                    value={edu.fieldOfStudy || ''}
                    onChange={e => {
                      const updated = [...(localProfile.education || [])];
                      updated[idx] = {
                        ...edu,
                        fieldOfStudy: e.target.value,
                      };
                      handleChange('education', updated);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Computer Science"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Institution
                  </label>
                  <input
                    type="text"
                    value={edu.institution}
                    onChange={e => {
                      const updated = [...(localProfile.education || [])];
                      updated[idx] = {
                        ...edu,
                        institution: e.target.value,
                      };
                      handleChange('education', updated);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="University Name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Graduation Year
                  </label>
                  <input
                    type="text"
                    value={edu.endDate || ''}
                    onChange={e => {
                      const updated = [...(localProfile.education || [])];
                      updated[idx] = {
                        ...edu,
                        endDate: e.target.value,
                      };
                      handleChange('education', updated);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="2020"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const updated = (localProfile.education || []).filter(
                    (_, i) => i !== idx
                  );
                  handleChange('education', updated);
                }}
                className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded-md hover:bg-red-50"
              >
                Remove Education
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const updated = [
                ...(localProfile.education || []),
                {
                  institution: '',
                  degree: '',
                  fieldOfStudy: '',
                  startDate: '',
                  endDate: '',
                },
              ];
              handleChange('education', updated);
            }}
            className="px-4 py-2 text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md hover:bg-blue-50"
          >
            + Add Education
          </button>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Achievements</h3>
        <p className="text-sm text-gray-600 mb-3">
          Highlight your key accomplishments from each role
        </p>
        <div className="space-y-4">
          {(localProfile.experience || []).map((exp, expIdx) =>
            exp.achievements && exp.achievements.length > 0 ? (
              <div
                key={expIdx}
                className="p-4 border border-gray-200 rounded-lg space-y-3"
              >
                <h4 className="font-medium text-gray-800">
                  {exp.position} at {exp.company}
                </h4>
                {exp.achievements.map((achievement, achIdx) => (
                  <div key={achIdx} className="flex items-start gap-3">
                    <textarea
                      value={achievement}
                      onChange={e => {
                        const updatedExp = [...(localProfile.experience || [])];
                        const currentExp = updatedExp[expIdx];
                        if (currentExp) {
                          const updatedAchievements = [
                            ...(currentExp.achievements || []),
                          ];
                          updatedAchievements[achIdx] = e.target.value;
                          updatedExp[expIdx] = {
                            ...currentExp,
                            achievements: updatedAchievements,
                          };
                          handleChange('experience', updatedExp);
                        }
                      }}
                      rows={2}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe a specific achievement..."
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updatedExp = [...(localProfile.experience || [])];
                        const currentExp = updatedExp[expIdx];
                        if (currentExp) {
                          const updatedAchievements = (
                            currentExp.achievements || []
                          ).filter((_, i) => i !== achIdx);
                          updatedExp[expIdx] = {
                            ...currentExp,
                            achievements: updatedAchievements,
                          };
                          handleChange('experience', updatedExp);
                        }
                      }}
                      className="px-3 py-2 text-red-600 hover:text-red-800 border border-red-300 rounded-md hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const updatedExp = [...(localProfile.experience || [])];
                    const currentExp = updatedExp[expIdx];
                    if (currentExp) {
                      updatedExp[expIdx] = {
                        ...currentExp,
                        achievements: [...(currentExp.achievements || []), ''],
                      };
                      handleChange('experience', updatedExp);
                    }
                  }}
                  className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md hover:bg-blue-50"
                >
                  + Add Achievement to This Role
                </button>
              </div>
            ) : null
          )}
          <div className="text-sm text-gray-500 italic">
            To add achievements, first add them within the Experience section
            above, or add achievements to existing roles here:
          </div>
          {(localProfile.experience || []).map((exp, expIdx) =>
            !exp.achievements || exp.achievements.length === 0 ? (
              <div
                key={expIdx}
                className="p-3 border border-gray-200 rounded-lg flex items-center justify-between"
              >
                <span className="text-sm text-gray-700">
                  {exp.position} at {exp.company}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const updatedExp = [...(localProfile.experience || [])];
                    const currentExp = updatedExp[expIdx];
                    if (currentExp) {
                      updatedExp[expIdx] = {
                        ...currentExp,
                        achievements: [''],
                      };
                      handleChange('experience', updatedExp);
                    }
                  }}
                  className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md hover:bg-blue-50"
                >
                  + Add Achievement
                </button>
              </div>
            ) : null
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Certifications
        </h3>
        <p className="text-sm text-gray-600 mb-3">
          Add professional certifications and credentials
        </p>
        <div className="space-y-4">
          {(localProfile.certifications || []).map((cert, idx) => (
            <div
              key={idx}
              className="p-4 border border-gray-200 rounded-lg space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Certification Name
                  </label>
                  <input
                    type="text"
                    value={cert.name}
                    onChange={e => {
                      const updated = [...(localProfile.certifications || [])];
                      updated[idx] = { ...cert, name: e.target.value };
                      handleChange('certifications', updated);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="AWS Solutions Architect"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Issuing Organization
                  </label>
                  <input
                    type="text"
                    value={cert.issuer}
                    onChange={e => {
                      const updated = [...(localProfile.certifications || [])];
                      updated[idx] = { ...cert, issuer: e.target.value };
                      handleChange('certifications', updated);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Amazon Web Services"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Issue Date
                  </label>
                  <input
                    type="text"
                    value={cert.issueDate || ''}
                    onChange={e => {
                      const updated = [...(localProfile.certifications || [])];
                      updated[idx] = {
                        ...cert,
                        issueDate: e.target.value,
                      };
                      handleChange('certifications', updated);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="2023-01"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Expiry Date (optional)
                  </label>
                  <input
                    type="text"
                    value={cert.expiryDate || ''}
                    onChange={e => {
                      const updated = [...(localProfile.certifications || [])];
                      updated[idx] = {
                        ...cert,
                        expiryDate: e.target.value || undefined,
                      };
                      handleChange('certifications', updated);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="2026-01 or leave empty"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Credential ID (optional)
                  </label>
                  <input
                    type="text"
                    value={cert.credentialId || ''}
                    onChange={e => {
                      const updated = [...(localProfile.certifications || [])];
                      updated[idx] = {
                        ...cert,
                        credentialId: e.target.value,
                      };
                      handleChange('certifications', updated);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ABC123XYZ"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Verification URL (optional)
                  </label>
                  <input
                    type="text"
                    value={cert.url || ''}
                    onChange={e => {
                      const updated = [...(localProfile.certifications || [])];
                      updated[idx] = {
                        ...cert,
                        url: e.target.value,
                      };
                      handleChange('certifications', updated);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://..."
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const updated = (localProfile.certifications || []).filter(
                    (_, i) => i !== idx
                  );
                  handleChange('certifications', updated);
                }}
                className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded-md hover:bg-red-50"
              >
                Remove Certification
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const updated = [
                ...(localProfile.certifications || []),
                {
                  name: '',
                  issuer: '',
                  issueDate: '',
                  expiryDate: '',
                  credentialId: '',
                  url: '',
                },
              ];
              handleChange('certifications', updated);
            }}
            className="px-4 py-2 text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md hover:bg-blue-50"
          >
            + Add Certification
          </button>
        </div>
      </div>
    </div>
  );
}
