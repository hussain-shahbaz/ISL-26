// Seeds a small, realistic integrity graph so the analytics endpoints have
// something to find. Run with: npm run seed (needs Neo4j running).
const { run, initSchema, close } = require('./neo4j');
const riskService = require('./service');

async function seed() {
  await initSchema();
  await run('MATCH (n) DETACH DELETE n');

  const examId = 'demo-exam-1';

  // A clean cohort.
  const events = [
    { type: 'submission', studentId: 'stu-alice', deviceFingerprint: 'fp-alice', ip: '10.0.0.11', examId },
    { type: 'submission', studentId: 'stu-bob', deviceFingerprint: 'fp-bob', ip: '10.0.0.12', examId },

    // Collusion ring 1: carol & dave share a device (same machine).
    { type: 'submission', studentId: 'stu-carol', deviceFingerprint: 'fp-shared-1', ip: '10.0.0.21', examId },
    { type: 'submission', studentId: 'stu-dave', deviceFingerprint: 'fp-shared-1', ip: '10.0.0.22', examId },

    // Collusion ring 2: erin, frank, grace all behind one NAT/IP.
    { type: 'submission', studentId: 'stu-erin', deviceFingerprint: 'fp-erin', ip: '203.0.113.7', examId },
    { type: 'submission', studentId: 'stu-frank', deviceFingerprint: 'fp-frank', ip: '203.0.113.7', examId },
    { type: 'submission', studentId: 'stu-grace', deviceFingerprint: 'fp-grace', ip: '203.0.113.7', examId },
  ];

  for (const e of events) await riskService.ingest(e);

  const rings = await riskService.collusionRings(examId);
  console.log(`Seeded ${events.length} events. Collusion rings found: ${rings.length}`);
  rings.forEach((r, i) => console.log(`  Ring ${i + 1} (${r.size}): ${r.members.join(', ')}`));

  await close();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
