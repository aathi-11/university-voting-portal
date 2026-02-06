/**
 * Access Control - 23CSE313 Lab Evaluation
 * Implements: Access Control List (ACL) with min 3 subjects, 3 objects.
 * Policy: student=vote only; admin=results + announce + manage; guest=none.
 */

// Subjects (who)
const SUBJECTS = { STUDENT: "student", ADMIN: "admin", GUEST: "guest" };

// Objects (what resource/action)
const OBJECTS = {
  VOTE: "vote",           // cast vote
  RESULTS: "results",     // view vote count
  ANNOUNCE: "announce",   // publish/announce results
  USERS: "users",         // list users (admin)
};

// Access Control Matrix: subject -> [allowed objects]
// Justification: Students may only vote (least privilege). Admins need results + announce for election management. Guests have no access.
const ACL = {
  [SUBJECTS.STUDENT]: [OBJECTS.VOTE],
  [SUBJECTS.ADMIN]: [OBJECTS.VOTE, OBJECTS.RESULTS, OBJECTS.ANNOUNCE, OBJECTS.USERS],
  [SUBJECTS.GUEST]: [],
};

function checkPermission(subject, object) {
  const allowed = ACL[subject];
  if (!allowed) return false;
  return allowed.includes(object);
}

function getRoleFromJwtPayload(payload) {
  const role = payload?.role;
  if (role === "admin") return SUBJECTS.ADMIN;
  if (role === "student") return SUBJECTS.STUDENT;
  return SUBJECTS.GUEST;
}

module.exports = {
  SUBJECTS,
  OBJECTS,
  ACL,
  checkPermission,
  getRoleFromJwtPayload,
};
