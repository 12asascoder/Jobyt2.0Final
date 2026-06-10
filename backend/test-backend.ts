import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { CodingSubmissionService } from './src/services/codingSubmission.service';
import { startWorkers } from './src/workers/index';

const prisma = new PrismaClient();

async function main() {
  console.log("Starting background workers...");
  const { codingEvaluationWorker } = await startWorkers();
  codingEvaluationWorker.on('error', (err) => console.error("Worker error:", err));
  codingEvaluationWorker.on('failed', (job, err) => console.error("Job failed:", err));

  console.log("Setting up DB records...");
  const ts = Date.now();
  const shortId = Math.random().toString(36).substring(2, 8).toUpperCase();


  // 1. Create User
  const user = await prisma.users.create({
    data: {
      email: `test_auditor_${ts}@jobyt.com`,
      role: 'applicant',
      auth_provider: 'local',
      is_verified: true,
      referral_code: `A_${shortId}`,
    }
  });

  // 2. Create Recruiter
  const recruiter = await prisma.users.create({
    data: {
      email: `recruiter_auditor_${ts}@jobyt.com`,
      role: 'recruiter',
      auth_provider: 'local',
      is_verified: true,
      referral_code: `R_${shortId}`,
    }
  });

  // 3. Create Problem & Version
  const problem = await prisma.coding_problems.create({
    data: {
      created_by: recruiter.id,
      title: 'Test Problem',
      slug: `test-problem-audit-${ts}`,
      status: 'published',
      difficulty: 'easy',
      supported_languages: ['python', 'javascript'],
      current_version_number: 1,
      time_limit_sec: 5,
      memory_limit_kb: 128000,
    }
  });

  const pv = await prisma.problem_versions.create({
    data: {
      problem_id: problem.id,
      version_number: 1,
      title: 'Test Problem',
      description: 'Print Hello World',
      difficulty: 'easy',
      supported_languages: ['python', 'javascript'],
      time_limit_sec: 5,
      memory_limit_kb: 128000,
      published_by: recruiter.id,
      snapshot_hash: '123'
    }
  });

  await prisma.problem_version_test_cases.create({
    data: {
      problem_version_id: pv.id,
      input: '',
      expected_output: 'Hello World\n',
      is_hidden: true,
      is_sample: false,
      weight: 10,
      order_index: 0
    }
  });

  await prisma.problem_version_test_cases.create({
    data: {
      problem_version_id: pv.id,
      input: '',
      expected_output: 'Hello World\n',
      is_hidden: false,
      is_sample: true,
      weight: 0,
      order_index: 1
    }
  });

  // 4. Create Assessment & Version
  const assessment = await prisma.coding_assessments.create({
    data: {
      recruiter_id: recruiter.id,
      title: 'Audit Assessment',
      status: 'published',
      current_version_number: 1,
      passing_score: 100,
    }
  });

  const av = await prisma.assessment_versions.create({
    data: {
      assessment_id: assessment.id,
      version_number: 1,
      title: 'Audit Assessment',
      passing_score: 100,
      assessment_timing: 'post_apply',
      published_by: recruiter.id,
      snapshot_hash: 'abc'
    }
  });

  await prisma.assessment_version_problems.create({
    data: {
      assessment_version_id: av.id,
      problem_version_id: pv.id,
      order_index: 0,
      points: 100,
    }
  });

  // 5. Create Session
  const session = await prisma.assessment_sessions.create({
    data: {
      assessment_version_id: av.id,
      user_id: user.id,
      status: 'active'
    }
  });

  console.log("Testing 9. Run code through Jobyt backend...");
  const runRes = await CodingSubmissionService.runCode(user.id, {
    problemVersionId: pv.id,
    language: 'python',
    sourceCode: "print('Hello World')"
  });
  console.log("Run Code Result:", runRes);

  console.log("Testing 10. Submit code through Jobyt backend...");
  const subRes = await CodingSubmissionService.submitCode(user.id, {
    problemVersionId: pv.id,
    language: 'python',
    sourceCode: "print('Hello World')",
    assessmentSessionId: session.id
  });
  console.log("Submit Code Result:", subRes);

  console.log("Waiting for background eval queue...");
  let updatedSub;
  for (let i = 0; i < 20; i++) {
    updatedSub = await prisma.coding_submissions.findUnique({
      where: { id: subRes.id },
      include: { submission_test_results: true, code_evaluations: true }
    });
    if (updatedSub?.status === 'completed' || updatedSub?.status === 'failed') break;
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log("Verifying 11, 12, 13...");
  console.log("Submission Status:", updatedSub?.status);
  console.log("Score:", updatedSub?.score);
  console.log("Test Results Count:", updatedSub?.submission_test_results.length);
  console.log("AI Eval Count:", updatedSub?.code_evaluations ? 1 : 0);

  const execLogs = await prisma.execution_logs.count({ where: { user_id: user.id } });
  console.log("Execution Logs Count:", execLogs);

  console.log("Done.");
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
