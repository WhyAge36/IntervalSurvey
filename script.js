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

// --- Fade Configuration ---
const FADE_DURATION = 100; // Milliseconds for fade-out (adjust 50-200ms if needed)
const FADE_INTERVAL = 10;  // Milliseconds between volume steps

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
const choiceButtons = document.querySelectorAll('.choiceButton');
const feedbackElement = document.getElementById('feedback');
const resultsOutput = document.getElementById('resultsOutput');

// --- Audio Handling Functions ---

// Function to Fade Out, Stop, Reset Time, Restore Volume
// This version does NOT handle button text updates.
function fadeOutAndStop(audioElement) {
    // Avoid fading if already silent or already fading out
    if (!audioElement || audioElement.volume === 0 || audioElement.isFadingOut) {
        // Ensure it's paused and reset if needed, even if fade is skipped
        if (!audioElement.paused) audioElement.pause();
        if (!audioElement.isFadingOut) audioElement.currentTime = 0;
        return;
    }

    audioElement.isFadingOut = true; // Flag to prevent multiple concurrent fades

    let currentVolume = audioElement.volume;
    const steps = FADE_DURATION / FADE_INTERVAL;
    const volumeDecrement = steps > 0 ? (currentVolume / steps) : currentVolume;

    const fadeInterval = setInterval(() => {
        currentVolume -= volumeDecrement;

        if (currentVolume <= 0) {
            clearInterval(fadeInterval); // Stop the interval

            audioElement.pause();          // Pause after fade
            audioElement.currentTime = 0;  // Reset time
            audioElement.volume = 1.0;       // Restore volume for next play
            audioElement.isFadingOut = false; // Clear the flag
            // console.log(audioElement.id + " faded out and stopped."); // Debugging
        } else {
            // Decrease volume smoothly
            audioElement.volume = currentVolume;
        }
    }, FADE_INTERVAL);
}

// --- Event Listeners for Audio ---

// When audio finishes NATURALLY: Just reset its time
audioPlayerA.addEventListener('ended', () => { audioPlayerA.currentTime = 0; });
audioPlayerB.addEventListener('ended', () => { audioPlayerB.currentTime = 0; });

// --- REMOVED 'pause' event listeners - Resetting time is handled by fadeOutAndStop or the 'ended' event ---

// Exclusive Playback Logic (Using Fade-Out for interruption):
// When A starts playing:
audioPlayerA.addEventListener('play', () => {
    // Fade out B if it's currently playing or already fading out
    if (!audioPlayerB.paused || audioPlayerB.isFadingOut) {
        fadeOutAndStop(audioPlayerB); // Stop B smoothly
    }
    // No button text update needed
});

// When B starts playing:
audioPlayerB.addEventListener('play', () => {
    // Fade out A if it's currently playing or already fading out
    if (!audioPlayerA.paused || audioPlayerA.isFadingOut) {
        fadeOutAndStop(audioPlayerA); // Stop A smoothly
    }
    // No button text update needed
});

// Custom Play Button Click Logic (Always Play from Start):
playButtons.forEach(button => {
    button.addEventListener('click', (event) => {
        const targetId = event.target.dataset.target;
        const audioElement = document.getElementById(targetId);

        // Don't do anything if the element doesn't exist or is currently fading out
        if (!audioElement || audioElement.isFadingOut) return;

        // Prepare to play from the beginning
        // Stop it abruptly first if it was already playing (though unlikely with no stop button)
        if (!audioElement.paused) {
             audioElement.pause();
        }
        audioElement.currentTime = 0;  // Reset time
        audioElement.volume = 1.0;    // Ensure full volume
        audioElement.play(); // Triggers the 'play' event listener which handles fading out the *other* player
    });
});

// --- Core Experiment Functions ---

// Fisher-Yates (Knuth) Shuffle Algorithm
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Create the full list of trials
function createTrialList() {
    trialList = [];
    for (let i = 0; i < repetitions; i++) {
        let pairsCopy = JSON.parse(JSON.stringify(audioPairs));
        trialList.push(...pairsCopy);
    }
    shuffleArray(trialList);
    console.log("Shuffled Trial List:", trialList);
}

// Load data for the current trial
function loadTrial(trialIndex) {
    if (trialIndex >= totalTrials) {
        endExperiment();
        return;
    }

    const currentPair = trialList[trialIndex];
    trialCounterElement.textContent = `Trial ${trialIndex + 1} of ${totalTrials}`;

    // Ensure any previous audio/fades are fully stopped before loading new source
    // Call pause directly might be needed if fadeOutAndStop wasn't triggered
     if (!audioPlayerA.paused) audioPlayerA.pause();
     audioPlayerA.currentTime = 0;
     audioPlayerA.volume = 1.0;
     audioPlayerA.isFadingOut = false; // Clear flag if set

     if (!audioPlayerB.paused) audioPlayerB.pause();
     audioPlayerB.currentTime = 0;
     audioPlayerB.volume = 1.0;
     audioPlayerB.isFadingOut = false; // Clear flag if set


    // Counterbalancing Position
    let displayA = currentPair.fileA;
    let displayB = currentPair.fileB;
    let isSwapped = false;
    if (Math.random() < 0.5) {
        [displayA, displayB] = [displayB, displayA];
        isSwapped = true;
    }
    currentPair.isSwapped = is_swapped; // Make sure variable name matches
    currentPair.displayedFileA = displayA;
    currentPair.displayedFileB = displayB;

    // Set audio sources
    audioPlayerA.src = displayA;
    audioPlayerB.src = displayB;
    audioPlayerA.load();
    audioPlayerB.load();

    // Reset UI elements
    if(feedbackElement) feedbackElement.style.visibility = 'hidden';
    choiceButtons.forEach(button => {
        button.disabled = false;
        button.style.backgroundColor = '#e0e0e0';
    });
    playButtons.forEach(button => {
        button.disabled = false; // Ensure play buttons are enabled
    });
}


// Record the choice and move to the next trial
function handleChoice(event) {
    const chosenOption = event.target.getAttribute('data-choice');
    const currentPairData = trialList[currentTrialIndex];

    let originalChoice;
    if (currentPairData.isSwapped) {
        originalChoice = (chosenOption === 'A') ? 'B' : 'A';
    } else {
        originalChoice = chosenOption;
    }

    console.log(`Trial ${currentTrialIndex + 1}: Chose display option ${chosenOption}. Original choice: ${originalChoice}`);

    // Stop audio smoothly when choice is made
    fadeOutAndStop(audioPlayerA);
    fadeOutAndStop(audioPlayerB);


    results.push({
        participantId: participantId,
        trialNumber: currentTrialIndex + 1,
        pairId: currentPairData.pairId,
        originalFileA: currentPairData.fileA,
        originalFileB: currentPairData.fileB,
        displayedFileA: currentPairData.displayedFileA,
        displayedFileB: currentPairData.displayedFileB,
        positionSwapped: currentPairData.isSwapped,
        selectedOptionDisplayed: chosenOption,
        selectedOptionOriginal: originalChoice,
        timestamp: new Date().toISOString()
    });

    // Give feedback & disable choice buttons
    choiceButtons.forEach(button => {
        button.disabled = true;
        if (button.getAttribute('data-choice') === chosenOption) {
            button.style.backgroundColor = '#a0d0a0';
        } else {
            button.style.backgroundColor = '#e0e0e0';
        }
    });
     // Disable play buttons too after choice is made
     playButtons.forEach(button => button.disabled = true);


    // Automatically move to the next trial after a short delay
    setTimeout(() => {
        currentTrialIndex++;
        loadTrial(currentTrialIndex);
    }, 500);
}

// Start the experiment
function startExperiment() {
    instructionsDiv.style.display = 'none';
    experimentDiv.style.display = 'block';
    completionDiv.style.display = 'none';

    createTrialList();
    currentTrialIndex = 0;
    results = [];
    loadTrial(currentTrialIndex);
}

// End the experiment
function endExperiment() {
    experimentDiv.style.display = 'none';
    completionDiv.style.display = 'block';
    console.log("Experiment Finished. Results:", results);

    // Stop any potentially playing audio smoothly
    fadeOutAndStop(audioPlayerA);
    fadeOutAndStop(audioPlayerB);

    // Display results in textarea or prepare for sending
    if(resultsOutput) {
         resultsOutput.value = JSON.stringify(results, null, 2);
    } else {
        console.warn("resultsOutput textarea not found in HTML.");
    }

    // --- TODO: Add Google Form URL generation and redirection here ---
    // generateAndRedirectToGoogleForm(results);
}

// --- Google Form Function Placeholder ---
/*
function generateAndRedirectToGoogleForm(data) {
    const formURL = "YOUR_GOOGLE_FORM_URL_HERE"; // Replace with your form's link
    const entryID = "ENTRY_ID_FOR_RESULTS_FIELD_HERE"; // Replace with the entry.XXXX ID for the paragraph field

    const resultsJsonString = JSON.stringify(data);
    const encodedResults = encodeURIComponent(resultsJsonString); // Important for safe URL transfer

    // Construct the URL (ensure parameter name matches your form's pre-fill link)
    // Find the correct parameter name by manually pre-filling your form once and checking the URL
    const submitURL = `${formURL.replace('/viewform', '')}/formResponse?entry.${entryID}=${encodedResults}`;

    console.log("Redirecting to Google Form:", submitURL); // For debugging
    window.location.href = submitURL; // Perform the redirection
}
*/

// --- Global Event Listeners ---
if (startButton) {
    startButton.addEventListener('click', startExperiment);
} else {
    console.error("Start button not found!");
}

choiceButtons.forEach(button => {
    button.addEventListener('click', handleChoice);
});

// Note: playButtons event listeners are added further up

console.log("Script loaded. Waiting for start button.");onsole.log("Script loaded. Waiting for start button.");
