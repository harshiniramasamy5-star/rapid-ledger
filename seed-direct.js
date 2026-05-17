const { execSync } = require('child_process');
const path = require('path');
const DB = path.join(process.env.HOME, 'rapid-ledger', 'apps', 'api', 'dev.db');
const PW = '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu3GS';
const now = new Date().toISOString();
function sql(q) { try { execSync(`sqlite3 "${DB}" ${JSON.stringify(q)}`, {stdio:'pipe'}); } catch(e) { console.error('SQL error:', e.message); } }
function id() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
const u = { creator:id(), admin:id(), approver:id(), decider:id(), performer:id(), auditor:id() };
sql(`INSERT OR REPLACE INTO User VALUES ('${u.creator}','Charlie Creator','creator@rapid.dev','${PW}','creator','Product',1,'${now}','${now}')`);
sql(`INSERT OR REPLACE INTO User VALUES ('${u.admin}','Alice Admin','admin@rapid.dev','${PW}','admin','Engineering',1,'${now}','${now}')`);
sql(`INSERT OR REPLACE INTO User VALUES ('${u.approver}','Sarah Security','approver@rapid.dev','${PW}','approver','Security',1,'${now}','${now}')`);
sql(`INSERT OR REPLACE INTO User VALUES ('${u.decider}','Dana Decide','decider@rapid.dev','${PW}','decision_owner','Engineering',1,'${now}','${now}')`);
sql(`INSERT OR REPLACE INTO User VALUES ('${u.performer}','Pete Perform','performer@rapid.dev','${PW}','performer','Platform',1,'${now}','${now}')`);
sql(`INSERT OR REPLACE INTO User VALUES ('${u.auditor}','Arthur Audit','auditor@rapid.dev','${PW}','auditor','Compliance',1,'${now}','${now}')`);
console.log('Created 6 users');
const docId = id();
const deadline = new Date(Date.now()+14*86400000).toISOString();
sql(`INSERT OR REPLACE INTO RapidDocument VALUES ('${docId}','RAPID-001','Migrate deployment approvals from Slack to GitHub PRs','Replace Slack approvals with GitHub PR gates.','Slack approvals are not auditable.','No formal approval trail.','Use GitHub required reviewers.','1. Keep Slack (rejected).','high',1,'Engineering','${deadline}','draft',1,NULL,'${u.creator}','${now}','${now}',NULL,NULL)`);
sql(`INSERT OR REPLACE INTO RapidRoleAssignment VALUES ('${id()}','${docId}','recommend','${u.creator}','${now}')`);
sql(`INSERT OR REPLACE INTO RapidRoleAssignment VALUES ('${id()}','${docId}','agree','${u.approver}','${now}')`);
sql(`INSERT OR REPLACE INTO RapidRoleAssignment VALUES ('${id()}','${docId}','perform','${u.performer}','${now}')`);
sql(`INSERT OR REPLACE INTO RapidRoleAssignment VALUES ('${id()}','${docId}','decide','${u.decider}','${now}')`);
sql(`INSERT OR REPLACE INTO Evidence VALUES ('${id()}','${docId}','link','Security policy','https://example.com/policy','Deployment requirements.','${u.creator}','${now}')`);
console.log('Created RAPID-001');
console.log('Done! Password for all users: password123');
