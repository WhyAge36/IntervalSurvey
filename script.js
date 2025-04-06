console.log("Script loading...");

// --- Configuration ---
const repetitions = 3;
const baseFreq = 261.63; // C4 Hz
const stimuliData = { /* ... same as before ... */
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
const coreConditions = [ /* ... same as before ... */
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
let currentTrialConfigs = { /* ... initial structure ... */
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
async function initializeAudio() { /* ... same as before ... */
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
function shuffleArray(array) { /* ... same as before ... */
    for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; } return array;
}

// --- Core Experiment Functions ---


// Function to check if a list has adjacent conditionId repeats
function hasAdjacentRepeats(list) {
    for (let i = 1; i < list.length; i++) {
        // Check if current conditionId is the same as the previous one
        if (list[i].conditionId === list[i - 1].conditionId) {
            return true; // Found a repeat!
        }
    }
    return false; // No adjacent repeats found
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
        // Shuffle a *copy* of the plan each time using spread (...) operator
        trialList = shuffleArray([...fullTrialPlan]);

        // Check if the newly shuffled list is valid (no adjacent repeats)
        // The '!' negates the result: loop continues WHILE repeats ARE found.
        if (!hasAdjacentRepeats(trialList)) {
            console.log(`Found a valid shuffle after ${safetyCounter + 1} attempts.`);
            break; // Exit the loop, we have a valid list
        }

        safetyCounter++;
        if (safetyCounter >= maxAttempts) {
            console.warn("Could not generate a valid trial list without repeats after", maxAttempts, "attempts. Using last shuffle.");
            // Fallback: use the last shuffled list even if it has repeats.
            // This shouldn't happen with your parameters but is good practice.
            break;
        }

    } while (true); // Loop indefinitely until 'break'

    console.log("Final Shuffled Trial List (No adjacent repeats):", trialList);
}


async function startExperiment() { /* ... same as before ... */
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
    // Stop any previous sounds using the CORRECT method
    if (isToneStarted && polySynthA) polySynthA.releaseAll(Tone.now()); // *** FIXED ***
    if (isToneStarted && polySynthB) polySynthB.releaseAll(Tone.now()); // *** FIXED ***
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

    // Stop currently playing synth notes smoothly using CORRECT method
    console.log("Stopping synths after choice.");
    if (isToneStarted && polySynthA) polySynthA.releaseAll(Tone.now()); // *** FIXED ***
    if (isToneStarted && polySynthB) polySynthB.releaseAll(Tone.now()); // *** FIXED ***
    isSynthAPlaying = false; isSynthBPlaying = false;

    // Record results
    results.push({ /* ... results object ... */
        participantId: participantId, trialNumber: currentTrialIndex + 1, conditionId: conditionId,
        sideA_stimulus: keyA, sideB_stimulus: keyB, sideA_tuning: tuningA, sideB_tuning: tuningB,
        userChoice: chosenOption, chosenStimulus: chosenKey, chosenTuning: chosenTuning,
        timestamp: new Date().toISOString()
    });
    console.log("Results so far:", results.length);

    // Update UI Immediately (Disable buttons)
    choiceButtons.forEach(button => { /* ... disable/style choice buttons ... */
        button.disabled = true; if (button.getAttribute('data-choice') === chosenOption) { button.style.backgroundColor = '#a0d0a0'; } else { button.style.backgroundColor = '#e0e0e0'; }
    });
    if (playButtonA) playButtonA.disabled = true; if (playButtonB) playButtonB.disabled = true;

    // Load next trial after a fixed delay
    const nextTrialDelay = 500; // ms
    console.log(`Waiting ${nextTrialDelay}ms to load next trial.`);
    setTimeout(() => { currentTrialIndex++; loadTrial(currentTrialIndex); }, nextTrialDelay);
    console.log("--- handleChoice finished ---");
}

function endExperiment() { /* ... same as before, use releaseAll ... */
    console.log("Ending experiment."); if (experimentDiv && completionDiv) { experimentDiv.style.display = 'none'; completionDiv.style.display = 'block'; } else { console.error("Experiment or completion div not found!"); }
    console.log("Experiment Finished. Results:", results);
    // Stop any existing synth notes using CORRECT method
    if (isToneStarted && polySynthA) polySynthA.releaseAll(Tone.now()); // *** FIXED ***
    if (isToneStarted && polySynthB) polySynthB.releaseAll(Tone.now()); // *** FIXED ***
    if(resultsOutput) { resultsOutput.value = JSON.stringify(results, null, 2); } else { console.warn("resultsOutput textarea not found."); }
}


// --- Play Button Click Logic (Using Tone.js PolySynth) ---
playButtons.forEach(button => {
    button.addEventListener('click', (event) => {
        console.log("--- Play button clicked ---");
        console.log(">>> Play Button Click: currentTrialConfigs at start:", JSON.parse(JSON.stringify(currentTrialConfigs)));

        const targetId = event.target.dataset.target;
        const clickedButton = event.target;
        let targetSynth, otherSynth, isTargetPlaying, isOtherPlaying, otherButton, targetConfig;

        if (targetId === 'audioA') { /* ... assign A vars ... */
            targetSynth = polySynthA; otherSynth = polySynthB; isTargetPlaying = isSynthAPlaying; isOtherPlaying = isSynthBPlaying; otherButton = playButtonB; targetConfig = currentTrialConfigs.configA;
        } else { /* ... assign B vars ... */
            targetSynth = polySynthB; otherSynth = polySynthA; isTargetPlaying = isSynthBPlaying; isOtherPlaying = isSynthAPlaying; otherButton = playButtonA; targetConfig = currentTrialConfigs.configB;
        }

        if (!targetSynth || !otherSynth) { console.error("Synths not initialized!"); return; }
        if (!isToneStarted) { console.warn("AudioContext not started."); Tone.start().then(() => isToneStarted = true); return; }
        if (!targetConfig) { console.error("Trial config not loaded for " + targetId + "! Value:", targetConfig, "Full config:", currentTrialConfigs); return; }


        if (isTargetPlaying) {
            // === ACTION: STOP ===
            console.log("Stopping " + targetId);
            // Use CORRECT method for stopping PolySynth voices
            targetSynth.releaseAll(Tone.now()); // *** FIXED ***

            if (targetId === 'audioA') isSynthAPlaying = false; else isSynthBPlaying = false;
            clickedButton.textContent = (targetId === 'audioA') ? 'Play A' : 'Play B';

        } else {
            // === ACTION: PLAY ===
            console.log("Attempting to play " + targetId);

            // Stop the OTHER sound first if it's playing
            if (isOtherPlaying) {
                const otherId = (targetId === 'audioA') ? 'audioB' : 'audioA';
                console.log("Stopping other sound first: " + otherId);
                // Use CORRECT method for stopping PolySynth voices
                otherSynth.releaseAll(Tone.now()); // *** FIXED ***

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
if (startButton) { /* ... listener ... */ startButton.addEventListener('click', startExperiment); }
else { console.error("Start button not found!"); }

if (choiceButtons && choiceButtons.length > 0) { /* ... listeners ... */ choiceButtons.forEach(button => { button.addEventListener('click', handleChoice); }); }
else { console.warn("Choice buttons not found!"); }

if (playButtons && playButtons.length > 0) { console.log("Play button listeners attached."); }
else { console.warn("Play buttons not found!"); }

console.log("Script loaded. Waiting for Start button.");
