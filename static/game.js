/* ============================================================
   Friends Trivia – Game Engine
   ============================================================ */

// ── State ────────────────────────────────────────────────────
const state = {
  teams:   ['', ''],
  players: [[], []],
  scores:  [0, 0],
  turnsCompleted: [0, 0],
  maxTurns: 10,
  currentTeam: 0,   // index of team currently on the board

  categories:   [],
  rawQuestions: {},   // category → all questions (raw from API)

  // boardPools[ansTeam][cat] = questions for ansTeam to answer (about opposing players)
  boardPools:    [{}, {}],
  boardPointers: [{}, {}],

  rawLightning: [],
  lightningPools:    [[], []],
  lightningPointers: [0, 0],
  lightningScores:   [0, 0],
  lightningMode:   'tie',
  lightningTeamOrder: [],
  lightningCurrentTeamIdx: 0,  // index into lightningTeamOrder

  currentQuestion: null,
  currentCategory: null,
  buzzedIn: false,

  mainTimerInterval:      null,
  mainTimerValue:         15,
  lightningTimerInterval: null,
  lightningTimerValue:    30,
};

// ── TTS ──────────────────────────────────────────────────────
function speak(text, onEnd) {
  if (!window.speechSynthesis) { onEnd && onEnd(); return; }
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.92;
  utt.pitch = 1.0;
  utt.volume = 1.0;
  const voices = window.speechSynthesis.getVoices();
  const pick =
    voices.find(v => v.name === 'Samantha') ||
    voices.find(v => v.lang === 'en-US') ||
    voices.find(v => v.lang.startsWith('en')) ||
    voices[0];
  if (pick) utt.voice = pick;
  if (onEnd) utt.onend = onEnd;
  window.speechSynthesis.speak(utt);
}

function stopSpeech() {
  window.speechSynthesis?.cancel();
}

// Ensure voices are loaded (Chrome lazy-loads them)
if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  window.speechSynthesis.getVoices();
}

// ── Helpers ──────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function updateScoreboard() {
  document.getElementById('score-a-name').textContent = state.teams[0];
  document.getElementById('score-b-name').textContent = state.teams[1];
  document.getElementById('score-a-pts').textContent  = state.scores[0];
  document.getElementById('score-b-pts').textContent  = state.scores[1];
}

function showScoreboard() {
  document.getElementById('scoreboard').classList.add('visible');
}
function hideScoreboard() {
  document.getElementById('scoreboard').classList.remove('visible');
}

let toastTimeout = null;
function showToast(msg) {
  const toast = document.getElementById('ross-toast');
  document.getElementById('ross-toast-text').textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 5000);
}

// ── Init ─────────────────────────────────────────────────────
async function initGame() {
  const resp = await fetch('/api/game-data');
  const data = await resp.json();

  state.teams        = data.teams;
  state.players      = data.players;
  state.rawQuestions = data.questions;
  state.rawLightning = data.lightning;
  state.lightningMode = data.lightning_mode;
  state.categories   = Object.keys(data.questions);

  preparePools();
  updateScoreboard();
  document.getElementById('score-a-name').textContent = state.teams[0];
  document.getElementById('score-b-name').textContent = state.teams[1];

  startCoinToss();
}

// ── Build question pools ─────────────────────────────────────
function preparePools() {
  for (let ansTeam = 0; ansTeam <= 1; ansTeam++) {
    const oppPlayers = state.players[1 - ansTeam].map(n => n.toLowerCase().trim());

    state.boardPools[ansTeam]    = {};
    state.boardPointers[ansTeam] = {};

    for (const cat of state.categories) {
      const matching = state.rawQuestions[cat].filter(
        q => oppPlayers.includes(q.person.toLowerCase().trim())
      );
      state.boardPools[ansTeam][cat]    = shuffle(matching);
      state.boardPointers[ansTeam][cat] = 0;
    }
  }
}

function availableCount(ansTeam, cat) {
  const pool = state.boardPools[ansTeam][cat] || [];
  const ptr  = state.boardPointers[ansTeam][cat] || 0;
  return pool.length - ptr;
}

function nextBoardQuestion(ansTeam, cat) {
  const pool = state.boardPools[ansTeam][cat];
  const ptr  = state.boardPointers[ansTeam][cat];
  if (!pool || ptr >= pool.length) return null;
  state.boardPointers[ansTeam][cat]++;
  return pool[ptr];
}

function buildLightningPool(ansTeam) {
  const oppPlayers = state.players[1 - ansTeam].map(n => n.toLowerCase().trim());

  // Lightning sheet questions first
  const lightQs = state.rawLightning.filter(
    q => oppPlayers.includes(q.person.toLowerCase().trim())
  );

  // Fallback: unused board questions for this team
  const fallback = [];
  for (const cat of state.categories) {
    const pool = state.boardPools[ansTeam][cat] || [];
    const ptr  = state.boardPointers[ansTeam][cat] || 0;
    pool.slice(ptr).forEach(q => fallback.push({ person: q.person, question: q.question, answer: q.answer }));
  }

  state.lightningPools[ansTeam]    = shuffle([...lightQs, ...fallback]);
  state.lightningPointers[ansTeam] = 0;
}

// ── Coin Toss ─────────────────────────────────────────────────
function startCoinToss() {
  showScreen('screen-coin-toss');
  hideScoreboard();

  const intro = `Welcome everyone to Friends Trivia! I am your host, Doctor Ross Geller. ` +
    `I have a PhD, which I mention because it comes up a lot. ` +
    `Let's flip a coin to decide who answers first!`;

  document.getElementById('toss-status').textContent = 'Ross is speaking…';
  speak(intro, () => {
    const coin = document.getElementById('coin');
    coin.classList.add('flipping');
    document.getElementById('toss-status').textContent = 'Flipping…';

    setTimeout(() => {
      const winner = Math.floor(Math.random() * 2);
      state.currentTeam = winner;

      coin.classList.remove('flipping');
      document.getElementById('toss-status').textContent = '';
      const resultEl = document.getElementById('toss-result');
      resultEl.textContent = `${state.teams[winner]} goes first!`;
      resultEl.classList.remove('hidden');
      document.getElementById('toss-continue-btn').classList.remove('hidden');

      speak(
        `${state.teams[winner]} wins the toss! As Chandler would say, could this BE any more exciting? Let's play!`
      );
    }, 2600);
  });
}

// ── Board ─────────────────────────────────────────────────────
function showBoard() {
  updateScoreboard();
  showScoreboard();
  showScreen('screen-board');

  const team = state.currentTeam;
  const turns = state.turnsCompleted[team];

  document.getElementById('board-turn-label').textContent =
    `${state.teams[team]}'s turn — choose a category! (${turns} / ${state.maxTurns} done)`;

  const grid = document.getElementById('category-grid');
  grid.innerHTML = '';

  for (const cat of state.categories) {
    const count    = availableCount(team, cat);
    const card     = document.createElement('div');
    card.className = 'cat-card' + (count === 0 ? ' exhausted' : '');
    card.innerHTML = `
      <div class="cat-name">${cat}</div>
      <div class="cat-count">${count} question${count !== 1 ? 's' : ''} left</div>
    `;
    if (count > 0) card.onclick = () => selectCategory(cat);
    grid.appendChild(card);
  }

  speak(`${state.teams[team]}, choose your category!`);
}

// ── Select category & show question ──────────────────────────
function selectCategory(cat) {
  const q = nextBoardQuestion(state.currentTeam, cat);
  if (!q) { showBoard(); return; }

  state.currentQuestion = q;
  state.currentCategory = cat;
  state.buzzedIn = false;

  showQuestionScreen(q, cat);
}

function showQuestionScreen(q, cat) {
  showScreen('screen-question');

  document.getElementById('q-category-label').textContent = cat;
  document.getElementById('q-person-name').textContent     = q.person;
  document.getElementById('q-text').textContent            = q.question;

  document.getElementById('buzz-btn').classList.remove('hidden');
  document.getElementById('timeout-msg').classList.add('hidden');

  updateMainTimerDisplay(15);
  stopMainTimer();

  const ttsText = `This question is about ${q.person}! ` + q.question;
  speak(ttsText, () => startMainTimer());
}

// ── Main Timer ───────────────────────────────────────────────
function startMainTimer() {
  state.mainTimerValue = 15;
  updateMainTimerDisplay(15);

  state.mainTimerInterval = setInterval(() => {
    state.mainTimerValue--;
    updateMainTimerDisplay(state.mainTimerValue);
    if (state.mainTimerValue <= 0) {
      stopMainTimer();
      onTimerEnd();
    }
  }, 1000);
}

function stopMainTimer() {
  clearInterval(state.mainTimerInterval);
  state.mainTimerInterval = null;
}

function updateMainTimerDisplay(val) {
  const total = 15;
  const pct   = (val / total) * 100;
  const bar   = document.getElementById('timer-bar');
  const num   = document.getElementById('timer-val');

  bar.style.width = pct + '%';
  num.textContent = val;

  const color = val <= 5  ? 'var(--timer-danger)'
              : val <= 8  ? 'var(--timer-warn)'
              : 'var(--timer-ok)';
  bar.style.background = color;
  num.style.color      = color;
}

function onTimerEnd() {
  stopSpeech();
  document.getElementById('buzz-btn').classList.add('hidden');
  document.getElementById('timeout-msg').classList.remove('hidden');
  speak(`Time's up! No one buzzed in — moving on.`);

  // Auto-mark incorrect after short pause
  setTimeout(() => reportResult(false), 2000);
}

// ── Buzz In ──────────────────────────────────────────────────
function buzzIn() {
  if (state.buzzedIn) return;
  state.buzzedIn = true;
  stopMainTimer();
  stopSpeech();
  document.getElementById('buzz-btn').classList.add('hidden');
  speak(`Buzzed in! Let's see if you've got it.`);
  setTimeout(() => goToRevealScreen(false), 1200);
}

// ── Reveal screen ────────────────────────────────────────────
function goToRevealScreen(timedOut) {
  const q   = state.currentQuestion;
  const cat = state.currentCategory;

  showScreen('screen-reveal');
  document.getElementById('reveal-category-label').textContent = cat;
  document.getElementById('reveal-person-name').textContent    = q.person;
  document.getElementById('reveal-q-text').textContent         = q.question;
  document.getElementById('answer-text').textContent           = q.answer;
  document.getElementById('answering-team-name').textContent   = state.teams[state.currentTeam];

  // Reset reveal state
  document.getElementById('answer-box').classList.add('hidden');
  document.getElementById('self-report-wrap').classList.add('hidden');
  document.getElementById('reveal-btn-wrap').classList.remove('hidden');

  if (timedOut) {
    showToast(`Ran out of time! Let's reveal the answer.`);
  }
}

function showAnswer() {
  document.getElementById('reveal-btn-wrap').classList.add('hidden');
  document.getElementById('answer-box').classList.remove('hidden');
  document.getElementById('self-report-wrap').classList.remove('hidden');
  speak(`The answer is: ${state.currentQuestion.answer}`);
}

// ── Self-report ───────────────────────────────────────────────
function reportResult(correct) {
  stopSpeech();
  if (correct) {
    state.scores[state.currentTeam]++;
    updateScoreboard();
    const lines = [
      `Correct! Well done, ${state.teams[state.currentTeam]}!`,
      `Outstanding! A state of total awareness, and you have it!`,
      `That's right! Even I'm impressed, and I have a PhD.`,
    ];
    speak(lines[Math.floor(Math.random() * lines.length)]);
    showToast(`+1 for ${state.teams[state.currentTeam]}! 🎉`);
  } else {
    const lines = [
      `Incorrect! The correct answer was already on screen. We were… wrong.`,
      `Oh no! Better luck on the next one!`,
      `That's not it. Don't worry — even I've been wrong. Twice. Married wrong twice.`,
    ];
    speak(lines[Math.floor(Math.random() * lines.length)]);
    showToast(`No point this time.`);
  }

  state.turnsCompleted[state.currentTeam]++;

  setTimeout(advanceTurn, 2200);
}

// ── Turn management ───────────────────────────────────────────
function advanceTurn() {
  const done0 = state.turnsCompleted[0] >= state.maxTurns;
  const done1 = state.turnsCompleted[1] >= state.maxTurns;

  if (done0 && done1) {
    endPhaseOne();
    return;
  }

  // Switch teams; if next team is done, stay with current
  const next = 1 - state.currentTeam;
  state.currentTeam = (state.turnsCompleted[next] < state.maxTurns) ? next : state.currentTeam;

  showBoard();
}

// ── Phase 1 end ───────────────────────────────────────────────
function endPhaseOne() {
  stopSpeech();
  const isTie = state.scores[0] === state.scores[1];

  if (state.lightningMode === 'always' || isTie) {
    startLightningIntro(isTie);
  } else {
    endGame();
  }
}

// ── Lightning Intro ───────────────────────────────────────────
function startLightningIntro(isTie) {
  showScreen('screen-lightning-intro');

  // Team that's losing goes first in lightning (or random if tied)
  if (isTie) {
    state.lightningTeamOrder = Math.random() < 0.5 ? [0, 1] : [1, 0];
  } else {
    const loser  = state.scores[0] < state.scores[1] ? 0 : 1;
    const winner = 1 - loser;
    state.lightningTeamOrder = [loser, winner];
  }
  state.lightningCurrentTeamIdx = 0;

  // Build pools now so unused board questions are correctly captured
  buildLightningPool(0);
  buildLightningPool(1);

  const msg = isTie
    ? `It's a tie at ${state.scores[0]} each! Time for the LIGHTNING ROUND!`
    : `Phase 1 is over! But we're not done yet — LIGHTNING ROUND incoming!`;

  document.getElementById('lightning-intro-msg').textContent = msg;
  speak(msg);

  // Show current scores
  const scoresEl = document.getElementById('lightning-intro-scores');
  scoresEl.innerHTML = state.teams.map((t, i) => `
    <div class="final-score-card">
      <div class="team-name">${t}</div>
      <div class="score-num">${state.scores[i]}</div>
    </div>
  `).join('');

  document.getElementById('lightning-start-btn').onclick =
    () => startLightningForTeam(state.lightningTeamOrder[0]);
}

// ── Lightning Round ───────────────────────────────────────────
function startLightningForTeam(teamIdx) {
  state.lightningCurrentTeamIdx = state.lightningTeamOrder.indexOf(teamIdx);
  state.lightningScores[teamIdx] = 0;

  showScreen('screen-lightning');
  document.getElementById('lightning-team-label').textContent = `${state.teams[teamIdx]}'s Lightning Round!`;
  document.getElementById('lightning-score-pts').textContent  = '0';
  updateLightningTimerDisplay(30);

  speak(`${state.teams[teamIdx]}, you have 30 seconds! Answer as many as you can! Ready? Go!`);

  // Start timer after fixed delay — don't rely on TTS callback which can fail on second team
  setTimeout(() => {
    startLightningTimer(teamIdx);
    showLightningQuestion(teamIdx);
  }, 3000);
}

function showLightningQuestion(teamIdx) {
  const pool = state.lightningPools[teamIdx];
  const ptr  = state.lightningPointers[teamIdx];

  if (ptr >= pool.length) {
    // No more questions — end early
    stopLightningTimer();
    onLightningTimerEnd(teamIdx);
    return;
  }

  const q = pool[ptr];
  state.lightningPointers[teamIdx]++;

  document.getElementById('lightning-about').textContent    = `About: ${q.person}`;
  document.getElementById('lightning-question').textContent = q.question;

  document.getElementById('lightning-q-box').classList.remove('fade-in');
  void document.getElementById('lightning-q-box').offsetWidth; // reflow trick
  document.getElementById('lightning-q-box').classList.add('fade-in');

  // Read aloud (non-blocking — timer keeps running)
  speak(q.question);
}

function lightningResult(correct) {
  const teamIdx = state.lightningTeamOrder[state.lightningCurrentTeamIdx];

  if (correct) {
    state.lightningScores[teamIdx]++;
    state.scores[teamIdx]++;
    updateScoreboard();
    document.getElementById('lightning-score-pts').textContent = state.lightningScores[teamIdx];
  }

  showLightningQuestion(teamIdx);
}

// ── Lightning Timer ────────────────────────────────────────────
function startLightningTimer(teamIdx) {
  state.lightningTimerValue = 30;
  updateLightningTimerDisplay(30);

  state.lightningTimerInterval = setInterval(() => {
    state.lightningTimerValue--;
    updateLightningTimerDisplay(state.lightningTimerValue);
    if (state.lightningTimerValue <= 0) {
      stopLightningTimer();
      onLightningTimerEnd(teamIdx);
    }
  }, 1000);
}

function stopLightningTimer() {
  clearInterval(state.lightningTimerInterval);
  state.lightningTimerInterval = null;
}

function updateLightningTimerDisplay(val) {
  const total = 30;
  const pct   = (val / total) * 100;
  const bar   = document.getElementById('lightning-timer-bar');
  const num   = document.getElementById('lightning-timer-val');

  bar.style.width = pct + '%';
  num.textContent = val;

  const color = val <= 8  ? 'var(--timer-danger)'
              : val <= 15 ? 'var(--timer-warn)'
              : 'var(--timer-ok)';
  bar.style.background = color;
  num.style.color      = color;
}

function onLightningTimerEnd(teamIdx) {
  stopSpeech();
  speak(`Time's up! Put the dinosaur down and let's count the points!`);

  const scored = state.lightningScores[teamIdx];
  showScreen('screen-lightning-switch');
  document.getElementById('lightning-switch-title').textContent = `Time's Up!`;
  document.getElementById('lightning-switch-msg').textContent =
    `${state.teams[teamIdx]} scored ${scored} point${scored !== 1 ? 's' : ''} in the lightning round!`;
  document.getElementById('lightning-switch-score').textContent = `⚡ +${scored}`;

  const nextBtn = document.getElementById('lightning-next-btn');
  const nextTeamIdx = state.lightningTeamOrder[state.lightningCurrentTeamIdx + 1];

  if (nextTeamIdx !== undefined) {
    nextBtn.textContent = `${state.teams[nextTeamIdx]}'s Turn ⚡`;
    nextBtn.onclick     = () => startLightningForTeam(nextTeamIdx);
  } else {
    nextBtn.textContent = `See Final Results 🏆`;
    nextBtn.onclick     = () => endGame();
  }
}

// ── Game Over ─────────────────────────────────────────────────
function endGame() {
  stopSpeech();
  hideScoreboard();
  showScreen('screen-game-over');

  const [s0, s1]   = state.scores;
  const [t0, t1]   = state.teams;
  const isTie      = s0 === s1;
  const winnerIdx  = s0 > s1 ? 0 : 1;

  if (isTie) {
    document.getElementById('winner-label').textContent = `It's a tie!`;
    document.getElementById('winner-name').textContent  = `🤝 ${s0} – ${s1}`;
    speak(`It's a tie! Just like my first marriage... no wait, that ended. You're still friends, which is better!`);
  } else {
    document.getElementById('winner-label').textContent = `And the winner is…`;
    document.getElementById('winner-name').textContent  = `🏆 ${state.teams[winnerIdx]}`;
    speak(
      `${state.teams[winnerIdx]} wins! Congratulations! You know your friends better than I know myself, apparently.`
    );
  }

  const scoresEl = document.getElementById('final-scores-display');
  scoresEl.innerHTML = state.teams.map((t, i) => `
    <div class="final-score-card ${(!isTie && i === winnerIdx) ? 'winner' : ''}">
      <div class="team-name">${t}</div>
      <div class="score-num">${state.scores[i]}</div>
    </div>
  `).join('');

  const msgEl = document.getElementById('game-over-msg');
  if (isTie) {
    msgEl.textContent = `Perfect balance. As all things should be. Play again to break the tie!`;
  } else {
    msgEl.textContent = `${state.teams[winnerIdx]} wins by ${Math.abs(s0 - s1)} point${Math.abs(s0 - s1) !== 1 ? 's' : ''}. Could this BE any more decisive?`;
  }
}

// ── Boot ──────────────────────────────────────────────────────
initGame();
