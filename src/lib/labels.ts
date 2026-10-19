/** Human wording for permissions, roles and org kinds. */

export const PERMISSION_LABELS: Record<string, string> = {
  'org.read': 'See your organisation’s space',
  'org.settings.update': 'Change organisation settings',
  'org.members.read': 'See who’s in the organisation',
  'org.members.invite': 'Invite people',
  'org.members.update': 'Update members and move them between teams',
  'org.members.remove': 'Remove members',
  'org.roles.assign': 'Give people roles',
  'org.roles.revoke': 'Take roles away',
  'org.units.manage': 'Organise departments and teams',
  'org.groups.manage': 'Manage groups',
  'org.reports.read': 'Read progress reports',
  'learning.assign': 'Assign learning to people',
  'course.content.edit': 'Build and edit course content',
  'course.publish': 'Publish courses',
  'course.analytics.read': 'See how a course is going',
  'course_run.teach': 'Teach live classes',
  'submission.grade': 'Grade submissions',
  'mentorship.conduct': 'Mentor learners',
};

/** Roles an org admin can hand out from the members screen, simplest first. */
export const INVITABLE_ROLES: { key: string; label: string; hint: string }[] = [
  { key: 'learner', label: 'Learner', hint: 'Takes courses' },
  { key: 'instructor', label: 'Instructor', hint: 'Teaches and grades' },
  { key: 'author', label: 'Course author', hint: 'Builds content' },
  { key: 'mentor', label: 'Mentor', hint: 'Guides learners' },
  { key: 'analyst', label: 'Analyst', hint: 'Reads reports' },
  { key: 'org_admin', label: 'Admin', hint: 'Runs the organisation' },
];

export const ROLE_LABELS: Record<string, string> = Object.fromEntries([
  ...INVITABLE_ROLES.map((r) => [r.key, r.label]),
  ['platform_admin', 'Platform admin'],
  ['unit_admin', 'Team admin'],
  ['applicant', 'Applicant'],
  ['student', 'Student'],
  ['alumni', 'Alumni'],
  ['grader', 'Grader'],
  ['sponsor_viewer', 'Sponsor'],
]);

export const KIND_LABELS: Record<string, string> = {
  enterprise: 'Company or team',
  institution: 'School or academy',
  partner: 'Content partner',
  sponsor: 'Sponsor or funder',
  platform: 'Platform',
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
