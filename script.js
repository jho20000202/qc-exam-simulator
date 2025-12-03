// ===== State Management =====
let allQuestions = [];
let questions = [];
let currentQuestionIndex = 0;
let userAnswers = {}; // Store user's answers: { questionId: { selected: 'A', correct: 'B' } }
let testMode = null; // 'simulation' or 'practice'
let timerInterval = null;
let timeRemaining = 0; // in seconds
let startTime = null;

// ===== DOM Elements =====
const modeSelection = document.getElementById('mode-selection');
const quizContainer = document.getElementById('quiz-container');
const resultScreen = document.getElementById('result-screen');
const simulationBtn = document.getElementById('simulation-btn');
const practiceBtn = document.getElementById('practice-btn');
const restartBtn = document.getElementById('restart-btn');
const homeBtn = document.getElementById('home-btn');

const questionNumber = document.getElementById('question-number');
const questionUnit = document.getElementById('question-unit');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const currentQuestionSpan = document.getElementById('current-question');
const totalQuestionsSpan = document.getElementById('total-questions');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const submitBtn = document.getElementById('submit-btn');
const answeredCountSpan = document.getElementById('answered-count');
const correctCountSpan = document.getElementById('correct-count');
const incorrectCountSpan = document.getElementById('incorrect-count');

const timerElement = document.getElementById('timer');
const timerDisplay = document.getElementById('timer-display');

// ===== Utility Functions =====
function shuffleArray(array) {
    // Fisher-Yates shuffle
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
}

// ===== Initialize App =====
async function init() {
    try {
        const response = await fetch('questions.json');
        allQuestions = await response.json();

        if (allQuestions.length === 0) {
            alert('沒有找到題目資料');
            return;
        }

        // Set up mode selection
        simulationBtn.addEventListener('click', () => startTest('simulation'));
        practiceBtn.addEventListener('click', () => startTest('practice'));
        restartBtn.addEventListener('click', resetToModeSelection);
        if (homeBtn) {
            homeBtn.addEventListener('click', () => {
                if (confirm('確定要返回首頁嗎？目前進度將會遺失。')) {
                    resetToModeSelection();
                }
            });
        }

    } catch (error) {
        console.error('載入題目失敗:', error);
        alert('載入題目時發生錯誤，請確認 questions.json 檔案存在');
    }
}

// ===== Start Test =====
function startTest(mode) {
    testMode = mode;
    currentQuestionIndex = 0;
    userAnswers = {};

    if (mode === 'simulation') {
        // Simulation mode: 100 random questions, 90 minute timer
        questions = shuffleArray(allQuestions).slice(0, 100);
        timeRemaining = 90 * 60; // 90 minutes in seconds
        startTime = Date.now();
        timerElement.style.display = 'flex';
        submitBtn.style.display = 'block';
        startTimer();
    } else {
        // Practice mode: all questions shuffled, no timer
        questions = shuffleArray(allQuestions);
        timerElement.style.display = 'none';
        submitBtn.style.display = 'none';
    }

    totalQuestionsSpan.textContent = questions.length;

    // Hide mode selection, show quiz
    modeSelection.style.display = 'none';
    quizContainer.style.display = 'block';

    renderQuestion();
    updateNavButtons();
}

// ===== Timer Functions =====
function startTimer() {
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            submitTest();
        }
    }, 1000);
}

function updateTimerDisplay() {
    timerDisplay.textContent = formatTime(timeRemaining);

    // Add warning/danger classes
    timerElement.classList.remove('warning', 'danger');
    if (timeRemaining <= 300) { // 5 minutes
        timerElement.classList.add('danger');
    } else if (timeRemaining <= 600) { // 10 minutes
        timerElement.classList.add('warning');
    }
}

// ===== Render Current Question =====
function renderQuestion() {
    const question = questions[currentQuestionIndex];

    if (!question) return;

    // Update question info
    questionNumber.textContent = `題號 ${question.id}`;
    questionUnit.textContent = question.unit || '未分類';
    questionText.textContent = question.question;
    currentQuestionSpan.textContent = currentQuestionIndex + 1;

    // Clear previous options
    optionsContainer.innerHTML = '';

    // Create option buttons
    const optionKeys = ['A', 'B', 'C', 'D'];
    optionKeys.forEach(key => {
        if (question.options[key]) {
            const button = createOptionButton(key, question.options[key], question);
            optionsContainer.appendChild(button);
        }
    });

    // Update stats
    updateStats();
}

// ===== Create Option Button =====
function createOptionButton(key, text, question) {
    const button = document.createElement('button');
    button.className = 'option-btn';
    button.dataset.option = key;

    const label = document.createElement('span');
    label.className = 'option-label';
    label.textContent = key;

    const optionText = document.createElement('span');
    optionText.className = 'option-text';
    optionText.textContent = text;

    button.appendChild(label);
    button.appendChild(optionText);

    // Check if this question was already answered
    const previousAnswer = userAnswers[question.id];
    if (previousAnswer) {
        // Disable all buttons and show previous result
        button.disabled = true;

        if (testMode === 'practice') {
            // In practice mode, show correct/incorrect immediately
            if (key === question.answer) {
                button.classList.add('correct');
            }

            if (key === previousAnswer.selected && key !== question.answer) {
                button.classList.add('incorrect');
            }
        }
    } else {
        // Add click handler for new answer
        button.addEventListener('click', () => handleAnswer(key, question));
    }

    return button;
}

// ===== Handle Answer Selection =====
function handleAnswer(selectedOption, question) {
    const correctAnswer = question.answer;
    const isCorrect = selectedOption === correctAnswer;

    // Store the answer
    userAnswers[question.id] = {
        selected: selectedOption,
        correct: correctAnswer
    };

    // Get all option buttons
    const optionButtons = optionsContainer.querySelectorAll('.option-btn');

    // Disable all buttons
    optionButtons.forEach(btn => {
        btn.disabled = true;
    });

    if (testMode === 'practice') {
        // In practice mode, show feedback immediately
        optionButtons.forEach(btn => {
            const option = btn.dataset.option;

            // Highlight correct answer in green
            if (option === correctAnswer) {
                btn.classList.add('correct');
            }

            // Highlight incorrect selection in red
            if (option === selectedOption && option !== correctAnswer) {
                btn.classList.add('incorrect');
            }
        });

        // Auto-advance only if answer is correct
        if (isCorrect && currentQuestionIndex < questions.length - 1) {
            setTimeout(() => {
                nextQuestion();
            }, 1000); // 1 second delay to show the green feedback
        }
    } else if (testMode === 'simulation') {
        // In simulation mode, auto-advance immediately (no feedback shown)
        if (currentQuestionIndex < questions.length - 1) {
            setTimeout(() => {
                nextQuestion();
            }, 500); // Short delay for smooth transition
        }
    }

    // Update stats
    updateStats();
}

// ===== Navigation Functions =====
function nextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        renderQuestion();
        updateNavButtons();
        scrollToTop();
    }
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuestion();
        updateNavButtons();
        scrollToTop();
    }
}

function updateNavButtons() {
    prevBtn.disabled = currentQuestionIndex === 0;
    nextBtn.disabled = currentQuestionIndex === questions.length - 1;
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== Update Statistics =====
function updateStats() {
    const answered = Object.keys(userAnswers).length;
    let correct = 0;
    let incorrect = 0;

    Object.values(userAnswers).forEach(answer => {
        if (answer.selected === answer.correct) {
            correct++;
        } else {
            incorrect++;
        }
    });

    answeredCountSpan.textContent = answered;
    correctCountSpan.textContent = correct;
    incorrectCountSpan.textContent = incorrect;
}

// ===== Submit Test (Simulation Mode) =====
function submitTest() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }

    const answered = Object.keys(userAnswers).length;
    let correct = 0;
    let incorrect = 0;

    Object.values(userAnswers).forEach(answer => {
        if (answer.selected === answer.correct) {
            correct++;
        } else {
            incorrect++;
        }
    });

    const unanswered = questions.length - answered;
    const score = correct;
    const percentage = Math.round((correct / questions.length) * 100);
    const passed = percentage >= 60;

    // Calculate elapsed time
    const elapsedSeconds = testMode === 'simulation'
        ? (90 * 60) - timeRemaining
        : Math.floor((Date.now() - startTime) / 1000);

    // Show result screen
    showResults(score, percentage, passed, correct, incorrect + unanswered, elapsedSeconds);
}

// ===== Show Results =====
function showResults(score, percentage, passed, correct, incorrect, elapsedSeconds) {
    const scoreValue = document.getElementById('score-value');
    const scorePercentage = document.getElementById('score-percentage');
    const scoreCircle = document.getElementById('score-circle');
    const resultStatus = document.getElementById('result-status');
    const resultCorrect = document.getElementById('result-correct');
    const resultIncorrect = document.getElementById('result-incorrect');
    const resultTime = document.getElementById('result-time');

    scoreValue.textContent = score;
    scorePercentage.textContent = `${percentage}%`;
    resultCorrect.textContent = correct;
    resultIncorrect.textContent = incorrect;
    resultTime.textContent = formatTime(elapsedSeconds);

    // Update pass/fail status
    scoreCircle.classList.remove('pass', 'fail');
    resultStatus.classList.remove('pass', 'fail');

    if (passed) {
        scoreCircle.classList.add('pass');
        resultStatus.classList.add('pass');
        resultStatus.textContent = '✓ 及格';
    } else {
        scoreCircle.classList.add('fail');
        resultStatus.classList.add('fail');
        resultStatus.textContent = '✗ 不及格';
    }

    // Hide quiz, show results
    quizContainer.style.display = 'none';
    resultScreen.style.display = 'flex';
}

// ===== Reset to Mode Selection =====
function resetToModeSelection() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }

    testMode = null;
    questions = [];
    currentQuestionIndex = 0;
    userAnswers = {};
    timeRemaining = 0;

    resultScreen.style.display = 'none';
    quizContainer.style.display = 'none';
    modeSelection.style.display = 'flex';
}

// ===== Event Listeners =====
prevBtn.addEventListener('click', prevQuestion);
nextBtn.addEventListener('click', nextQuestion);
submitBtn.addEventListener('click', () => {
    if (confirm('確定要提交測驗嗎？')) {
        submitTest();
    }
});

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (quizContainer.style.display === 'block') {
        if (e.key === 'ArrowLeft') {
            prevQuestion();
        } else if (e.key === 'ArrowRight') {
            nextQuestion();
        }
    }
});

// ===== Start the App =====
init();
