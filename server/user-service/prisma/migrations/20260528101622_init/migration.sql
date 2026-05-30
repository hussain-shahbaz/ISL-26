-- CreateTable
CREATE TABLE `UserProfile` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `role` ENUM('ADMIN', 'INSTRUCTOR', 'STUDENT') NOT NULL DEFAULT 'STUDENT',
    `university` VARCHAR(50) NULL,
    `avatarUrl` VARCHAR(500) NULL,
    `bio` TEXT NULL,
    `isProfileComplete` BOOLEAN NOT NULL DEFAULT false,
    `approvalStatus` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `approvedAt` DATETIME(3) NULL,
    `approvedBy` VARCHAR(191) NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UserProfile_email_key`(`email`),
    INDEX `UserProfile_email_idx`(`email`),
    INDEX `UserProfile_role_idx`(`role`),
    INDEX `UserProfile_university_idx`(`university`),
    INDEX `UserProfile_approvalStatus_idx`(`approvalStatus`),
    INDEX `UserProfile_role_university_idx`(`role`, `university`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserIdentifier` (
    `id` VARCHAR(191) NOT NULL,
    `identifier` VARCHAR(50) NOT NULL,
    `department` VARCHAR(100) NULL,
    `degreeProgram` VARCHAR(100) NULL,
    `batch` INTEGER NULL,
    `profileId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `UserIdentifier_identifier_key`(`identifier`),
    UNIQUE INDEX `UserIdentifier_profileId_key`(`profileId`),
    INDEX `UserIdentifier_identifier_idx`(`identifier`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserIdentifier` ADD CONSTRAINT `UserIdentifier_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `UserProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
