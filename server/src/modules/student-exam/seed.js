require('dotenv').config();
const mongoose = require('mongoose');
const SubmittedExam = require('./student-exam-model');

const SAMPLE_DATA = [
  {
    examId: '401',
    studentId: '301',
    answers: [
      {
        questionId: 'q1',
        submittedAnswer: '4'
      },
      {
        questionId: 'q2',
        submittedAnswer: 'The theory of relativity is Einstein\'s groundbreaking theory that describes gravity and motion. Special relativity states that space and time are interconnected, and general relativity describes gravity as the curvature of spacetime caused by massive objects.'
      },
      {
        questionId: 'q3',
        submittedAnswer: 'Relativity consists of special and general relativity. Special relativity deals with objects moving at constant velocities, while general relativity extends this to include gravity and acceleration.'
      }
    ],
    status: 'graded',
    submittedAt: new Date('2026-05-24T12:17:00.000Z')
  },
  {
    examId: '401',
    studentId: '302',
    answers: [
      {
        questionId: 'q1',
        submittedAnswer: '3'
      },
      {
        questionId: 'q2',
        submittedAnswer: 'Relativity is a theory proposed by Albert Einstein about the nature of space and time. It changed our understanding of physics fundamentally.'
      },
      {
        questionId: 'q3',
        submittedAnswer: 'Einstein developed the theory of relativity to explain gravitational phenomena and the behavior of objects at high speeds.'
      }
    ],
    status: 'pending_grading',
    submittedAt: new Date('2026-05-24T13:45:00.000Z')
  },
  {
    examId: '201',
    studentId: '301',
    answers: [
      {
        questionId: 'q1',
        submittedAnswer: '4'
      },
      {
        questionId: 'q2',
        submittedAnswer: 'This is a detailed explanation of the physics concept.'
      }
    ],
    status: 'graded',
    submittedAt: new Date('2026-05-23T10:30:00.000Z')
  },
  {
    examId: '101',
    studentId: '302',
    answers: [
      {
        questionId: 'q1',
        submittedAnswer: '2'
      },
      {
        questionId: 'q2',
        submittedAnswer: 'An incomplete answer to the essay question.'
      }
    ],
    status: 'pending_grading',
    submittedAt: new Date('2026-05-22T14:20:00.000Z')
  },
  {
    examId: '301',
    studentId: '303',
    answers: [
      {
        questionId: 'q1',
        submittedAnswer: '4'
      },
      {
        questionId: 'q2',
        submittedAnswer: 'Comprehensive explanation of the complex physics theory with proper scientific reasoning.'
      },
      {
        questionId: 'q3',
        submittedAnswer: 'A well-structured answer demonstrating deep understanding of the subject matter.'
      }
    ],
    status: 'graded',
    submittedAt: new Date('2026-05-21T09:15:00.000Z')
  },
  {
    examId: '201',
    studentId: '304',
    answers: [
      {
        questionId: 'q1',
        submittedAnswer: '1'
      },
      {
        questionId: 'q2',
        submittedAnswer: 'Another student attempt at answering the question.'
      }
    ],
    status: 'pending_grading',
    submittedAt: new Date('2026-05-24T11:50:00.000Z')
  },
  {
    examId: '401',
    studentId: '304',
    answers: [
      {
        questionId: 'q1',
        submittedAnswer: '4'
      },
      {
        questionId: 'q2',
        submittedAnswer: 'Special relativity and general relativity form the two pillars of Einstein\'s revolutionary theory. Special relativity deals with reference frames in uniform motion and introduces time dilation and length contraction. General relativity extends these concepts to include gravity.'
      },
      {
        questionId: 'q3',
        submittedAnswer: 'Einstein\'s contributions to physics through the theory of relativity revolutionized our understanding of space, time, and gravity.'
      }
    ],
    status: 'graded',
    submittedAt: new Date('2026-05-24T15:30:00.000Z')
  },
  {
    examId: '101',
    studentId: '301',
    answers: [
      {
        questionId: 'q1',
        submittedAnswer: '4'
      },
      {
        questionId: 'q2',
        submittedAnswer: 'A student\'s comprehensive response to the open-ended question.'
      }
    ],
    status: 'graded',
    submittedAt: new Date('2026-05-20T16:45:00.000Z')
  },
  {
    examId: '301',
    studentId: '302',
    answers: [
      {
        questionId: 'q1',
        submittedAnswer: '2'
      },
      {
        questionId: 'q2',
        submittedAnswer: 'The student attempts to explain the complex concept but with incomplete understanding.'
      }
    ],
    status: 'pending_grading',
    submittedAt: new Date('2026-05-23T12:00:00.000Z')
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB');

    // Clear existing data
    await SubmittedExam.deleteMany({});
    console.log('✓ Cleared existing SubmittedExam data');

    // Insert sample data
    const result = await SubmittedExam.insertMany(SAMPLE_DATA);
    console.log(`✓ Successfully inserted ${result.length} sample exam submissions`);

    // Display summary
    console.log('\n--- Seed Summary ---');
    console.log(`Total submissions created: ${result.length}`);
    
    const gradedCount = result.filter(r => r.status === 'graded').length;
    const pendingCount = result.filter(r => r.status === 'pending_grading').length;
    
    console.log(`Graded: ${gradedCount}`);
    console.log(`Pending Grading: ${pendingCount}`);

    // Display sample data
    console.log('\n--- Sample Data Details ---');
    result.forEach((submission, index) => {
      console.log(`\n${index + 1}. Exam: ${submission.examId}, Student: ${submission.studentId}, Status: ${submission.status}`);
      console.log(`   Submitted at: ${submission.submittedAt}`);
      console.log(`   Answers: ${submission.answers.length} question(s)`);
    });

    process.exit(0);
  } catch (error) {
    console.error('✗ Error seeding database:', error.message);
    process.exit(1);
  }
}

// Run seed only if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
