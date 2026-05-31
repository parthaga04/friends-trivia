'use strict';

const cfg = JSON.parse(localStorage.getItem('friendsTriviaConfig') || 'null');
if (!cfg) { window.location.href = '/'; }

const gs = {
  phase: 'lobby',
  questions: cfg.questions,
  qIndex: 0,
  teams: cfg.teams.map(t => ({ ...t, score: 0 })),
  buzzedTeam: null,
  stealTeam: null,
  hasStealChance: false,
  tts: cfg.ttsEnabled,
  buzzInterval: null,
  answerInterval: null,
  lightTimeout: null,
};

// ── DOM ────────────────────────────────────────────────────────────────────

const body      = document.getElementById('gameBody');
const t1Score   = document.getElementById('t1Score');
const t2Score   = document.getElementById('t2Score');
const roundLabel = document.getElementById('roundLabel');
const qCounter  = document.getElementById('qCounter');

// ── Boot ───────────────────────────────────────────────────────────────────

(function init() {
  document.getElementById('t1Name').textContent      = gs.teams[0].name;
  document.getElementById('t2Name').textContent      = gs.teams[1].name;
  document.getElementById('lobbyT1Name').textContent = gs.teams[0].name;
  document.getElementById('lobbyT2Name').textContent = gs.teams[1].name;

  ['t1', 't2'].forEach((prefix, i) => {
    const ul = document.getElementById(`lobby${prefix.toUpperCase()}Players`);
    (gs.teams[i].players || []).forEach(p => {
      const li = document.createElement('li');
      li.textContent = p;
      ul.appendChild(li);
    });
  });

  refreshHeader();
  setState('lobby');
})();

// ── State ──────────────────────────────────────────────────────────────────

function setState(phase) {
  gs.phase = phase;
  body.className = `game-page state-${phase}`;
}

// ── Header ─────────────────────────────────────────────────────────────────

function refreshHeader() {
  t1Score.textContent = gs.teams[0].score;
  t2Score.textContent = gs.teams[1].score;
  const q = gs.questions[gs.qIndex];
  if (q) {
    qCounter.textContent  = `Q ${gs.qIndex + 1} / ${gs.questions.length}`;
    roundLabel.textContent = q.round;
  } else {
    qCounter.textContent  = `Done`;
    roundLabel.textContent = '';
  }
}

// ── Advance ────────────────────────────────────────────────────────────────

function nextQuestion() {
  if (gs.qIndex >= gs.questions.length) { showFinal(); return; }
  refreshHeader();
  const q = gs.questions[gs.qIndex];
  q.lightning ? showLightning(q) : showQuestion(q);
}

// ── STATE: question ────────────────────────────────────────────────────────

function showQuestion(q) {
  document.getElementById('qCategory').textContent    = q.category || 'Question';
  document.getElementById('qPoints').textContent      = `${q.points} pts`;
  document.getElementById('qRound').textContent       = q.round;
  document.getElementById('questionText').textContent = q.question;
  setState('question');
  if (gs.tts) speak(q.question);
}

// ── STATE: open ────────────────────────────────────────────────────────────

function openBuzzers() {
  const q = gs.questions[gs.qIndex];
  document.getElementById('openCategory').textContent     = q.category || 'Question';
  document.getElementById('openPoints').textContent       = `${q.points} pts`;
  document.getElementById('openQuestionText').textContent = q.question;
  setState('open');
  startCountdown('buzzTimer', 10, gs, 'buzzInterval', revealAnswer);
}

// ── STATE: answering ───────────────────────────────────────────────────────

function buzzIn(teamIdx) {
  if (gs.phase !== 'open') return;
  clearCountdown(gs, 'buzzInterval');
  gs.buzzedTeam = teamIdx;
  gs.hasStealChance = false;
  showAnswering(teamIdx, 8);
}

function stealIn(teamIdx) {
  if (gs.phase !== 'wrong') return;
  gs.stealTeam = teamIdx;
  showAnswering(teamIdx, 5);
}

function showAnswering(teamIdx, secs) {
  const el = document.getElementById('answeringTeamName');
  el.textContent = gs.teams[teamIdx].name;
  el.style.color = teamIdx === 0 ? 'var(--t1)' : 'var(--t2)';
  document.getElementById('answerQuestionText').textContent = gs.questions[gs.qIndex].question;
  setState('answering');
  startCountdown('answerTimer', secs, gs, 'answerInterval', markWrong);
}

// ── STATE: correct ─────────────────────────────────────────────────────────

function markCorrect() {
  if (gs.phase !== 'answering') return;
  clearCountdown(gs, 'answerInterval');

  const teamIdx = gs.stealTeam !== null ? gs.stealTeam : gs.buzzedTeam;
  const q = gs.questions[gs.qIndex];
  gs.teams[teamIdx].score += q.points;
  bumpScore(teamIdx);

  const nameEl = document.getElementById('correctTeamName');
  nameEl.textContent = gs.teams[teamIdx].name;
  nameEl.style.color = teamIdx === 0 ? 'var(--t1)' : 'var(--t2)';
  document.getElementById('correctPoints').textContent = `+${q.points}`;
  document.getElementById('correctAnswer').textContent = q.answer;

  gs.stealTeam = null;
  gs.qIndex++;
  setState('correct');
  if (gs.tts) speak(`Correct! ${q.answer}`);
}

// ── STATE: wrong ───────────────────────────────────────────────────────────

function markWrong() {
  if (gs.phase !== 'answering') return;
  clearCountdown(gs, 'answerInterval');

  const wrongIdx = gs.stealTeam !== null ? gs.stealTeam : gs.buzzedTeam;

  const nameEl = document.getElementById('wrongTeamName');
  nameEl.textContent = gs.teams[wrongIdx].name;
  nameEl.style.color = wrongIdx === 0 ? 'var(--t1)' : 'var(--t2)';

  if (!gs.hasStealChance) {
    gs.hasStealChance = true;
    const other = 1 - wrongIdx;
    document.getElementById('stealHint').textContent =
      `Press ${other + 1} for ${gs.teams[other].name} to steal`;
    document.getElementById('wrongHintBar').innerHTML =
      `<kbd>${other + 1}</kbd> = ${gs.teams[other].name} steals &nbsp;|&nbsp; <kbd>R</kbd> = Reveal Answer`;
    setState('wrong');
  } else {
    revealAnswer();
  }
}

// ── Reveal (no one answered) ───────────────────────────────────────────────

function revealAnswer() {
  clearCountdown(gs, 'buzzInterval');
  clearCountdown(gs, 'answerInterval');

  const q = gs.questions[gs.qIndex];
  const nameEl = document.getElementById('correctTeamName');
  nameEl.textContent = 'No one';
  nameEl.style.color = 'rgba(255,255,255,0.4)';
  document.getElementById('correctPoints').textContent = '—';
  document.getElementById('correctAnswer').textContent = q.answer;

  gs.stealTeam = null;
  gs.qIndex++;
  setState('correct');
  if (gs.tts) speak(`The answer was ${q.answer}`);
}

// ── STATE: lightning ───────────────────────────────────────────────────────

const LIGHTNING_SECS = 7;

function showLightning(q) {
  document.getElementById('lightCategory').textContent     = q.category || 'Lightning';
  document.getElementById('lightPoints').textContent       = `${q.points} pts`;
  document.getElementById('lightQuestionText').textContent = q.question;
  setState('lightning');
  if (gs.tts) speak(q.question);
  animateLightningBar();
  clearTimeout(gs.lightTimeout);
  gs.lightTimeout = setTimeout(lightningSkip, LIGHTNING_SECS * 1000);
}

function animateLightningBar() {
  const fill = document.getElementById('lightTimerFill');
  fill.style.transition = 'none';
  fill.style.width = '100%';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    fill.style.transition = `width ${LIGHTNING_SECS}s linear`;
    fill.style.width = '0%';
  }));
}

function lightningBuzzIn(teamIdx) {
  if (gs.phase !== 'lightning') return;
  clearTimeout(gs.lightTimeout);
  const q = gs.questions[gs.qIndex];
  gs.teams[teamIdx].score += q.points;
  bumpScore(teamIdx);
  if (gs.tts) speak(`${gs.teams[teamIdx].name}!`);
  gs.qIndex++;
  setTimeout(nextQuestion, 600);
}

function lightningSkip() {
  if (gs.phase !== 'lightning') return;
  clearTimeout(gs.lightTimeout);
  const q = gs.questions[gs.qIndex];
  if (gs.tts) speak(`The answer was ${q.answer}`);
  gs.qIndex++;
  setTimeout(nextQuestion, 1400);
}

// ── STATE: final ───────────────────────────────────────────────────────────

function showFinal() {
  const [t1, t2] = gs.teams;
  document.getElementById('finalT1Name').textContent  = t1.name;
  document.getElementById('finalT2Name').textContent  = t2.name;
  document.getElementById('finalT1Score').textContent = t1.score;
  document.getElementById('finalT2Score').textContent = t2.score;
  let msg;
  if (t1.score > t2.score)      msg = `🏆 ${t1.name} Wins!`;
  else if (t2.score > t1.score) msg = `🏆 ${t2.name} Wins!`;
  else                          msg = `🤝 It's a Tie!`;
  document.getElementById('winnerBanner').textContent = msg;
  setState('final');
  if (gs.tts) speak(msg.replace(/[🏆🤝]/g, ''));
}

// ── Helpers ────────────────────────────────────────────────────────────────

function startCountdown(elId, secs, stateObj, intervalKey, onExpire) {
  const el = document.getElementById(elId);
  el.textContent = secs;
  clearInterval(stateObj[intervalKey]);
  stateObj[intervalKey] = setInterval(() => {
    secs--;
    el.textContent = secs;
    if (secs <= 0) { clearInterval(stateObj[intervalKey]); onExpire(); }
  }, 1000);
}

function clearCountdown(stateObj, intervalKey) {
  clearInterval(stateObj[intervalKey]);
}

function bumpScore(teamIdx) {
  const el = teamIdx === 0 ? t1Score : t2Score;
  el.textContent = gs.teams[teamIdx].score;
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
  setTimeout(() => el.classList.remove('bump'), 420);
}

function speak(text) {
  if (!gs.tts || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.88;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

// ── Keyboard ───────────────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  switch (gs.phase) {
    case 'lobby':
      if (e.key === ' ') { e.preventDefault(); nextQuestion(); }
      break;
    case 'question':
      if (e.key === ' ') { e.preventDefault(); openBuzzers(); }
      break;
    case 'open':
      if (e.key === '1') buzzIn(0);
      else if (e.key === '2') buzzIn(1);
      else if (e.key === 'r' || e.key === 'R') revealAnswer();
      break;
    case 'answering':
      if (e.key === 'y' || e.key === 'Y' || e.key === 'Enter') markCorrect();
      else if (e.key === 'n' || e.key === 'N') markWrong();
      break;
    case 'wrong':
      if (e.key === '1') stealIn(0);
      else if (e.key === '2') stealIn(1);
      else if (e.key === 'r' || e.key === 'R') revealAnswer();
      break;
    case 'correct':
      if (e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); nextQuestion(); }
      break;
    case 'lightning':
      if (e.key === '1') lightningBuzzIn(0);
      else if (e.key === '2') lightningBuzzIn(1);
      else if (e.key === 'r' || e.key === 'R') lightningSkip();
      break;
    case 'final':
      if (e.key === 'r' || e.key === 'R') window.location.href = '/';
      break;
  }
});
