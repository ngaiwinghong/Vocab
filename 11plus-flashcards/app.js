const STORAGE_KEY = "quest-11plus-flashcards-v2";

const state = {
  mode: "study",
  activeIndex: 0,
  flipped: false,
  deckOrder: [],
  quiz: null,
  store: loadStore()
};

const els = {
  tabs: document.querySelectorAll(".tab"),
  studyPanel: document.getElementById("studyPanel"),
  quizPanel: document.getElementById("quizPanel"),
  totalCount: document.getElementById("totalCount"),
  knownCount: document.getElementById("knownCount"),
  practiceCount: document.getElementById("practiceCount"),
  quizBest: document.getElementById("quizBest"),
  learningProgress: document.getElementById("learningProgress"),
  learningPercent: document.getElementById("learningPercent"),
  searchInput: document.getElementById("searchInput"),
  studyFilter: document.getElementById("studyFilter"),
  deckCount: document.getElementById("deckCount"),
  wordList: document.getElementById("wordList"),
  flashcard: document.getElementById("flashcard"),
  cardHint: document.getElementById("cardHint"),
  cardWord: document.getElementById("cardWord"),
  cardAnswer: document.getElementById("cardAnswer"),
  cardPosition: document.getElementById("cardPosition"),
  currentStatus: document.getElementById("currentStatus"),
  deckMeter: document.getElementById("deckMeter"),
  toggleStar: document.getElementById("toggleStar"),
  definitionInput: document.getElementById("definitionInput"),
  exampleInput: document.getElementById("exampleInput"),
  quizType: document.getElementById("quizType"),
  quizScope: document.getElementById("quizScope"),
  questionCount: document.getElementById("questionCount"),
  quizProgress: document.getElementById("quizProgress"),
  quizScore: document.getElementById("quizScore"),
  quizPrompt: document.getElementById("quizPrompt"),
  quizOptions: document.getElementById("quizOptions"),
  quizFeedback: document.getElementById("quizFeedback"),
  nextQuestion: document.getElementById("nextQuestion")
};

const entries = VOCAB_DATA.map((entry, index) => ({
  id: entry.word.toLowerCase(),
  index,
  ...entry
}));

function loadStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
      known: {},
      practice: {},
      starred: {},
      edits: {},
      bestQuiz: 0
    };
  } catch {
    return { known: {}, practice: {}, starred: {}, edits: {}, bestQuiz: 0 };
  }
}

function saveStore() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.store));
}

function getEntry(index = state.activeIndex) {
  const base = entries[index];
  return { ...base, ...(state.store.edits[base.id] || {}) };
}

function getFilteredIndexes() {
  const query = els.searchInput.value.trim().toLowerCase();
  const filter = els.studyFilter.value;
  return entries
    .filter((entry) => {
      const matchesSearch = !query || entry.word.toLowerCase().includes(query);
      const matchesFilter =
        filter === "all" ||
        (filter === "practice" && state.store.practice[entry.id]) ||
        (filter === "known" && state.store.known[entry.id]) ||
        (filter === "starred" && state.store.starred[entry.id]);
      return matchesSearch && matchesFilter;
    })
    .map((entry) => entry.index);
}

function renderStats() {
  const known = Object.keys(state.store.known).length;
  const percent = Math.round((known / entries.length) * 100);
  els.totalCount.textContent = entries.length;
  els.knownCount.textContent = known;
  els.practiceCount.textContent = Object.keys(state.store.practice).length;
  els.quizBest.textContent = `${state.store.bestQuiz || 0}%`;
  els.learningPercent.textContent = `${percent}%`;
  els.learningProgress.style.width = `${percent}%`;
}

function renderWordList() {
  const indexes = getFilteredIndexes();
  state.deckOrder = indexes;

  if (state.deckOrder.length && !state.deckOrder.includes(state.activeIndex)) {
    state.activeIndex = state.deckOrder[0];
    state.flipped = false;
  }

  els.wordList.innerHTML = "";
  if (!state.deckOrder.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "🌱 No words in this deck yet.";
    els.wordList.appendChild(empty);
    els.deckCount.textContent = "🌱 0 words shown";
    return;
  }

  els.deckCount.textContent = `📚 ${state.deckOrder.length} word${state.deckOrder.length === 1 ? "" : "s"} shown`;
  let currentLetter = "";
  state.deckOrder.forEach((index) => {
    const entry = entries[index];
    const firstLetter = entry.word.charAt(0).toUpperCase();

    if (firstLetter !== currentLetter) {
      currentLetter = firstLetter;
      const divider = document.createElement("div");
      divider.className = "word-letter";
      divider.textContent = currentLetter;
      els.wordList.appendChild(divider);
    }

    const button = document.createElement("button");
    button.type = "button";
    const marker = state.store.known[entry.id]
      ? "🏆"
      : state.store.practice[entry.id]
        ? "💪"
        : state.store.starred[entry.id]
          ? "⭐"
          : "📘";
    button.textContent = `${marker} ${entry.word}`;
    button.className = index === state.activeIndex ? "is-active" : "";
    button.addEventListener("click", () => {
      state.activeIndex = index;
      state.flipped = false;
      render();
    });
    els.wordList.appendChild(button);
  });
}

function renderCard() {
  if (!state.deckOrder.length) {
    els.flashcard.classList.remove("is-flipped");
    els.cardHint.textContent = "🧺 Choose another deck";
    els.cardWord.textContent = "No cards yet 🌱";
    els.cardAnswer.textContent = "Mark words as 💪 Needs practice or ⭐ Starred to build this deck.";
    els.cardPosition.textContent = "0 / 0";
    els.currentStatus.textContent = "🌱 This deck is empty";
    els.deckMeter.style.width = "0";
    els.toggleStar.textContent = "⭐ Star";
    els.definitionInput.value = "";
    els.exampleInput.value = "";
    return;
  }

  const entry = getEntry();
  const position = Math.max(1, state.deckOrder.indexOf(state.activeIndex) + 1);
  const status = state.store.known[entry.id]
    ? "🏆 Mastered"
    : state.store.practice[entry.id]
      ? "💪 Needs practice"
      : "🆕 New word";

  els.flashcard.classList.toggle("is-flipped", state.flipped);
  els.cardHint.textContent = state.flipped ? "👆 Tap to return to the word" : "👀 Tap to reveal";
  els.cardWord.textContent = entry.word;
  els.cardAnswer.innerHTML = `
    <span class="answer-block">
      <span class="answer-title">Meaning:</span>
      <strong>${escapeHTML(capitalizeFirst(entry.definition))}</strong>
    </span>
    <span class="answer-block">
      <span class="answer-title">Example:</span>
      <span class="example">${escapeHTML(capitalizeFirst(entry.example))}</span>
    </span>
  `;
  els.cardPosition.textContent = `${position} / ${state.deckOrder.length}`;
  els.currentStatus.textContent = `${status}${state.store.starred[entry.id] ? " ⭐" : ""}`;
  els.deckMeter.style.width = `${(position / Math.max(1, state.deckOrder.length)) * 100}%`;
  els.toggleStar.textContent = state.store.starred[entry.id] ? "⭐ Starred" : "⭐ Star";
  els.definitionInput.value = entry.definition;
  els.exampleInput.value = entry.example;
}

function render() {
  renderStats();
  renderWordList();
  renderCard();
}

function moveCard(direction) {
  if (!state.deckOrder.length) return;
  const current = state.deckOrder.indexOf(state.activeIndex);
  const next = (current + direction + state.deckOrder.length) % state.deckOrder.length;
  state.activeIndex = state.deckOrder[next];
  state.flipped = false;
  render();
}

function markCard(type) {
  const entry = getEntry();
  if (type === "known") {
    state.store.known[entry.id] = true;
    delete state.store.practice[entry.id];
  } else {
    state.store.practice[entry.id] = true;
    delete state.store.known[entry.id];
  }
  saveStore();
  moveCard(1);
}

function shuffleDeck() {
  state.deckOrder = [...state.deckOrder].sort(() => Math.random() - 0.5);
  state.activeIndex = state.deckOrder[0] || 0;
  state.flipped = false;
  render();
}

function getQuizPool() {
  const scope = els.quizScope.value;
  let pool = entries;
  if (scope === "practice") pool = entries.filter((entry) => state.store.practice[entry.id]);
  if (scope === "starred") pool = entries.filter((entry) => state.store.starred[entry.id]);
  return pool.length >= 4 ? pool : entries;
}

function makeQuiz() {
  const pool = [...getQuizPool()].sort(() => Math.random() - 0.5);
  const count = Math.min(Number(els.questionCount.value) || 10, pool.length);
  state.quiz = {
    type: els.quizType.value,
    questions: pool.slice(0, count),
    current: 0,
    score: 0,
    answered: false
  };
  renderQuestion();
}

function renderQuestion() {
  const quiz = state.quiz;
  if (!quiz || quiz.current >= quiz.questions.length) {
    finishQuiz();
    return;
  }

  const answer = { ...quiz.questions[quiz.current], ...(state.store.edits[quiz.questions[quiz.current].id] || {}) };
  const options = makeOptions(answer, quiz.type);
  quiz.answered = false;
  els.quizProgress.textContent = `🧭 Question ${quiz.current + 1} / ${quiz.questions.length}`;
  els.quizScore.textContent = `🏅 Score ${quiz.score}`;
  els.quizFeedback.textContent = "";
  els.nextQuestion.classList.add("hidden");

  if (quiz.type === "definition") {
    els.quizPrompt.textContent = `💡 What does "${answer.word}" mean?`;
  } else if (quiz.type === "word") {
    els.quizPrompt.textContent = `🔤 ${answer.definition}`;
  } else {
    els.quizPrompt.textContent = `📝 ${answer.example.replace(new RegExp(`\\b${escapeRegExp(answer.word)}\\b`, "i"), "_____")}`;
  }

  els.quizOptions.innerHTML = "";
  options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = option.label;
    button.addEventListener("click", () => answerQuestion(button, option.correct, answer));
    els.quizOptions.appendChild(button);
  });
}

function makeOptions(answer, type) {
  const others = entries
    .filter((entry) => entry.id !== answer.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((entry) => ({ ...entry, ...(state.store.edits[entry.id] || {}) }));

  const labels = type === "definition"
    ? [{ label: answer.definition, correct: true }, ...others.map((entry) => ({ label: entry.definition, correct: false }))]
    : [{ label: answer.word, correct: true }, ...others.map((entry) => ({ label: entry.word, correct: false }))];

  return labels.sort(() => Math.random() - 0.5);
}

function answerQuestion(button, correct, answer) {
  if (!state.quiz || state.quiz.answered) return;
  state.quiz.answered = true;
  if (correct) {
    state.quiz.score += 1;
    state.store.known[answer.id] = true;
    delete state.store.practice[answer.id];
    els.quizFeedback.textContent = "🎉 Correct. That word moves into Mastered.";
  } else {
    state.store.practice[answer.id] = true;
    delete state.store.known[answer.id];
    els.quizFeedback.textContent = `🌱 Not quite. The answer is ${answer.word}, and it is ready to revisit.`;
  }
  saveStore();

  [...els.quizOptions.children].forEach((optionButton) => {
    optionButton.disabled = true;
    if (optionButton === button && !correct) optionButton.classList.add("incorrect");
    if (optionButton.textContent === (state.quiz.type === "definition" ? answer.definition : answer.word)) {
      optionButton.classList.add("correct");
    }
  });
  els.quizScore.textContent = `🏅 Score ${state.quiz.score}`;
  els.nextQuestion.classList.remove("hidden");
  renderStats();
}

function finishQuiz() {
  const quiz = state.quiz;
  const percent = quiz ? Math.round((quiz.score / quiz.questions.length) * 100) : 0;
  state.store.bestQuiz = Math.max(state.store.bestQuiz || 0, percent);
  saveStore();
  els.quizProgress.textContent = "🏁 Finished";
  els.quizScore.textContent = `🏅 Score ${quiz.score} / ${quiz.questions.length}`;
  els.quizPrompt.textContent = `🎯 Quiz complete: ${percent}%`;
  els.quizOptions.innerHTML = "";
  els.quizFeedback.textContent = percent >= 80 ? "🌟 Strong work. Keep revising the tricky ones." : "💪 Good practice. Missed words are now in Needs practice.";
  els.nextQuestion.classList.add("hidden");
  renderStats();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHTML(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function capitalizeFirst(value) {
  const trimmed = value.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : "";
}

function bindEvents() {
  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      state.mode = tab.dataset.mode;
      els.tabs.forEach((item) => item.classList.toggle("is-active", item === tab));
      els.studyPanel.classList.toggle("is-visible", state.mode === "study");
      els.quizPanel.classList.toggle("is-visible", state.mode === "quiz");
    });
  });

  els.searchInput.addEventListener("input", render);
  els.studyFilter.addEventListener("change", render);
  els.flashcard.addEventListener("click", () => {
    state.flipped = !state.flipped;
    renderCard();
  });
  document.getElementById("flipCard").addEventListener("click", () => {
    state.flipped = !state.flipped;
    renderCard();
  });
  document.getElementById("prevCard").addEventListener("click", () => moveCard(-1));
  document.getElementById("nextCard").addEventListener("click", () => moveCard(1));
  document.getElementById("markKnown").addEventListener("click", () => markCard("known"));
  document.getElementById("markPractice").addEventListener("click", () => markCard("practice"));
  document.getElementById("toggleStar").addEventListener("click", () => {
    const entry = getEntry();
    state.store.starred[entry.id] ? delete state.store.starred[entry.id] : state.store.starred[entry.id] = true;
    saveStore();
    render();
  });
  document.getElementById("saveCard").addEventListener("click", () => {
    const entry = getEntry();
    state.store.edits[entry.id] = {
      definition: els.definitionInput.value.trim() || entry.definition,
      example: els.exampleInput.value.trim() || entry.example
    };
    saveStore();
    render();
  });
  document.getElementById("shuffleDeck").addEventListener("click", shuffleDeck);
  document.getElementById("resetProgress").addEventListener("click", () => {
    if (!confirm("Reset progress, stars, and edited card text?")) return;
    state.store = { known: {}, practice: {}, starred: {}, edits: {}, bestQuiz: 0 };
    saveStore();
    render();
  });
  document.getElementById("startQuiz").addEventListener("click", makeQuiz);
  els.nextQuestion.addEventListener("click", () => {
    state.quiz.current += 1;
    renderQuestion();
  });

  document.addEventListener("keydown", (event) => {
    if (event.target.matches("input, textarea, select")) return;
    if (event.key === "ArrowRight") moveCard(1);
    if (event.key === "ArrowLeft") moveCard(-1);
    if (event.key === " ") {
      event.preventDefault();
      state.flipped = !state.flipped;
      renderCard();
    }
  });
}

bindEvents();
render();
