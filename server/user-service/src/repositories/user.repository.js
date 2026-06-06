import prisma from "../config/db.js";
class UserRepository {
  async createProfile({ userId, name, email, role }) {
    return await prisma.userProfile.create({
      data: {
        id: userId,
        name,
        email,
        role,
        approvalStatus: role === "STUDENT" ? "APPROVED" : "PENDING",
        isProfileComplete: false,
      },
    });
  }
  async deleteProfileById(userId) {
    return await prisma.userProfile.delete({
      where: { id: userId },
    });
  }
  async findProfileById(userId) {
    return await prisma.userProfile.findFirst({
      where: {
        id: userId,
        isDeleted: false,
      },
      include: {
        identifier: true,
      },
    });
  }
  async findProfileByIdWithIdentifier(userId) {
    return await prisma.userProfile.findFirst({
      where: {
        id: userId,
        isDeleted: false,
      },
      include: { identifier: true },
    });
  }
  async completeStudentProfile(
    userId,
    { university, rollNo, batch, department, degreeProgram }
  ) {
    return await prisma.userProfile.update({
      where: { id: userId },
      data: {
        university,
        isProfileComplete: true,
        identifier: {
          create: {
            identifier: rollNo,
            department,
            batch,
            degreeProgram: degreeProgram ?? null,
          },
        },
      },
      include: { identifier: true },
    });
  }
  async completeInstructorProfile(userId, { employeeId, department }) {
    return await prisma.userProfile.update({
      where: { id: userId },
      data: {
        isProfileComplete: true,
        identifier: {
          create: {
            identifier: employeeId,
            department,
          },
        },
      },
      include: { identifier: true },
    });
  }
  async completeAdminProfile(userId, { university }) {
    return await prisma.userProfile.update({
      where: { id: userId },
      data: {
        university,
        isProfileComplete: true,
      },
    });
  }
  async findProfileByEmail(email) {
    return await prisma.userProfile.findFirst({
      where: {
        email,
        isDeleted: false,
      },
    });
  }
  async updateApprovalStatus(userId, { status, approvedBy }) {
    return await prisma.userProfile.update({
      where: { id: userId },
      data: {
        approvalStatus: status,
        approvedAt: new Date(),
        approvedBy,
      },
    });
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
  async rejectInstructor(instructorId, adminId) {
    return prisma.userProfile.update({
      where: {
        id: instructorId,
      },

      data: {
        approvalStatus: "REJECTED",
        approvedAt: new Date(),
        approvedBy: adminId,
      },
    });
  }
  async findUsers({ role, approvalStatus, university, page, limit, search }) {
    const skip = (page - 1) * limit;

    const where = {
      isDeleted: false,
      ...(role && { role }),
      ...(approvalStatus && { approvalStatus }),
      ...(university && { university }),
      ...(search && {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      prisma.userProfile.findMany({
        where,
        include: { identifier: true },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.userProfile.count({ where }),
    ]);

    return { users, total };
  }
}
export default new UserRepository();
