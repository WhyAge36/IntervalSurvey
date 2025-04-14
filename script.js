// --- Configuration ---
const repetitions = 3;
const baseFreq = 261.63; // C4 Hz

// --- Stimuli Data (Hardcoded) ---
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

// Define the 6 core conditions for pairing
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
let currentSelection = null;

// --- HTML Elements ---
const instructionsDiv = document.getElementById('instructions');
const experimentDiv = document.getElementById('experiment');
const completionDiv = document.getElementById('completion');
const startButton = document.getElementById('startButton');
const trialCounterElement = document.getElementById('trialCounter');
const playButtons = document.querySelectorAll('.playButton');
const playButtonA = document.querySelector('.playButton[data-target="audioA"]');
const playButtonB = document.querySelector('.playButton[data-target="audioB"]');
const resultsOutput = document.getElementById('resultsOutput');
const pickerButtons = document.querySelectorAll('.picker-button');
const submitChoiceButton = document.getElementById('submitChoiceButton');


// --- Tone.js Initialization ---
async function initializeAudio() {
    if (isToneStarted) return;
    try {
        await Tone.start();
        isToneStarted = true;
        const synthOptions={polyphony:2, volume:-9, oscillator:{type:'sine'}, envelope:{attack:0.01, decay:0.1, sustain:0.5, release:0.2}};
        polySynthA = new Tone.PolySynth(Tone.Synth, synthOptions).toDestination();
        polySynthB = new Tone.PolySynth(Tone.Synth, synthOptions).toDestination();
        console.log("Tone.js initialized and Synths created.");
    } catch (error) {
         console.error("Failed to start Tone.js AudioContext:", error);
         alert("Could not initialize audio. Please ensure your browser allows audio playback and try refreshing.");
    }
}

// --- Helper Functions ---
function shuffleArray(array) {
    for (let i=array.length - 1; i > 0; i--) { const j=Math.floor(Math.random() * (i + 1)); [array[i], array[j]]=[array[j], array[i]]; } return array;
}

// --- Core Experiment Functions ---

function createTrialList() {
    let fullTrialPlan = [];
    for (let i = 0; i < repetitions; i++) {
        coreConditions.forEach(condition => {
            fullTrialPlan.push({ conditionId: condition.id });
        });
    }
    trialList = shuffleArray(fullTrialPlan);
    console.log("Shuffled Trial List:", trialList); // Log for checking order
}

async function startExperiment() {
    await initializeAudio();
    if (!isToneStarted) { console.error("Cannot start experiment: AudioContext failed."); return; }

    if (instructionsDiv && experimentDiv && completionDiv) {
        instructionsDiv.style.display = 'none';
        experimentDiv.style.display = 'block';
        completionDiv.style.display = 'none';
        createTrialList();
        currentTrialIndex = 0;
        results = [];
        isSynthAPlaying = false;
        isSynthBPlaying = false;
        loadTrial(currentTrialIndex);
    } else { console.error("One or more main divs not found!"); }
}


function loadTrial(trialIndex) {
    // Stop previous sounds & reset state
    if (isToneStarted && polySynthA) polySynthA.releaseAll(Tone.now());
    if (isToneStarted && polySynthB) polySynthB.releaseAll(Tone.now());
    isSynthAPlaying = false;
    isSynthBPlaying = false;
    currentSelection = null; // Reset selection

    // Reset buttons
    if (playButtonA) { playButtonA.textContent = 'Play A'; playButtonA.disabled = false; }
    if (playButtonB) { playButtonB.textContent = 'Play B'; playButtonB.disabled = false; }
    if (submitChoiceButton) submitChoiceButton.disabled = true; // Disable submit initially
    pickerButtons.forEach(btn => {
        btn.classList.remove('selected');
        btn.disabled = false;
    });

    // Check for end of experiment
    if (trialIndex >= totalTrials) {
        endExperiment();
        return;
    }

    // Get current trial data
    const currentTrial = trialList[trialIndex];
    if (!currentTrial) { console.error("Error: No trial data for index", trialIndex); return; }
    const condition = coreConditions.find(c => c.id === currentTrial.conditionId);
    if (!condition) { console.error(`Condition details not found: ${currentTrial.conditionId}`); currentTrialIndex++; loadTrial(currentTrialIndex); return; }

    // Update counter
    if (trialCounterElement) { trialCounterElement.textContent = `Trial ${trialIndex + 1} of ${totalTrials}`; }
    else { console.error("trialCounterElement not found!"); }

    // Determine Tuning Assignment
    let tuningA, tuningB;
    if (Math.random() < 0.5) { tuningA = 'JI'; tuningB = 'TET'; }
    else { tuningA = 'TET'; tuningB = 'JI'; }

    // Get Stimulus Keys and Configs
    const keyA = `${condition.id}_${tuningA}`;
    const keyB = `${condition.id}_${tuningB}`;
    const configA = stimuliData[keyA];
    const configB = stimuliData[keyB];
    if (!configA || !configB) { console.error(`Stimulus data not found: ${keyA}, ${keyB}`); currentTrialIndex++; loadTrial(currentTrialIndex); return; }

    // Store configs globally
    currentTrialConfigs = { configA, keyA, tuningA, configB, keyB, tuningB };
    console.log("Trial", trialIndex + 1, "Config:", currentTrialConfigs); // Log for checking
}

function handleSubmitChoice() {
    if (currentSelection === null) {
        alert("Please select A, B, or No Difference before submitting.");
        return;
    }

    // Stop Audio
    if (isToneStarted && polySynthA) polySynthA.releaseAll(Tone.now());
    if (isToneStarted && polySynthB) polySynthB.releaseAll(Tone.now());
    isSynthAPlaying = false;
    isSynthBPlaying = false;

    // Record results
    const { keyA, tuningA, keyB, tuningB } = currentTrialConfigs;
    if (!keyA || !keyB) { console.error("Cannot record result: Trial config missing keys."); return; } // Safety check
    const conditionId = keyA.substring(0, keyA.lastIndexOf('_'));
    let chosenKey = null;
    let chosenTuning = null;
    if (currentSelection === 'A') { chosenKey = keyA; chosenTuning = tuningA; }
    else if (currentSelection === 'B') { chosenKey = keyB; chosenTuning = tuningB; }

    results.push({
        participantId, trialNumber: currentTrialIndex + 1, conditionId,
        sideA_stimulus: keyA, sideB_stimulus: keyB, sideA_tuning: tuningA, sideB_tuning: tuningB,
        userChoice: currentSelection, chosenStimulus: chosenKey, chosenTuning: chosenTuning,
        timestamp: new Date().toISOString()
    });

    // Disable all buttons
    if (playButtonA) playButtonA.disabled = true;
    if (playButtonB) playButtonB.disabled = true;
    pickerButtons.forEach(btn => btn.disabled = true);
    if (submitChoiceButton) submitChoiceButton.disabled = true;

    // Load next trial after delay
    const nextTrialDelay = 500; // ms
    setTimeout(() => {
        currentTrialIndex++;
        loadTrial(currentTrialIndex);
    }, nextTrialDelay);
}

async function endExperiment() {
    if (experimentDiv && completionDiv) {
        experimentDiv.style.display = 'none';
        completionDiv.style.display = 'block';
    } else { console.error("Experiment or completion div not found!"); }

    console.log("Experiment Finished. Results:", results);

    // Stop synths
    if (isToneStarted && polySynthA) polySynthA.releaseAll(Tone.now());
    if (isToneStarted && polySynthB) polySynthB.releaseAll(Tone.now());

    // Submit Data
    if (results && results.length > 0) {
        const FORM_ENDPOINT_URL = "https://formspree.io/f/xgvapanr";
        if (resultsOutput) { resultsOutput.value = "Submitting results..."; }
        try {
            const response = await fetch(FORM_ENDPOINT_URL, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ participantId: participantId, experimentData: results })
            });
            if (response.ok) {
                console.log("Results submitted successfully!");
                if (resultsOutput) { resultsOutput.value = "Submission successful. Thank you!\n\n(Backup data below):\n" + JSON.stringify(results, null, 2); }
                const completionMessage=completionDiv.querySelector('p'); if(completionMessage) completionMessage.textContent = "Submission successful. Thank you!";
            } else {
                console.error("Form submission failed:", response.status, response.statusText);
                const errorBody = await response.text(); console.error("Formspree response:", errorBody);
                alert("Error submitting results..."); if(resultsOutput){ resultsOutput.value = "SUBMISSION FAILED. Please copy:\n\n" + JSON.stringify(results, null, 2); }
            }
        } catch (error) {
            console.error("Network error submitting results:", error); alert("Network error submitting results..."); if(resultsOutput){ resultsOutput.value = "SUBMISSION FAILED (Network Error). Please copy:\n\n" + JSON.stringify(results, null, 2); }
        }
    } else {
        console.warn("No results recorded."); if(resultsOutput){ resultsOutput.value="No results recorded."; }
        const completionMessage=completionDiv.querySelector('p'); if(completionMessage) completionMessage.textContent="Experiment complete. No results recorded.";
    }
    // --- TODO: Add Google Form URL generation and redirection here --- (Comment seems irrelevant now)
}

// --- Play Button Click Logic (Using Tone.js PolySynth) ---
playButtons.forEach(button => {
    button.addEventListener('click', (event) => {
        const targetId = event.target.dataset.target;
        const clickedButton = event.target;
        let targetSynth, otherSynth, isTargetPlaying, isOtherPlaying, otherButton, targetConfig;

        if (targetId === 'audioA') {
            targetSynth = polySynthA; otherSynth = polySynthB; isTargetPlaying = isSynthAPlaying; isOtherPlaying = isSynthBPlaying; otherButton = playButtonB; targetConfig = currentTrialConfigs.configA;
        } else {
            targetSynth = polySynthB; otherSynth = polySynthA; isTargetPlaying = isSynthBPlaying; isOtherPlaying = isSynthAPlaying; otherButton = playButtonA; targetConfig = currentTrialConfigs.configB;
        }

        // Safety checks
        if (!targetSynth || !otherSynth) { console.error("Synths not initialized!"); return; }
        if (!isToneStarted) { console.warn("AudioContext not started."); Tone.start().then(() => isToneStarted = true); return; }
        if (!targetConfig) { console.error("Trial config not loaded for " + targetId + "!"); return; }

        if (isTargetPlaying) { // Stop Action
            targetSynth.releaseAll(Tone.now());
            if (targetId === 'audioA') isSynthAPlaying = false; else isSynthBPlaying = false;
            clickedButton.textContent = (targetId === 'audioA') ? 'Play A' : 'Play B';
        } else { // Play Action
            // Stop Other First
            if (isOtherPlaying) {
                const otherId = (targetId === 'audioA') ? 'audioB' : 'audioA';
                otherSynth.releaseAll(Tone.now());
                if (otherId === 'audioA') isSynthAPlaying = false; else isSynthBPlaying = false;
                if (otherButton) otherButton.textContent = (otherId === 'audioA') ? 'Play A' : 'Play B';
            }
            // Configure and Play Target
            targetSynth.set({ oscillator: { type: targetConfig.waveform } });
            targetSynth.triggerAttack(targetConfig.frequencies, Tone.now());
            if (targetId === 'audioA') isSynthAPlaying = true; else isSynthBPlaying = true;
            clickedButton.textContent = (targetId === 'audioA') ? 'Stop A' : 'Stop B';
        }
    });
});
// --- End Play Button Click Logic ---


// --- Global Event Listeners ---
if (startButton) { startButton.addEventListener('click', startExperiment); }
else { console.error("Start button not found!"); }

// Attach listeners to picker buttons
if (pickerButtons && pickerButtons.length > 0) {
    pickerButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const clickedButton = event.target;
            const choice = clickedButton.dataset.choice;
            currentSelection = choice; // Store selection

            // Update visual state
            pickerButtons.forEach(btn => btn.classList.remove('selected'));
            clickedButton.classList.add('selected');

            // Enable Submit button
            if (submitChoiceButton) submitChoiceButton.disabled = false;
        });
    });
} else { console.warn("Picker buttons not found!"); }

// Attach listener to Submit button
if (submitChoiceButton) {
    submitChoiceButton.addEventListener('click', handleSubmitChoice);
} else { console.error("Submit Choice button not found!"); }

console.log("Script loaded. Event listeners should be attached if elements were found.");
