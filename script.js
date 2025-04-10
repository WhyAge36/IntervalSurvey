console.log("Script loading...");

// --- Configuration ---
const repetitions = 3;
const baseFreq = 261.63; // C4 Hz
const stimuliData = { 
    'M3_Sine_JI':  { waveform: 'sine',     frequencies: [baseFreq, baseFreq * 5/4] },
    'M3_Sine_TET': { waveform: 'sine',     frequencies: [baseFreq, baseFreq * Math.pow(2, 4/12)] },
    'M3_Tri_JI':   { waveform: 'triangle', frequencies: [baseFreq, baseFreq * 5/4] },
    'M3_Tri_TET':  { waveform: 'triangle', frequencies: [baseFreq, baseFreq * Math.pow(2, 4/12)] },
    'M3_Saw_JI':   { waveform: 'sawtooth', frequencies: [baseFreq, baseFreq * 5/4] },
    'M3_Saw_TET':  { waveform: 'sawtooth', frequencies: [baseFreq, baseFreq * Math.pow(2, 4/12)] },
    'P5_Sine_JI':  { waveform: 'sine',     frequencies: [baseFreq, baseFreq * 3/2] },
    'P5_Sine_TET': { waveform: 'sine',     frequencies: [baseFreq, baseFreq * Math.pow(2, 7/12)] },
    'P5_Tri_JI':   { waveform: 'triangle', frequencies: [baseFreq, baseFreq * 3/2] },
    'P5_Tri_TET':  { waveform: 'triangle', frequencies: [baseFreq, baseFreq * Math.pow(2, 7/12)] },
    'P5_Saw_JI':   { waveform: 'sawtooth', frequencies: [baseFreq, baseFreq * 3/2] },
    'P5_Saw_TET':  { waveform: 'sawtooth', frequencies: [baseFreq, baseFreq * Math.pow(2, 7/12)] },
};
const coreConditions = [
    { id: 'M3_Sine', interval: 'M3', waveform: 'sine' }, { id: 'M3_Tri', interval: 'M3', waveform: 'triangle' },
    { id: 'M3_Saw', interval: 'M3', waveform: 'sawtooth' }, { id: 'P5_Sine', interval: 'P5', waveform: 'sine' },
    { id: 'P5_Tri', interval: 'P5', waveform: 'triangle' }, { id: 'P5_Saw', interval: 'P5', waveform: 'sawtooth' },
];
const totalConditions = coreConditions.length;
const totalTrials = totalConditions * repetitions;

// --- State Variables ---
let trialList = [];
let currentTrialIndex = 0;
let results = [];
let participantId = `P_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
let isToneStarted = false;
let polySynthA = null;
let polySynthB = null;
let isSynthAPlaying = false;
let isSynthBPlaying = false;
let currentTrialConfigs = { 
    configA: null, keyA: null, tuningA: null, configB: null, keyB: null, tuningB: null
};

// --- HTML Elements ---
const instructionsDiv = document.getElementById('instructions');
const experimentDiv = document.getElementById('experiment');
const completionDiv = document.getElementById('completion');
const startButton = document.getElementById('startButton');
const trialCounterElement = document.getElementById('trialCounter');
const playButtons = document.querySelectorAll('.playButton');
const playButtonA = document.querySelector('.playButton[data-target="audioA"]');
const playButtonB = document.querySelector('.playButton[data-target="audioB"]');
const choiceButtons = document.querySelectorAll('.choiceButton');
const resultsOutput = document.getElementById('resultsOutput');

// --- Tone.js Initialization ---
async function initializeAudio() {
    if (isToneStarted) return;
    try {
        await Tone.start();
        console.log("Tone.js AudioContext started successfully.");
        isToneStarted = true;
        const synthOptions = { polyphony: 2, volume: -9, oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.2 }};
        polySynthA = new Tone.PolySynth(Tone.Synth, synthOptions).toDestination();
        polySynthB = new Tone.PolySynth(Tone.Synth, synthOptions).toDestination();
        console.log("Tone.js PolySynths created.");
    } catch (error) {
         console.error("Failed to start Tone.js AudioContext:", error);
         alert("Could not initialize audio. Please ensure your browser allows audio playback and try refreshing.");
    }
}

// --- Helper Functions ---
function shuffleArray(array) { 
    for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; } return array;
}

// --- Core Experiment Functions ---


// Function to check if a list has adjacent conditionId repeats
function hasAdjacentRepeats(list) {
    for (let i = 1; i < list.length; i++) {
        // Check if current conditionId is the same as the previous one
        if (list[i].conditionId === list[i - 1].conditionId) {
            return true; 
        }
    }
    return false; 
}

function createTrialList() {
    console.log("Creating trial list...");
    let fullTrialPlan = [];
    for (let i = 0; i < repetitions; i++) {
        coreConditions.forEach(condition => {
            fullTrialPlan.push({ conditionId: condition.id });
        });
    }
    console.log("Initial (unshuffled) plan:", fullTrialPlan);

    let safetyCounter = 0; // Prevent potential infinite loops
    const maxAttempts = 1000;

    do {
        trialList = shuffleArray([...fullTrialPlan]);

        // Check if the newly shuffled list is valid (no adjacent repeats)
        if (!hasAdjacentRepeats(trialList)) {
            console.log(`Found a valid shuffle after ${safetyCounter + 1} attempts.`);
            break; // Exit the loop, we have a valid list
        }

        safetyCounter++;
        if (safetyCounter >= maxAttempts) {
            console.warn("Could not generate a valid trial list without repeats after", maxAttempts, "attempts. Using last shuffle.");
            // Fallback: use the last shuffled list even if it has repeats.
            break;
        }

    } while (true); 

    console.log("Final Shuffled Trial List (No adjacent repeats):", trialList);
}


async function startExperiment() { 
    console.log("Start button clicked!");
    await initializeAudio();
    if (!isToneStarted) { console.error("Cannot start experiment: AudioContext failed."); return; }
    if (instructionsDiv && experimentDiv && completionDiv) {
        console.log("Switching divs, creating trial list...");
        instructionsDiv.style.display = 'none'; experimentDiv.style.display = 'block'; completionDiv.style.display = 'none';
        createTrialList(); currentTrialIndex = 0; results = []; isSynthAPlaying = false; isSynthBPlaying = false;
        console.log("Calling loadTrial for the first time.");
        loadTrial(currentTrialIndex);
    } else { console.error("One or more main divs not found!"); }
}


function loadTrial(trialIndex) {
    console.log("--- Loading trial:", trialIndex + 1, "---");
    if (isToneStarted && polySynthA) polySynthA.releaseAll(Tone.now());
    if (isToneStarted && polySynthB) polySynthB.releaseAll(Tone.now());
    isSynthAPlaying = false;
    isSynthBPlaying = false;
    // Reset button states
    if (playButtonA) { playButtonA.textContent = 'Play A'; playButtonA.disabled = false; }
    if (playButtonB) { playButtonB.textContent = 'Play B'; playButtonB.disabled = false; }

    if (trialIndex >= totalTrials) { endExperiment(); return; }

    const currentTrial = trialList[trialIndex];
    if (!currentTrial) { console.error("Error: No trial data found for index", trialIndex); return; }
    const condition = coreConditions.find(c => c.id === currentTrial.conditionId);

    if (!condition) { console.error(`Condition details not found for ID: ${currentTrial.conditionId}`); currentTrialIndex++; loadTrial(currentTrialIndex); return; }
    if (trialCounterElement) { trialCounterElement.textContent = `Trial ${trialIndex + 1} of ${totalTrials}`; } else { console.error("trialCounterElement not found!"); }

    // Determine Tuning Assignment
    let tuningA, tuningB;
    if (Math.random() < 0.5) { tuningA = 'JI'; tuningB = 'TET'; } else { tuningA = 'TET'; tuningB = 'JI'; }

    // Get Stimulus Keys and Configs
    const keyA = `${condition.id}_${tuningA}`; const keyB = `${condition.id}_${tuningB}`;
    const configA = stimuliData[keyA]; const configB = stimuliData[keyB];

    if (!configA || !configB) { console.error(`Stimulus data not found for keys: ${keyA}, ${keyB}`); currentTrialIndex++; loadTrial(currentTrialIndex); return; }

    // Store configs globally
    currentTrialConfigs = { configA, keyA, tuningA, configB, keyB, tuningB };
    console.log(">>> loadTrial: Set currentTrialConfigs to:", JSON.parse(JSON.stringify(currentTrialConfigs)));

    // Reset Choice Buttons
    choiceButtons.forEach(button => { button.disabled = false; button.style.backgroundColor = '#e0e0e0'; });
    console.log("--- Finished loading trial:", trialIndex + 1, "---");
}

function handleChoice(event) {
    console.log("--- handleChoice started for trial:", currentTrialIndex + 1, "---");
    console.log(">>> handleChoice: currentTrialConfigs at start:", JSON.parse(JSON.stringify(currentTrialConfigs)));

    if (!currentTrialConfigs || !currentTrialConfigs.keyA || !currentTrialConfigs.keyB) { console.error("CRITICAL: currentTrialConfigs is invalid in handleChoice!", currentTrialConfigs); return; }

    const chosenOption = event.target.getAttribute('data-choice');
    const { configA, keyA, tuningA, configB, keyB, tuningB } = currentTrialConfigs;

    let chosenKey, chosenTuning;
    if (chosenOption === 'A') { chosenKey = keyA; chosenTuning = tuningA; } else { chosenKey = keyB; chosenTuning = tuningB; }
    const conditionId = keyA.substring(0, keyA.lastIndexOf('_'));

    console.log(`User chose side ${chosenOption} which played ${chosenKey}`);

    // Stop currently playing synth notes smoothly 
    console.log("Stopping synths after choice.");
    if (isToneStarted && polySynthA) polySynthA.releaseAll(Tone.now());
    if (isToneStarted && polySynthB) polySynthB.releaseAll(Tone.now());
    isSynthAPlaying = false; isSynthBPlaying = false;

    // Record results
    results.push({
        participantId: participantId, trialNumber: currentTrialIndex + 1, conditionId: conditionId,
        sideA_stimulus: keyA, sideB_stimulus: keyB, sideA_tuning: tuningA, sideB_tuning: tuningB,
        userChoice: chosenOption, chosenStimulus: chosenKey, chosenTuning: chosenTuning,
        timestamp: new Date().toISOString()
    });
    console.log("Results so far:", results.length);

    // Update UI Immediately (Disable buttons)
    choiceButtons.forEach(button => {
        button.disabled = true; if (button.getAttribute('data-choice') === chosenOption) { button.style.backgroundColor = '#a0d0a0'; } else { button.style.backgroundColor = '#e0e0e0'; }
    });
    if (playButtonA) playButtonA.disabled = true; if (playButtonB) playButtonB.disabled = true;


    const nextTrialDelay = 500; // ms
    console.log(`Waiting ${nextTrialDelay}ms to load next trial.`);
    setTimeout(() => { currentTrialIndex++; loadTrial(currentTrialIndex); }, nextTrialDelay);
    console.log("--- handleChoice finished ---");
}

// --- Updated endExperiment Function (Using Fetch for Formspree) ---

async function endExperiment() {
    console.log("Ending experiment.");

    // Ensure experiment div is hidden and completion div is shown
    if (experimentDiv && completionDiv) {
        experimentDiv.style.display = 'none';
        completionDiv.style.display = 'block'; 
    } else {
        console.error("Experiment or completion div not found!");
    }

    console.log("Experiment Finished. Final Results:", results);

    // Stop any existing synth notes smoothly
    if (isToneStarted && polySynthA) polySynthA.releaseAll(Tone.now());
    if (isToneStarted && polySynthB) polySynthB.releaseAll(Tone.now());

    // --- Submit Data using Fetch to Formspree ---
    if (results && results.length > 0) {
        // Your specific Formspree endpoint URL
        const FORM_ENDPOINT_URL = "https://formspree.io/f/xgvapanr";

        console.log("Attempting to submit results to Formspree endpoint...");

        // Update the results textarea to show submission status
        if (resultsOutput) {
            resultsOutput.value = "Submitting results, please wait...";
            resultsOutput.readOnly = true; // Keep it readonly
        }

        try {
            // 'fetch' sends the data. 'await' waits for the server's initial response.
            const response = await fetch(FORM_ENDPOINT_URL, {
                method: 'POST', // Use POST to send data
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                // The data payload: Convert JS object to a JSON string
                body: JSON.stringify({
                    participantId: participantId, 
                    experimentData: results
                })
            });

            // Check if the submission was successful (HTTP status 2xx)
            if (response.ok) {
                console.log("Results submitted successfully to Formspree!");
                // Update UI to confirm success
                if (resultsOutput) {
                    // Optionally show submitted data as backup / confirmation
                    resultsOutput.value = "Submission successful. Thank you!\n\n(Backup data below):\n" + JSON.stringify(results, null, 2);
                }
                // update a <p> tag in your completionDiv
                const completionMessage = completionDiv.querySelector('p'); // Find first <p>
                if (completionMessage) completionMessage.textContent = "Submission successful. Thank you for your participation!";


            } else {
                // The server responded, but with an error status (e.g., 4xx, 5xx)
                console.error("Formspree submission failed:", response.status, response.statusText);
                const errorBody = await response.text(); // Get details if available
                console.error("Formspree response:", errorBody);
                alert("An error occurred while submitting your results. Please copy the data shown below and send it to the experimenter.");
                // Show results in textarea as fallback
                if (resultsOutput) { resultsOutput.value = "SUBMISSION FAILED. Please copy:\n\n" + JSON.stringify(results, null, 2); }
            }
        } catch (error) {
            // A network error occurred (e.g., user offline, DNS issue, CORS if misconfigured)
            console.error("Network error during results submission:", error);
            alert("A network error occurred while submitting your results. Please copy the data shown below and send it to the experimenter.");
            // Show results in textarea as fallback
            if (resultsOutput) { resultsOutput.value = "SUBMISSION FAILED (Network Error). Please copy:\n\n" + JSON.stringify(results, null, 2); }
        }

    } else {
        // No results were recorded - show appropriate message
        console.warn("No results recorded to send.");
        if (resultsOutput) { resultsOutput.value = "No results were recorded during this session."; }
         const completionMessage = completionDiv.querySelector('p');
         if (completionMessage) completionMessage.textContent = "Experiment complete. No results were recorded.";
    }
    // --- End data submission ---
}
// --- Play Button Click Logic (Using Tone.js PolySynth) ---
playButtons.forEach(button => {
    button.addEventListener('click', (event) => {
        console.log("--- Play button clicked ---");
        console.log(">>> Play Button Click: currentTrialConfigs at start:", JSON.parse(JSON.stringify(currentTrialConfigs)));

        const targetId = event.target.dataset.target;
        const clickedButton = event.target;
        let targetSynth, otherSynth, isTargetPlaying, isOtherPlaying, otherButton, targetConfig;

        if (targetId === 'audioA') {
            targetSynth = polySynthA; otherSynth = polySynthB; isTargetPlaying = isSynthAPlaying; isOtherPlaying = isSynthBPlaying; otherButton = playButtonB; targetConfig = currentTrialConfigs.configA;
        } else {
            targetSynth = polySynthB; otherSynth = polySynthA; isTargetPlaying = isSynthBPlaying; isOtherPlaying = isSynthAPlaying; otherButton = playButtonA; targetConfig = currentTrialConfigs.configB;
        }

        if (!targetSynth || !otherSynth) { console.error("Synths not initialized!"); return; }
        if (!isToneStarted) { console.warn("AudioContext not started."); Tone.start().then(() => isToneStarted = true); return; }
        if (!targetConfig) { console.error("Trial config not loaded for " + targetId + "! Value:", targetConfig, "Full config:", currentTrialConfigs); return; }


        if (isTargetPlaying) {
            // === ACTION: STOP ===
            console.log("Stopping " + targetId);
            targetSynth.releaseAll(Tone.now());

            if (targetId === 'audioA') isSynthAPlaying = false; else isSynthBPlaying = false;
            clickedButton.textContent = (targetId === 'audioA') ? 'Play A' : 'Play B';

        } else {
            // === ACTION: PLAY ===
            console.log("Attempting to play " + targetId);

            // Stop the OTHER sound first if it's playing
            if (isOtherPlaying) {
                const otherId = (targetId === 'audioA') ? 'audioB' : 'audioA';
                console.log("Stopping other sound first: " + otherId);
                otherSynth.releaseAll(Tone.now());

                if (otherId === 'audioA') isSynthAPlaying = false; else isSynthBPlaying = false;
                if (otherButton) otherButton.textContent = (otherId === 'audioA') ? 'Play A' : 'Play B';
            }

            // Configure and Play the TARGET sound
            console.log(`Playing ${targetId} (${targetConfig.waveform}, freqs: ${targetConfig.frequencies})`);
            targetSynth.set({ oscillator: { type: targetConfig.waveform } });
            targetSynth.triggerAttack(targetConfig.frequencies, Tone.now());

            if (targetId === 'audioA') isSynthAPlaying = true; else isSynthBPlaying = true;
            clickedButton.textContent = (targetId === 'audioA') ? 'Stop A' : 'Stop B';
        }
         console.log("--- Play button click finished ---");
    });
});
// --- End Play Button Click Logic ---


// --- Global Event Listeners ---
if (startButton) { startButton.addEventListener('click', startExperiment); }
else { console.error("Start button not found!"); }

if (choiceButtons && choiceButtons.length > 0) { choiceButtons.forEach(button => { button.addEventListener('click', handleChoice); }); }
else { console.warn("Choice buttons not found!"); }

if (playButtons && playButtons.length > 0) { console.log("Play button listeners attached."); }
else { console.warn("Play buttons not found!"); }

console.log("Script loaded. Waiting for Start button.");
