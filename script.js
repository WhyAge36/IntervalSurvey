// --- Configuration ---
const audioPairs = [
    // Using placeholders as you mentioned
    { pairId: 1, fileA: 'audio/M3_SINE_PURE.wav', fileB: 'audio/M3_SINE_TET.wav' },
    { pairId: 2, fileA: 'audio/M3_SINE_PURE.wav', fileB: 'audio/M3_SINE_TET.wav' },
    { pairId: 3, fileA: 'audio/M3_SINE_PURE.wav', fileB: 'audio/M3_SINE_TET.wav' },
    { pairId: 4, fileA: 'audio/M3_SINE_PURE.wav', fileB: 'audio/M3_SINE_TET.wav' },
    { pairId: 5, fileA: 'audio/M3_SINE_PURE.wav', fileB: 'audio/M3_SINE_TET.wav' },
    { pairId: 6, fileA: 'audio/M3_SINE_PURE.wav', fileB: 'audio/M3_SINE_TET.wav' },
];
const repetitions = 3;
const totalPairs = audioPairs.length;
const totalTrials = totalPairs * repetitions;

// --- State Variables ---
let trialList = [];
let currentTrialIndex = 0;
let results = [];
let participantId = `P_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

// --- HTML Elements ---
const instructionsDiv = document.getElementById('instructions');
const experimentDiv = document.getElementById('experiment');
const completionDiv = document.getElementById('completion');
const startButton = document.getElementById('startButton');
const trialCounterElement = document.getElementById('trialCounter');
const audioPlayerA = document.getElementById('audioA');
const audioPlayerB = document.getElementById('audioB');
const playButtons = document.querySelectorAll('.playButton');
const playButtonA = document.querySelector('.playButton[data-target="audioA"]');
const playButtonB = document.querySelector('.playButton[data-target="audioB"]');
const choiceButtons = document.querySelectorAll('.choiceButton');
const feedbackElement = document.getElementById('feedback'); // Optional
const resultsOutput = document.getElementById('resultsOutput'); // Requires <textarea id="resultsOutput">
const loadingIndicator = document.getElementById('loadingIndicator'); // Requires <div id="loadingIndicator">

// *** ADD THESE LINES TO GET REFERENCES FOR HIDING/SHOWING UI PARTS ***
// Note: These selectors assume the <p> and .audio-pair are direct children of #experiment.
// Adjust selectors if your HTML structure is different, or add specific IDs to these elements in HTML.
const listenParagraph = document.querySelector('#experiment > p');
const audioPairDiv = document.querySelector('#experiment .audio-pair');
// **********************************************************************


// --- Audio Handling (No Interruption Approach) ---

// Function to stop (if playing) and reset audio time
function stopAndReset(audioElement) {
    if (!audioElement) return;
    if (audioElement.paused === false) {
        audioElement.pause();
    }
    audioElement.currentTime = 0;
}

// Helper functions to manage Play button states
function enablePlayButtons() {
    if (playButtonA) playButtonA.disabled = false;
    if (playButtonB) playButtonB.disabled = false;
}
function disablePlayButtons() {
    if (playButtonA) playButtonA.disabled = true;
    if (playButtonB) playButtonB.disabled = true;
}

// --- Event Listeners for Audio ---
audioPlayerA.addEventListener('play', disablePlayButtons);
audioPlayerB.addEventListener('play', disablePlayButtons);

audioPlayerA.addEventListener('ended', () => {
    audioPlayerA.currentTime = 0;
    enablePlayButtons();
});
audioPlayerB.addEventListener('ended', () => {
    audioPlayerB.currentTime = 0;
    enablePlayButtons();
});


// Custom Play Button Click Logic
playButtons.forEach(button => {
    button.addEventListener('click', (event) => {
        const targetId = event.target.dataset.target;
        const audioElement = document.getElementById(targetId);

        if (!audioElement) {
            console.error("Target audio element not found:", targetId);
            return;
        }

        // Check if ANY audio is currently playing
        if (!audioPlayerA.paused || !audioPlayerB.paused) {
            console.log("Cannot play " + targetId + ", another audio is already active.");
            return; // Do nothing
        }

        // If safe: Reset time/volume and play
        console.log("Playing " + targetId);
        audioElement.currentTime = 0;
        audioElement.volume = 1.0;
        audioElement.play();
    });
});

// --- Core Experiment Functions ---

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function createTrialList() {
    trialList = [];
    for (let i = 0; i < repetitions; i++) {
        let pairsCopy = JSON.parse(JSON.stringify(audioPairs));
        trialList.push(...pairsCopy);
    }
    shuffleArray(trialList);
    console.log("Shuffled Trial List:", trialList);
}

function loadTrial(trialIndex) {
    // --- Hide Loading Indicator and Show Controls --- At the very beginning
    console.log("loadTrial: Hiding loading, showing controls.");
    if (loadingIndicator) loadingIndicator.style.display = 'none'; // Hide loading
    // Safety checks added before accessing style:
    if (listenParagraph) listenParagraph.style.display = 'block'; // Show paragraph (adjust if original wasn't block)
    if (audioPairDiv) audioPairDiv.style.display = 'flex';    // Show audio controls (use 'flex' or 'block' as appropriate)
    // ----------------------------------------------

    if (trialIndex >= totalTrials) {
        endExperiment();
        return;
    }

    console.log("Loading trial content:", trialIndex + 1);

    const currentPair = trialList[trialIndex];
    if (!trialCounterElement) {
        console.error("trialCounterElement not found!");
    } else {
        trialCounterElement.textContent = `Trial ${trialIndex + 1} of ${totalTrials}`;
    }

    stopAndReset(audioPlayerA);
    stopAndReset(audioPlayerB);
    enablePlayButtons();

    let displayA = currentPair.fileA;
    let displayB = currentPair.fileB;
    let isSwapped = false;
    if (Math.random() < 0.5) {
        [displayA, displayB] = [displayB, displayA];
        isSwapped = true;
    }
    currentPair.isSwapped = isSwapped; // *** FIXED TYPO HERE ***
    currentPair.displayedFileA = displayA;
    currentPair.displayedFileB = displayB;

    if (audioPlayerA && audioPlayerB) {
        audioPlayerA.src = displayA;
        audioPlayerB.src = displayB;
        audioPlayerA.load();
        audioPlayerB.load();
        audioPlayerA.volume = 1.0;
        audioPlayerB.volume = 1.0;
    } else {
        console.error("Audio player element(s) not found!");
    }

    if(feedbackElement) feedbackElement.style.visibility = 'hidden';
    choiceButtons.forEach(button => {
        button.disabled = false;
        button.style.backgroundColor = '#e0e0e0';
    });
}

function handleChoice(event) {
    console.log("Choice handled for trial:", currentTrialIndex + 1);
    // --- Record the choice data ---
    const chosenOption = event.target.getAttribute('data-choice');
    const currentPairData = trialList[currentTrialIndex];

    let originalChoice;
    if (currentPairData.isSwapped) {
        originalChoice = (chosenOption === 'A') ? 'B' : 'A';
    } else {
        originalChoice = chosenOption;
    }

    console.log(`Trial ${currentTrialIndex + 1}: Chose display option ${chosenOption}. Original choice: ${originalChoice}`);

    results.push({ /* ... results object details ... */
        participantId: participantId, trialNumber: currentTrialIndex + 1, pairId: currentPairData.pairId,
        originalFileA: currentPairData.fileA, originalFileB: currentPairData.fileB,
        displayedFileA: currentPairData.displayedFileA, displayedFileB: currentPairData.displayedFileB,
        positionSwapped: currentPairData.isSwapped, selectedOptionDisplayed: chosenOption,
        selectedOptionOriginal: originalChoice, timestamp: new Date().toISOString()
    });

    // --- Update UI Immediately ---
    choiceButtons.forEach(button => {
        button.disabled = true;
        if (button.getAttribute('data-choice') === chosenOption) {
            button.style.backgroundColor = '#a0d0a0';
        } else {
            button.style.backgroundColor = '#e0e0e0';
        }
    });
    disablePlayButtons();

    // --- Define function to check audio state and load next trial ---
    function checkAudioAndLoadNextTrial() {
        const playerAExists = !!audioPlayerA;
        const playerBExists = !!audioPlayerB;
        const playerAPaused = playerAExists ? audioPlayerA.paused : true;
        const playerBPaused = playerBExists ? audioPlayerB.paused : true;

        // console.log(`Checking audio state: A paused=${playerAPaused}, B paused=${playerBPaused}`);

        if (playerAPaused && playerBPaused) {
            // --- Both are paused/finished, SHOW LOADING and DELAY before loading next trial ---
            console.log("Both players paused/stopped. Showing loading indicator.");
            if (loadingIndicator) loadingIndicator.style.display = 'block'; // Show Loading
            // Safety checks added:
            if (listenParagraph) listenParagraph.style.display = 'none';    // Hide Controls
            if (audioPairDiv) audioPairDiv.style.display = 'none';       // Hide Controls

            // *** ADDED DELAY HERE ***
            const loadingDisplayDuration = 400; // Duration in ms to show "Loading..." (Adjust if needed)
            console.log(`Waiting ${loadingDisplayDuration}ms before loading next trial.`);

            setTimeout(() => {
                // This code runs *after* the delay
                console.log("Loading display duration elapsed. Loading next trial.");
                currentTrialIndex++;
                loadTrial(currentTrialIndex); // loadTrial will hide the indicator again
            }, loadingDisplayDuration);
            // *** END OF ADDED DELAY ***

        } else {
            // Audio still playing, check again shortly
            // console.log("Audio still playing. Will check again in 100ms.");
            setTimeout(checkAudioAndLoadNextTrial, 100);
        }
    }

    // --- Start the checking process after an initial delay ---
    console.log("Choice made. Waiting 500ms before starting audio checks...");
    setTimeout(checkAudioAndLoadNextTrial, 500);
}function startExperiment() {
    console.log("Start button clicked!");
    if (instructionsDiv && experimentDiv && completionDiv) {
        instructionsDiv.style.display = 'none';
        experimentDiv.style.display = 'block';
        completionDiv.style.display = 'none';

        createTrialList();
        currentTrialIndex = 0;
        results = [];
        loadTrial(currentTrialIndex);
    } else {
         console.error("One or more main divs (instructions, experiment, completion) not found!");
    }
}

function endExperiment() {
    console.log("Ending experiment.");
    if (experimentDiv && completionDiv) {
        experimentDiv.style.display = 'none';
        completionDiv.style.display = 'block';
    } else {
        console.error("Experiment or completion div not found!");
    }

    console.log("Experiment Finished. Results:", results);

    stopAndReset(audioPlayerA);
    stopAndReset(audioPlayerB);

    if(resultsOutput) {
         resultsOutput.value = JSON.stringify(results, null, 2);
    } else {
        console.warn("resultsOutput textarea not found in HTML to display results.");
    }
    // generateAndRedirectToGoogleForm(results); // Placeholder
}

// --- Google Form Function Placeholder --- (Keep commented out unless configured)
/*
function generateAndRedirectToGoogleForm(data) { ... }
*/

// --- Global Event Listeners ---
if (startButton) {
    startButton.addEventListener('click', startExperiment);
} else {
    console.error("Start button element with ID 'startButton' not found!");
}

if (choiceButtons && choiceButtons.length > 0) {
    choiceButtons.forEach(button => {
        button.addEventListener('click', handleChoice);
    });
} else {
     console.warn("Choice buttons with class 'choiceButton' not found!");
}

if (playButtons && playButtons.length > 0) {
    console.log("Play button listeners attached earlier."); // Listeners attached above
} else {
     console.warn("Play buttons with class 'playButton' not found!");
}

console.log("Script loaded. Event listeners should be attached if elements were found.");
