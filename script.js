const $ = (id) => document.getElementById(id);

// Save data in the browser
const CARDS_KEY = "flashcards";
const STATS_KEY = "flashlearnStats";

const defaultCards = [
    {
        question: "What does HTML stand for?",
        answer: "HyperText Markup Language",
        category: "Web Development",
        difficult: false
    },
    {
        question: "What does CSS stand for?",
        answer: "Cascading Style Sheets",
        category: "Web Development",
        difficult: false
    },
    {
        question: "What is JavaScript used for?",
        answer: "To add interactivity and dynamic behaviour to web pages.",
        category: "Web Development",
        difficult: false
    },
    {
        question: "What is a primary key?",
        answer: "A field that uniquely identifies each record in a database.",
        category: "DBMS",
        difficult: false
    },
    {
        question: "What is a variable?",
        answer: "A named storage location used to hold a value.",
        category: "Programming",
        difficult: false
    }
];

let flashcards = loadCards();
let stats = loadStats();

let currentIndex = 0;
let visibleCards = [];
let difficultOnly = false;
let editingIndex = null;
let answerVisible = false;

let quizCards = [];
let quizIndex = 0;
let score = 0;
let answered = false;
let timeLeft = 20;
let timerId = null;

// Load saved flashcards and support older card data
function loadCards() {
    try {
        const saved = localStorage.getItem(CARDS_KEY);

        if (!saved) return [...defaultCards];

        const cards = JSON.parse(saved);
        if (!Array.isArray(cards)) return [...defaultCards];

        return cards.map(card => ({
            question: card.question || "",
            answer: card.answer || "",
            category: card.category || "General",
            difficult: Boolean(card.difficult)
        }));
    } catch {
        return [...defaultCards];
    }
}

function loadStats() {
    try {
        return JSON.parse(localStorage.getItem(STATS_KEY)) || {
            completed: 0,
            totalScore: 0,
            bestScore: 0
        };
    } catch {
        return { completed: 0, totalScore: 0, bestScore: 0 };
    }
}

function saveCards() {
    localStorage.setItem(CARDS_KEY, JSON.stringify(flashcards));
}

function saveStats() {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

function updateDashboard() {
    $("totalCards").textContent = flashcards.length;
    $("quizzesCompleted").textContent = stats.completed;

    const average = stats.completed
        ? Math.round(stats.totalScore / stats.completed)
        : 0;

    $("averageScore").textContent = average + "%";
    $("bestScore").textContent = stats.bestScore + "%";
}

// Category filtering and difficult-card revision
function updateCategoryFilter() {
    const filter = $("categoryFilter");
    const oldValue = filter.value;

    const categories = [...new Set(
        flashcards.map(card => card.category.trim() || "General")
    )].sort();

    filter.innerHTML = '<option value="All">All Subjects</option>';

    categories.forEach(category => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        filter.appendChild(option);
    });

    if (categories.includes(oldValue)) {
        filter.value = oldValue;
    } else {
        filter.value = "All";
    }
}

function updateVisibleCards() {
    const category = $("categoryFilter").value;

    visibleCards = flashcards
        .map((card, index) => ({ ...card, originalIndex: index }))
        .filter(card => category === "All" || card.category === category)
        .filter(card => !difficultOnly || card.difficult);

    if (currentIndex >= visibleCards.length) currentIndex = 0;

    displayCard();
}

function displayCard() {
    const card = visibleCards[currentIndex];

    if (!card) {
        $("question").textContent = "No flashcards found.";
        $("answer").textContent = "";
        $("answer").classList.add("hidden");
        $("cardCategory").textContent = "No cards";
        $("cardPosition").textContent = "Add a card or change the filter.";
        $("showAnswerBtn").disabled = true;
        $("prevBtn").disabled = true;
        $("nextBtn").disabled = true;
        $("difficultBtn").disabled = true;
        $("deleteCardBtn").disabled = true;
        return;
    }

    $("showAnswerBtn").disabled = false;
    $("prevBtn").disabled = visibleCards.length < 2;
    $("nextBtn").disabled = visibleCards.length < 2;
    $("difficultBtn").disabled = false;
    $("deleteCardBtn").disabled = false;

    $("question").textContent = card.question;
    $("answer").textContent = card.answer;
    $("cardCategory").textContent = card.category;
    $("cardPosition").textContent =
        `Card ${currentIndex + 1} of ${visibleCards.length}`;

    $("answer").classList.toggle("hidden", !answerVisible);
    $("showAnswerBtn").textContent =
        answerVisible ? "Hide Answer" : "Show Answer";

    $("difficultBtn").textContent =
        card.difficult ? "★ Difficult" : "☆ Difficult";

    $("difficultBtn").classList.toggle("marked", card.difficult);
}

function showCurrentAnswer() {
    if (!visibleCards.length) return;

    answerVisible = !answerVisible;
    displayCard();
}

function moveCard(direction) {
    if (!visibleCards.length) return;

    currentIndex =
        (currentIndex + direction + visibleCards.length) %
        visibleCards.length;

    answerVisible = false;
    displayCard();
}

function toggleDifficult() {
    const card = visibleCards[currentIndex];
    if (!card) return;

    flashcards[card.originalIndex].difficult =
        !flashcards[card.originalIndex].difficult;

    saveCards();
    updateVisibleCards();
    updateDashboard();
}

// Add and edit flashcards
$("cardForm").addEventListener("submit", function (event) {
    event.preventDefault();

    const question = $("questionInput").value.trim();
    const answer = $("answerInput").value.trim();
    const category = $("categoryInput").value.trim() || "General";

    if (!question || !answer) return;

    const newCard = {
        question,
        answer,
        category,
        difficult: false
    };

    if (editingIndex !== null) {
        newCard.difficult = flashcards[editingIndex].difficult;
        flashcards[editingIndex] = newCard;
        $("formMessage").textContent = "Flashcard updated!";
    } else {
        flashcards.push(newCard);
        $("formMessage").textContent = "Flashcard added!";
    }

    saveCards();
    resetForm();
    updateCategoryFilter();
    updateVisibleCards();
    updateDashboard();
});

function resetForm() {
    editingIndex = null;
    $("cardForm").reset();
    $("categoryInput").value = "General";
    $("saveCardBtn").textContent = "Add Card";
    $("cancelEditBtn").classList.add("hidden");
}

function editCurrentCard() {
    const card = visibleCards[currentIndex];
    if (!card) return;

    editingIndex = card.originalIndex;

    $("questionInput").value = card.question;
    $("answerInput").value = card.answer;
    $("categoryInput").value = card.category;

    $("saveCardBtn").textContent = "Save Changes";
    $("cancelEditBtn").classList.remove("hidden");
    $("formMessage").textContent = "Editing the selected flashcard.";

    $("cardForm").scrollIntoView({ behavior: "smooth" });
}

function deleteCurrentCard() {
    const card = visibleCards[currentIndex];
    if (!card) return;

    if (!confirm("Delete this flashcard?")) return;

    flashcards.splice(card.originalIndex, 1);
    saveCards();
    resetForm();
    updateCategoryFilter();
    updateVisibleCards();
    updateDashboard();

    $("formMessage").textContent = "Flashcard deleted.";
}

// Quiz functionality
function startQuiz() {
    if (flashcards.length < 2) {
        alert("Please add at least 2 flashcards before starting a quiz.");
        return;
    }

    clearInterval(timerId);

    quizCards = [...flashcards].sort(() => Math.random() - 0.5);
    quizIndex = 0;
    score = 0;

    $("startQuizBtn").classList.add("hidden");
    $("quizResult").classList.add("hidden");
    $("quizArea").classList.remove("hidden");

    showQuizQuestion();
}

function showQuizQuestion() {
    clearInterval(timerId);

    if (quizIndex >= quizCards.length) {
        showQuizResult();
        return;
    }

    answered = false;
    timeLeft = 20;

    const card = quizCards[quizIndex];

    $("quizProgress").textContent =
        `Question ${quizIndex + 1} of ${quizCards.length}`;
    $("liveScore").textContent = `Score: ${score}`;
    $("quizQuestion").textContent = card.question;
    $("quizFeedback").textContent = "";
    $("nextQuestionBtn").classList.add("hidden");
    $("timer").textContent = timeLeft + "s";

    const wrongAnswers = flashcards
        .filter(item => item.answer !== card.answer)
        .map(item => item.answer);

    const uniqueWrongAnswers = [...new Set(wrongAnswers)];

    // Build options using the correct answer and other flashcard answers
    const options = [card.answer];

    while (options.length < Math.min(4, uniqueWrongAnswers.length + 1)) {
        const choice = uniqueWrongAnswers[
            Math.floor(Math.random() * uniqueWrongAnswers.length)
        ];

        if (!options.includes(choice)) options.push(choice);
    }

    options.sort(() => Math.random() - 0.5);

    const optionsArea = $("quizOptions");
    optionsArea.innerHTML = "";

    options.forEach(optionText => {
        const button = document.createElement("button");
        button.textContent = optionText;
        button.addEventListener("click", () => checkAnswer(button, optionText));
        optionsArea.appendChild(button);
    });

    timerId = setInterval(() => {
        timeLeft--;
        $("timer").textContent = timeLeft + "s";

        if (timeLeft <= 0) {
            clearInterval(timerId);
            checkAnswer(null, null);
        }
    }, 1000);
}

function checkAnswer(selectedButton, selectedAnswer) {
    if (answered) return;

    answered = true;
    clearInterval(timerId);

    const correctAnswer = quizCards[quizIndex].answer;
    const buttons = $("quizOptions").querySelectorAll("button");

    buttons.forEach(button => {
        button.disabled = true;

        if (button.textContent === correctAnswer) {
            button.classList.add("correct");
        }
    });

    if (selectedAnswer === correctAnswer) {
        score++;
        $("quizFeedback").textContent = "Correct! 🎉";
    } else if (selectedAnswer === null) {
        $("quizFeedback").textContent =
            "Time's up! The answer was: " + correctAnswer;
    } else {
        selectedButton.classList.add("wrong");
        $("quizFeedback").textContent =
            "Not quite! The answer was: " + correctAnswer;
    }

    $("liveScore").textContent = `Score: ${score}`;
    $("nextQuestionBtn").textContent =
        quizIndex === quizCards.length - 1 ? "View Results" : "Next Question";
    $("nextQuestionBtn").classList.remove("hidden");
}

function nextQuestion() {
    quizIndex++;
    showQuizQuestion();
}

function showQuizResult() {
    clearInterval(timerId);
    $("quizArea").classList.add("hidden");
    $("quizResult").classList.remove("hidden");
    $("startQuizBtn").classList.remove("hidden");

    const percentage = Math.round((score / quizCards.length) * 100);

    $("resultText").textContent =
        `You scored ${score} out of ${quizCards.length} (${percentage}%).`;

    stats.completed++;
    stats.totalScore += percentage;
    stats.bestScore = Math.max(stats.bestScore, percentage);

    saveStats();
    updateDashboard();
}

function restartQuiz() {
    startQuiz();
}

// Import and export flashcards
function exportCards() {
    const file = new Blob(
        [JSON.stringify(flashcards, null, 2)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(file);
    const link = document.createElement("a");

    link.href = url;
    link.download = "flashlearn-cards.json";
    link.click();

    URL.revokeObjectURL(url);
}

function importCards(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function () {
        try {
            const imported = JSON.parse(reader.result);

            if (!Array.isArray(imported) ||
                !imported.every(card =>
                    card &&
                    typeof card.question === "string" &&
                    typeof card.answer === "string"
                )) {
                throw new Error("Invalid flashcard file");
            }

            const cleanCards = imported.map(card => ({
                question: card.question.trim(),
                answer: card.answer.trim(),
                category: typeof card.category === "string"
                    ? card.category.trim() || "General"
                    : "General",
                difficult: Boolean(card.difficult)
            })).filter(card => card.question && card.answer);

            if (!cleanCards.length) {
                alert("No valid flashcards were found in that file.");
                return;
            }

            if (!confirm(
                `Import ${cleanCards.length} cards? This will replace your current flashcards.`
            )) return;

            flashcards = cleanCards;
            currentIndex = 0;
            difficultOnly = false;
            $("categoryFilter").value = "All";

            saveCards();
            updateCategoryFilter();
            updateVisibleCards();
            updateDashboard();

            alert("Flashcards imported successfully!");
        } catch {
            alert("Could not import this file. Please choose a valid JSON export.");
        } finally {
            $("importFile").value = "";
        }
    };

    reader.readAsText(file);
}

// Button events
$("showAnswerBtn").addEventListener("click", showCurrentAnswer);
$("prevBtn").addEventListener("click", () => moveCard(-1));
$("nextBtn").addEventListener("click", () => moveCard(1));
$("difficultBtn").addEventListener("click", toggleDifficult);

$("categoryFilter").addEventListener("change", () => {
    currentIndex = 0;
    updateVisibleCards();
});

$("reviseBtn").addEventListener("click", () => {
    difficultOnly = true;
    currentIndex = 0;
    updateVisibleCards();

    if (!visibleCards.length) {
        alert("No difficult cards yet. Mark a card as difficult first.");
    }
});

$("showAllBtn").addEventListener("click", () => {
    difficultOnly = false;
    currentIndex = 0;
    updateVisibleCards();
});

$("cancelEditBtn").addEventListener("click", resetForm);
$("deleteCardBtn").addEventListener("click", deleteCurrentCard);
$("startQuizBtn").addEventListener("click", startQuiz);
$("nextQuestionBtn").addEventListener("click", nextQuestion);
$("restartQuizBtn").addEventListener("click", restartQuiz);

$("exportBtn").addEventListener("click", exportCards);
$("importBtn").addEventListener("click", () => $("importFile").click());
$("importFile").addEventListener("change", importCards);

// Edit button is created here so the card form stays simple
const editButton = document.createElement("button");
editButton.textContent = "Edit Current Card";
editButton.type = "button";
editButton.className = "secondary";
editButton.addEventListener("click", editCurrentCard);
$("deleteCardBtn").before(editButton);

// Start the app
saveCards();
updateCategoryFilter();
updateVisibleCards();
updateDashboard();