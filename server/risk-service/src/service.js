const { run } = require('./neo4j');

// Graph model
//   (:Student {id})
//   (:Device {fingerprint})  (:Network {ip})  (:Exam {id})
//   (Student)-[:USED_DEVICE {lastSeen}]->(Device)
//   (Student)-[:USED_NETWORK {lastSeen}]->(Network)
//   (Student)-[:TOOK]->(Exam)
//
// Shared devices / networks across distinct students are the signal for
// collusion rings and multi-account abuse.

class RiskService {
  // Ingest an integrity event. type: 'login' | 'submission'.
  async ingest(event) {
    const { type, studentId, deviceFingerprint, ip, examId } = event;
    if (!studentId) throw new Error('studentId is required');

    const at = new Date().toISOString();

    if (deviceFingerprint) {
      await run(
        `MERGE (s:Student {id: $studentId})
         MERGE (d:Device {fingerprint: $deviceFingerprint})
         MERGE (s)-[r:USED_DEVICE]->(d)
         SET r.lastSeen = $at`,
        { studentId, deviceFingerprint, at },
      );
    }

    if (ip) {
      await run(
        `MERGE (s:Student {id: $studentId})
         MERGE (n:Network {ip: $ip})
         MERGE (s)-[r:USED_NETWORK]->(n)
         SET r.lastSeen = $at`,
        { studentId, ip, at },
      );
    }

    if (type === 'submission' && examId) {
      await run(
        `MERGE (s:Student {id: $studentId})
         MERGE (e:Exam {id: $examId})
         MERGE (s)-[r:TOOK]->(e)
         SET r.submittedAt = $at`,
        { studentId, examId, at },
      );
    }

    return { ok: true };
  }

  // Pairs of distinct students sharing a device or network. Optionally scoped
  // to a single exam (both students must have taken it).
  async collusionPairs(examId) {
    const took = examId
      ? 'AND (s1)-[:TOOK]->(:Exam {id: $examId}) AND (s2)-[:TOOK]->(:Exam {id: $examId})'
      : '';

    const cypher = `
      MATCH (s1:Student)-[:USED_DEVICE]->(d:Device)<-[:USED_DEVICE]-(s2:Student)
      WHERE s1.id < s2.id ${took}
      RETURN s1.id AS studentA, s2.id AS studentB, 'device' AS via, d.fingerprint AS shared
      UNION
      MATCH (s1:Student)-[:USED_NETWORK]->(n:Network)<-[:USED_NETWORK]-(s2:Student)
      WHERE s1.id < s2.id ${took}
      RETURN s1.id AS studentA, s2.id AS studentB, 'network' AS via, n.ip AS shared
    `;
    return run(cypher, { examId });
  }

  // Collusion rings: connected components of students linked by shared devices
  // or networks (groups of 2+). Uses GDS-free pure Cypher path expansion.
  async collusionRings(examId) {
    const pairs = await this.collusionPairs(examId);
    // Union-find over the returned pairs to build rings.
    const parent = new Map();
    const find = (x) => {
      if (!parent.has(x)) parent.set(x, x);
      while (parent.get(x) !== x) {
        parent.set(x, parent.get(parent.get(x)));
        x = parent.get(x);
      }
      return x;
    };
    const union = (a, b) => parent.set(find(a), find(b));

    for (const p of pairs) union(p.studentA, p.studentB);

    const groups = new Map();
    for (const x of parent.keys()) {
      const root = find(x);
      if (!groups.has(root)) groups.set(root, new Set());
      groups.get(root).add(x);
    }

    return Array.from(groups.values())
      .map((set) => Array.from(set))
      .filter((members) => members.length >= 2)
      .map((members) => ({
        members,
        size: members.length,
        links: pairs.filter((p) => members.includes(p.studentA) && members.includes(p.studentB)),
      }))
      .sort((a, b) => b.size - a.size);
  }

  // Per-student risk profile: shared devices/networks and peers reached.
  async studentRisk(studentId) {
    const rows = await run(
      `MATCH (s:Student {id: $studentId})
       OPTIONAL MATCH (s)-[:USED_DEVICE]->(d:Device)<-[:USED_DEVICE]-(peer:Student)
       WHERE peer.id <> s.id
       OPTIONAL MATCH (s)-[:USED_NETWORK]->(n:Network)<-[:USED_NETWORK]-(peer2:Student)
       WHERE peer2.id <> s.id
       RETURN
         collect(DISTINCT d.fingerprint) AS sharedDevices,
         collect(DISTINCT peer.id) AS devicePeers,
         collect(DISTINCT n.ip) AS sharedNetworks,
         collect(DISTINCT peer2.id) AS networkPeers`,
      { studentId },
    );
    const r = rows[0] || {};
    const sharedDevices = (r.sharedDevices || []).filter(Boolean);
    const sharedNetworks = (r.sharedNetworks || []).filter(Boolean);
    const peers = new Set([...(r.devicePeers || []), ...(r.networkPeers || [])].filter(Boolean));
    // Simple, explainable score: weight shared devices heavily, peers moderately.
    const score = Math.min(100, sharedDevices.length * 40 + peers.size * 20 + sharedNetworks.length * 10);
    return {
      studentId,
      score,
      level: score >= 70 ? 'high' : score >= 35 ? 'medium' : 'low',
      sharedDevices,
      sharedNetworks,
      peers: Array.from(peers),
    };
  }

  async overview() {
    const rows = await run(
      `MATCH (s:Student) WITH count(s) AS students
       MATCH (d:Device) WITH students, count(d) AS devices
       MATCH (n:Network) RETURN students, devices, count(n) AS networks`,
    );
    return rows[0] || { students: 0, devices: 0, networks: 0 };
  }
}

module.exports = new RiskService();
