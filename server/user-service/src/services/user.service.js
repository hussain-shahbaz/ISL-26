import userRepository from "../repositories/user.repository.js";
class UserService {
  async createProfile(data) {
    const existingProfile = await userRepository.findProfileByEmail(data.email);
    if (existingProfile) {
      throw new Error("PROFILE_ALREADY_EXISTS");
    }
    // Prevent users from self-registering as ADMIN
    if (data.role === "ADMIN") {
      throw new Error("CANNOT_SELF_REGISTER_AS_ADMIN");
    }
    if (!data.userId) {
      throw new Error("USER_ID_REQUIRED");
    }
    return await userRepository.createProfile({
      userId: data.userId,
      name: data.name,
      email: data.email,
      role: data.role,
    });
  }
  async rollbackProfile(userId) {
    return await userRepository.deleteProfileById(userId);
  }
  async getProfile(userId) {
    const profile = await userRepository.findProfileById(userId);
    if (!profile) {
      throw new Error("PROFILE_NOT_FOUND");
    }
    return profile;
  }
  async completeProfile(userId, data) {
    // fetch profile first
    const profile = await userRepository.findProfileByIdWithIdentifier(userId);
    if (!profile) {
      throw new Error("PROFILE_NOT_FOUND");
    }
    // already completed
    if (profile.isProfileComplete) {
      throw new Error("PROFILE_ALREADY_COMPLETE");
    }
    // role in JWT must match role in DB
    if (profile.role !== data.role) {
      throw new Error("ROLE_MISMATCH");
    }
    // call correct repo method based on role
    if (data.role === "STUDENT") {
      return await userRepository.completeStudentProfile(userId, data);
    }
    if (data.role === "INSTRUCTOR") {
      return await userRepository.completeInstructorProfile(userId, data);
    }
    if (data.role === "ADMIN") {
      return await userRepository.completeAdminProfile(userId, data);
    }
  }
  async updateApproval(userId, { status, approvedBy }) {
    // fetch user
    const user = await userRepository.findProfileById(userId);
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }
    // only INSTRUCTOR and ADMIN need approval
    if (user.role === "STUDENT") {
      throw new Error("STUDENTS_DONT_NEED_APPROVAL");
    }
    // must be PENDING to approve/reject
    if (user.approvalStatus !== "PENDING") {
      throw new Error("USER_NOT_PENDING");
    }
    return await userRepository.updateApprovalStatus(userId, {
      status,
      approvedBy,
    });
  }
  async getStudents({ university, page, limit, search }) {
    return await userRepository.findUsers({
      role: "STUDENT",
      university,
      page,
      limit,
      search,
    });
  }

  async resolveStudentsByEmails(emails) {
    const users = await userRepository.findStudentsByEmails(emails);
    const byEmail = new Map(users.map((u) => [u.email.trim(), u]));
    const matched = [];
    const unmatched = [];
    for (const email of emails) {
      const user = byEmail.get(email);
      if (user) matched.push({ id: user.id, name: user.name, email: user.email });
      else unmatched.push(email);
    }
    return { matched, unmatched };
  }

  async getInstructors({ page, limit, search }) {
    return await userRepository.findUsers({
      role: "INSTRUCTOR",
      page,
      limit,
      search,
    });
  }

  async getPendingUsers({ university, page, limit }) {
    return await userRepository.findUsers({
      role: "INSTRUCTOR",
      approvalStatus: "PENDING",
      university,
      page,
      limit,
    });
  }
  async rejectInstructor(instructorId, adminId) {
    const instructor = await userRepository.findProfileById(instructorId);

    if (!instructor) {
      throw new Error("Instructor not found");
    }

    if (instructor.role !== "INSTRUCTOR") {
      throw new Error("User is not an instructor");
    }

    if (instructor.approvalStatus === "REJECTED") {
      throw new Error("Instructor already rejected");
    }

    return userRepository.rejectInstructor(instructorId, adminId);
  }
}
export default new UserService();
