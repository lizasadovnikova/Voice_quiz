let questions = [];
let currentQ = 0;
let score = 0;
let timer;
let timeLeft = 20;
let recognizer;

async function startQuiz() {
    const key = document.getElementById('azureKey').value.trim();
    const region = document.getElementById('azureRegion').value.trim();
    
    if (!key || !region) {
        alert("Будь ласка, введіть Key та Region!");
        return;
    }

    try {
        const response = await fetch('questions.json');
        questions = await response.json();
    } catch (error) {
        console.error("Помилка завантаження питань:", error);
        alert("Не вдалося завантажити questions.json. Переконайтеся, що запускаєте через локальний сервер (http.server).");
        return;
    }

    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(key, region);
    speechConfig.speechRecognitionLanguage = "uk-UA";
    speechConfig.setProperty(SpeechSDK.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs, "10000");
    
    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

    document.getElementById('setupScreen').classList.add('hidden');
    document.getElementById('quizScreen').classList.remove('hidden');
    loadQuestion();
}

function loadQuestion() {
    timeLeft = 20;
    document.getElementById('timerDisplay').innerText = timeLeft;
    document.getElementById('questionCounter').innerText = `Питання ${currentQ + 1}/${questions.length}`;
    document.getElementById('questionText').innerText = questions[currentQ].q;
    
    document.getElementById('recordBtn').disabled = false;
    document.getElementById('recordBtn').classList.remove('opacity-50', 'cursor-not-allowed');
    document.getElementById('statusText').innerText = "Натисніть кнопку, щоб відповісти";
    
    document.getElementById('feedbackBox').classList.add('hidden');
    document.getElementById('nextBtn').classList.add('hidden');
    document.getElementById('skipBtn').classList.remove('hidden');

    clearInterval(timer);
    timer = setInterval(() => {
        timeLeft--;
        document.getElementById('timerDisplay').innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timer);
            handleAnswer(null, "Час вийшов!");
        }
    }, 1000);
}

function startRecording() {
    document.getElementById('recordBtn').disabled = true;
    document.getElementById('recordBtn').classList.add('animate-pulse', 'opacity-80');
    document.getElementById('statusText').innerText = "Слухаю... Говоріть!";
    document.getElementById('feedbackBox').classList.add('hidden');

    recognizer.recognizeOnceAsync(
        function (result) {
            document.getElementById('recordBtn').classList.remove('animate-pulse');
            
            if (timeLeft <= 0) return;

            if (result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                handleAnswer(result.text);
            } else if (result.reason === SpeechSDK.ResultReason.NoMatch) {
                document.getElementById('recordBtn').disabled = false;
                document.getElementById('recordBtn').classList.remove('opacity-50', 'cursor-not-allowed');
                document.getElementById('statusText').innerHTML = "<span class='text-red-500 font-bold'>Система не розчула відповідь. Спробуйте ще раз! (натисніть кнопку)</span>";
            }
        },
        function (err) {
            console.error(err);
            document.getElementById('recordBtn').classList.remove('animate-pulse');
            if (timeLeft > 0) handleAnswer(null, "Помилка мікрофона або API.");
        }
    );
}

function skipQuestion() {
    clearInterval(timer);
    document.getElementById('recordBtn').classList.add('opacity-50', 'cursor-not-allowed');
    document.getElementById('recordBtn').disabled = true;
    document.getElementById('skipBtn').classList.add('hidden');
    document.getElementById('statusText').innerText = "";
    
    const feedbackBox = document.getElementById('feedbackBox');
    feedbackBox.className = 'p-4 rounded-lg font-bold mb-4 bg-gray-200 text-gray-700';
    feedbackBox.innerHTML = `⏭Питання пропущено (0 балів).<br><span class="text-sm font-normal">Правильна відповідь: ${questions[currentQ].a[0]}</span>`;
    
    document.getElementById('nextBtn').classList.remove('hidden');
}

function handleAnswer(spokenText, errorMessage = null) {
    clearInterval(timer);
    document.getElementById('recordBtn').classList.add('opacity-50', 'cursor-not-allowed');
    document.getElementById('recordBtn').disabled = true;
    document.getElementById('skipBtn').classList.add('hidden');
    
    const feedbackBox = document.getElementById('feedbackBox');
    feedbackBox.className = 'p-4 rounded-lg font-bold mb-4';

    let displayAnswer = questions[currentQ].a[0];

    if (errorMessage) {
        feedbackBox.classList.add('bg-red-100', 'text-red-700');
        feedbackBox.innerHTML = `${errorMessage}<br><span class="text-sm font-normal text-gray-600">Очікувалось: ${displayAnswer}</span>`;
    } else {
        let cleanedText = spokenText.trim().toLowerCase().replace(/[.,!?]/g, "");
        let expected = questions[currentQ].a;
        
        if (expected.some(ans => cleanedText.includes(ans))) {
            score++;
            feedbackBox.classList.add('bg-green-100', 'text-green-700');
            feedbackBox.innerHTML = `Правильно!`;
        } else {
            feedbackBox.classList.add('bg-red-100', 'text-red-700');
            feedbackBox.innerHTML = `Помилка.<br><span class="text-sm font-normal text-gray-600">Ваша відповідь: ${cleanedText}<br>Очікувана відповідь: ${displayAnswer}</span>`;
        }
    }
    
    document.getElementById('statusText').innerText = "";
    document.getElementById('nextBtn').classList.remove('hidden');
}

function nextQuestion() {
    currentQ++;
    if (currentQ < questions.length) {
        loadQuestion();
    } else {
        showResults();
    }
}

function showResults() {
    document.getElementById('quizScreen').classList.add('hidden');
    document.getElementById('resultScreen').classList.remove('hidden');
    
    const scoreElement = document.getElementById('finalScore');
    const titleElement = document.getElementById('resultTitle');
    const messageElement = document.getElementById('resultMessage');
    
    scoreElement.innerText = `${score} з ${questions.length}`;
    
    const percentage = score / questions.length;

    if (percentage === 1) {
        titleElement.innerText = "Ідеально!";
        titleElement.className = "text-3xl font-bold mb-2 text-green-600";
        messageElement.innerText = "Ви справжній геній математики! Жодної помилки.";
        scoreElement.className = "font-bold text-3xl text-green-600";
    } else if (percentage >= 0.7) {
        titleElement.innerText = "Чудова робота!";
        titleElement.className = "text-3xl font-bold mb-2 text-blue-600";
        messageElement.innerText = "Дуже хороший результат! Лише кілька дрібних помилок.";
        scoreElement.className = "font-bold text-3xl text-blue-600";
    } else if (percentage >= 0.4) {
        titleElement.innerText = "Непогано, але...";
        titleElement.className = "text-3xl font-bold mb-2 text-yellow-600";
        messageElement.innerText = "Є куди рости. Варто трохи попрактикуватися!";
        scoreElement.className = "font-bold text-3xl text-yellow-600";
    } else {
        titleElement.innerText = "Треба вчити програмування!";
        titleElement.className = "text-3xl font-bold mb-2 text-red-600";
        messageElement.innerText = "Нічого страшного, спробуйте ще раз і вийде краще!";
        scoreElement.className = "font-bold text-3xl text-red-600";
    }
}