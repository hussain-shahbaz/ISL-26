export const formatStudent = (profile) => ({
  id: profile.id,
  name: profile.name,
  email: profile.email,
  university: profile.university,
  isProfileComplete: profile.isProfileComplete,
  approvalStatus: profile.approvalStatus,
  createdAt: profile.createdAt,
  identifier: profile.identifier
    ? {
        rollNo: profile.identifier.identifier,
        department: profile.identifier.department,
        degreeProgram: profile.identifier.degreeProgram,
        batch: profile.identifier.batch,
      }
    : null,
});

export const formatInstructor = (profile) => ({
  id: profile.id,
  name: profile.name,
  email: profile.email,
  isProfileComplete: profile.isProfileComplete,
  approvalStatus: profile.approvalStatus,
  approvedAt: profile.approvedAt,
  createdAt: profile.createdAt,
  identifier: profile.identifier
    ? {
        employeeId: profile.identifier.identifier,
        department: profile.identifier.department,
      }
    : null,
});

export const formatPending = (profile) => ({
  id: profile.id,
  name: profile.name,
  email: profile.email,
  role: profile.role,
  isProfileComplete: profile.isProfileComplete,
  approvalStatus: profile.approvalStatus,
  createdAt: profile.createdAt,
  identifier: profile.identifier
    ? {
        employeeId: profile.identifier.identifier,
        department: profile.identifier.department,
      }
    : null,
});

export const formatProfile = (profile) => ({
  id: profile.id,
  name: profile.name,
  email: profile.email,
  role: profile.role,
  university: profile.university,
  bio: profile.bio,
  avatarUrl: profile.avatarUrl,
  isProfileComplete: profile.isProfileComplete,
  approvalStatus: profile.approvalStatus,
  createdAt: profile.createdAt,
  identifier: profile.identifier
    ? {
        identifier: profile.identifier.identifier,
        department: profile.identifier.department,
        degreeProgram: profile.identifier.degreeProgram,
        batch: profile.identifier.batch,
      }
    : null,
});

export const buildPagination = ({ total, page, limit }) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
});