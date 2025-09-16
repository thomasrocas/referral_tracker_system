// agent/runner.js
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const { Octokit } = require('@octokit/rest');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY;     // owner/name
const RUN_ID = process.env.GITHUB_RUN_ID;
const EVENT_PATH = process.env.GITHUB_EVENT_PATH;
const MODEL = process.env.AGENT_MODEL || 'gpt-4.1';
const MAX_STEPS = parseInt(process.env.AGENT_MAX_STEPS || '6', 10);
const SELF_HEAL = parseInt(process.env.AGENT_SELF_HEAL_RETRIES || '2', 10);

if (!OPENAI_API_KEY || !GITHUB_TOKEN || !REPO || !EVENT_PATH) {
  console.error('Missing env vars OPENAI_API_KEY/GITHUB_TOKEN/GITHUB_REPOSITORY/GITHUB_EVENT_PATH');
  process.exit(1);
}

const [owner, repo] = REPO.split('/');
const octokit = new Octokit({ auth: GITHUB_TOKEN });
const event = JSON.parse(fs.readFileSync(EVENT_PATH, 'utf8'));
const issue = event.issue || null;

function sh(cmd) { return execSync(cmd, { stdio: 'pipe' }).toString().trim(); }
function run(cmd) { const p = spawnSync(cmd, { shell: true, encoding: 'utf8' }); return { code: p.status, out: p.stdout, err: p.stderr }; }
async function comment(body) { if (issue) await octokit.issues.createComment({ owner, repo, issue_number: issue.number, body }); }

async function openai(messages) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, temperature: 0.2, messages })
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function ensurePR(branch, title, body) {
  const prs = await octokit.pulls.list({ owner, repo, state: 'open', head: `${owner}:${branch}` });
  if (prs.data.length) return prs.data[0].number;
  const pr = await octokit.pulls.create({ owner, repo, title, head: branch, base: 'main', body });
  return pr.number;
}

function runTests() {
  let r = run('npm run -s format || true'); // optional
  r = run('npm run -s lint || true');       // optional if you don’t have these yet
  r = run('npm test --silent || npm -s test || true');
  // build step optional; skip if absent
  r = run('npm run -s build || true');
  return r;
}

(async () => {
  if (!issue) { console.log('No issue payload; exiting.'); return; }
  const labels = (issue.labels || []).map(l => (typeof l === 'string' ? l : l.name));
  if (!labels.includes('auto')) { console.log('Issue not labeled auto; exiting.'); return; }

  await comment(`🤖 Auto-Dev Agent starting (run ${RUN_ID}). Planning…`);
  const branch = `auto/${issue.number}-${Math.random().toString(36).slice(2,8)}`;
  const base = sh('git rev-parse origin/main || git rev-parse HEAD');
  try { sh(`git checkout -b ${branch} ${base}`); } catch { sh(`git checkout -b ${branch}`); }

  const repoTree = sh('git ls-files | head -n 400').split('\n').join('\n- ');
  const sys = [{ role: 'system', content:
`You are a meticulous senior engineer-bot.
Deliver ONLY: (1) short plan; (2) one or more unified diffs inside \`\`\`diff fences (git-apply ready); (3) tests; (4) single-line "Commit message: ...".
Keep edits minimal, add comments/docstrings, and preserve style.` }];
  const userMsg = [{ role: 'user', content:
`Issue #${issue.number}: ${issue.title}

Body:
${issue.body || '(no body)'}

Repo snapshot (first 400 files):
- ${repoTree}

Task:
Implement the above issue in minimal increments with tests and return unified diffs.` }];

  fs.mkdirSync('agent/logs', { recursive: true });
  let steps = 0, retries = 0, lastFail = '';

  while (steps++ < MAX_STEPS) {
    const reply = await openai([...sys, ...userMsg]);
    fs.writeFileSync(`agent/logs/step-${steps}.md`, reply);

    const diffs = Array.from(reply.matchAll(/```diff([\s\S]*?)```/g)).map(m => m[1].trim());
    if (!diffs.length) { lastFail = 'No diff produced'; break; }

    fs.writeFileSync('agent.patch', diffs.join('\n'));
    const apply = run('git apply --whitespace=fix agent.patch');
    if (apply.code !== 0) {
      lastFail = `Patch failed:\n${apply.err || apply.out}`;
      if (retries++ < SELF_HEAL) { userMsg.push({ role: 'user', content: `Patch failed:\n${lastFail}\nRegenerate corrected diffs.` }); continue; }
      break;
    }

    const cm = (reply.match(/Commit message:\s*([^\n]+)/i)?.[1] || `auto: implement ${issue.title}`).replace(/"/g, '\\"');
    sh('git add -A');
    sh(`git commit -m "${cm}"`);

    const test = runTests();
    fs.writeFileSync(`agent/logs/tests-step-${steps}.txt`, `${test.out}\n${test.err}`);
    if (test.code && retries++ < SELF_HEAL) {
      lastFail = `Tests failed. ${test.out || test.err}`;
      sh('git reset --soft HEAD~1');
      userMsg.push({ role: 'user', content: `Tests failed. Logs:\n${lastFail}\nPlease fix and reissue diffs.` });
      continue;
    }

    sh(`git push -u origin ${branch}`);
    const pr = await ensurePR(branch, `Auto: ${issue.title}`, `Automated changes for #${issue.number}\n\nSee workflow artifacts for logs.`);
    await comment(`✅ Pushed branch **${branch}** and opened/updated PR #${pr}. CI will validate.`);
    process.exit(0);
  }

  await comment(`❌ Agent stopped. Reason: ${lastFail || 'unspecified'}. See workflow artifacts.`);
  process.exit(1);
})().catch(async e => { await comment(`💥 Agent crash: ${String(e)}`); process.exit(1); });
