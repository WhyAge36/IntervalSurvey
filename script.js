console.log("Script loading...");

// --- Configuration ---
const repetitions = 3;
const baseFreq = 261.63; // C4 Hz
const stimuliData = {
  M3_Sine_JI: { waveform: "sine", frequencies: [baseFreq, (baseFreq * 5) / 4] },
  M3_Sine_TET: {
    waveform: "sine",
    frequencies: [baseFreq, baseFreq * Math.pow(2, 4 / 12)],
  },
  M3_Tri_JI: {
    waveform: "triangle",
    frequencies: [baseFreq, (baseFreq * 5) / 4],
  },
  M3_Tri_TET: {
    waveform: "triangle",
    frequencies: [baseFreq, baseFreq * Math.pow(2, 4 / 12)],
  },
  M3_Saw_JI: {
    waveform: "sawtooth",
    frequencies: [baseFreq, (baseFreq * 5) / 4],
  },
  M3_Saw_TET: {
    waveform: "sawtooth",
    frequencies: [baseFreq, baseFreq * Math.pow(2, 4 / 12)],
  },
  P5_Sine_JI: { waveform: "sine", frequencies: [baseFreq, (baseFreq * 3) / 2] },
  P5_Sine_TET: {
    waveform: "sine",
    frequencies: [baseFreq, baseFreq * Math.pow(2, 7 / 12)],
  },
  P5_Tri_JI: {
    waveform: "triangle",
    frequencies: [baseFreq, (baseFreq * 3) / 2],
  },
  P5_Tri_TET: {
    waveform: "triangle",
    frequencies: [baseFreq, baseFreq * Math.pow(2, 7 / 12)],
  },
  P5_Saw_JI: {
    waveform: "sawtooth",
    frequencies: [baseFreq, (baseFreq * 3) / 2],
  },
  P5_Saw_TET: {
    waveform: "sawtooth",
    frequencies: [baseFreq, baseFreq * Math.pow(2, 7 / 12)],
  },
};
const coreConditions = [
  { id: "M3_Sine", interval: "M3", waveform: "sine" },
  { id: "M3_Tri", interval: "M3", waveform: "triangle" },
  { id: "M3_Saw", interval: "M3", waveform: "sawtooth" },
  { id: "P5_Sine", interval: "P5", waveform: "sine" },
  { id: "P5_Tri", interval: "P5", waveform: "triangle" },
  { id: "P5_Saw", interval: "P5", waveform: "sawtooth" },
];
const totalConditions = coreConditions.length;
const totalTrials = totalConditions * repetitions;
const baseSynthVolume = -9;
const waveformVolumeAdjustments = {
  sawtooth: -6,
  triangle: -2,
  sine: 0,
};

// --- State Variables ---
let trialList = [];
let currentTrialIndex = 0;
let results = []; // Stores trial results
let collectedExperienceData = null; // Stores experience form data
let participantId = `P_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
let isToneStarted = false;
let polySynthA = null;
let polySynthB = null;
let isSynthAPlaying = false;
let isSynthBPlaying = false;
let currentTrialConfigs = {
  configA: null,
  keyA: null,
  tuningA: null,
  configB: null,
  keyB: null,
  tuningB: null,
};
let currentSelection = null;

// --- HTML Elements ---
const instructionsDiv = document.getElementById("instructions");
const experimentDiv = document.getElementById("experiment");
const completionDiv = document.getElementById("completion");
const startButton = document.getElementById("startButton");
const trialCounterElement = document.getElementById("trialCounter");
const playButtons = document.querySelectorAll(".playButton");
const playButtonA = document.querySelector('.playButton[data-target="audioA"]');
const playButtonB = document.querySelector('.playButton[data-target="audioB"]');
const pickerButtons = document.querySelectorAll(".picker-button");
const submitChoiceButton = document.getElementById("submitChoiceButton");
const headphoneCheckbox = document.getElementById("headphoneConfirmCheckbox");
const experienceFormDiv = document.getElementById("experienceForm");
const musicForm = document.getElementById("musicForm");
const instrumentContainer = document.getElementById("instrumentContainer");
const addInstrumentButton = document.getElementById("addInstrument");
const submitExperienceButton = document.getElementById(
  "submitExperienceButton",
);

// --- Tone.js Initialization ---
async function initializeAudio() {
  if (isToneStarted) return;
  try {
    await Tone.start();
    isToneStarted = true;
    const synthOptions = {
      polyphony: 2,
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.1, sustain: 1, release: 0.05 },
    };
    polySynthA = new Tone.PolySynth(Tone.Synth, synthOptions).toDestination();
    polySynthB = new Tone.PolySynth(Tone.Synth, synthOptions).toDestination();
    console.log("Tone.js initialized and Synths created.");
  } catch (error) {
    console.error("Failed to start Tone.js AudioContext:", error);
    alert(
      "Audio konnte nicht initialisiert werden. Bitte stelle sicher, dass dein Browser Audio erlaubt und versuche, die Seite neu zu laden.",
    );
  }
}

// --- Helper Functions ---
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function hasAdjacentRepeats(list) {
  for (let i = 1; i < list.length; i++) {
    if (list[i].conditionId === list[i - 1].conditionId) {
      return true;
    }
  }
  return false;
}

// --- Experience Form Logic ---
function updateRemoveButtonVisibility() {
  if (!instrumentContainer) return;
  const rows = instrumentContainer.querySelectorAll(".instrument-row");
  const removeButtons = instrumentContainer.querySelectorAll(
    ".instrument-row .removeRow",
  );
  const showButtons = rows.length > 1;
  removeButtons.forEach((button) => {
    if (button && button.style) {
      button.style.display = showButtons ? "flex" : "none";
    }
  });
}

function addInstrumentRow() {
  if (!instrumentContainer) {
    console.error("Instrument container not found!");
    return;
  }
  const templateRow = instrumentContainer.querySelector(".instrument-row");
  if (!templateRow) {
    console.error("Template instrument row not found!");
    return;
  }
  const newRow = templateRow.cloneNode(true);

  const instrumentSelect = newRow.querySelector('select[name="instrument"]');
  const customInput = newRow.querySelector('input[name="customInstrument"]');
  const yearsInput = newRow.querySelector('input[name="years"]');

  if (instrumentSelect) instrumentSelect.selectedIndex = 0;
  if (customInput) {
    customInput.style.display = "none";
    customInput.value = "";
  }
  if (yearsInput) {
    yearsInput.value = "";
    yearsInput.style.display = "none";
    yearsInput.required = false;
  }

  instrumentContainer.appendChild(newRow); // Use correct variable
  updateRemoveButtonVisibility();
}

function handleInstrumentFormChange(event) {
  if (event.target.name === "instrument" && event.target.tagName === "SELECT") {
    const parentRow = event.target.closest(".instrument-row");
    if (parentRow) {
      const customInput = parentRow.querySelector(
        'input[name="customInstrument"]',
      );
      const yearsInput = parentRow.querySelector('input[name="years"]');
      const selectedValue = event.target.value;

      if (customInput) {
        customInput.style.display =
          selectedValue === "Sonstiges" ? "inline-block" : "none";
        if (selectedValue === "Sonstiges") {
          customInput.focus();
        } else {
          customInput.value = "";
        }
      }
      if (yearsInput) {
        const showYears = !(selectedValue === "none" || selectedValue === "");
        yearsInput.style.display = showYears ? "inline-block" : "none";
        if (!showYears) {
          yearsInput.value = "";
        }
        if (yearsInput.hasAttribute("required"))
          yearsInput.required = showYears;
      }
    }
  }
}

function handleInstrumentFormClick(event) {
  const removeButton = event.target.closest(".removeRow");
  if (removeButton && instrumentContainer.contains(removeButton)) {
    const rowToRemove = removeButton.closest(".instrument-row");
    if (instrumentContainer.querySelectorAll(".instrument-row").length > 1) {
      rowToRemove.remove();
      updateRemoveButtonVisibility();
    } else {
      console.log("Cannot remove the last instrument row.");
    }
  }
}

function collectExperienceData() {
  if (!instrumentContainer) return [];
  const rows = instrumentContainer.querySelectorAll(".instrument-row");
  const data = [];
  rows.forEach(function (row) {
    let instrumentSelect = row.querySelector('select[name="instrument"]');
    let instrumentValue = instrumentSelect ? instrumentSelect.value : "";
    if (instrumentValue === "none" || instrumentValue === "") {
      return;
    }
    let instrumentName = instrumentValue;
    const yearsInput = row.querySelector('input[name="years"]');
    const years = yearsInput ? yearsInput.value : "";
    const customInput = row.querySelector('input[name="customInstrument"]');

    if (instrumentValue === "Sonstiges") {
      instrumentName = customInput ? customInput.value.trim() : "";
      if (!instrumentName) {
        console.warn("Skipping row: 'Sonstiges' selected but name empty.");
        return;
      }
    }
    if (instrumentName && years) {
      data.push({ instrument: instrumentName, years: years });
    } else if (instrumentName && !years) {
      console.warn(
        `Skipping row: Instrument '${instrumentName}' missing years.`,
      );
    }
  });
  if (
    rows.length === 1 &&
    instrumentContainer.querySelector('select[name="instrument"]').value ===
      "none"
  ) {
    return [{ instrument: "none", years: 0 }];
  }
  return data;
}

// --- Error Handling Helpers for Submission ---
function handleSubmissionError(response, payload) {
  console.error(
    "Form submission failed:",
    response.status,
    response.statusText,
  );
  response
    .text()
    .then((errorBody) => {
      console.error("Formspree response:", errorBody);
    })
    .catch((e) => console.error("Could not get error response body", e));
  alert(
    "Fehler beim Senden der Ergebnisse. Bitte kopiere die Daten aus dem Textfeld unten und sende sie an den Versuchsleiter.",
  );
  if (completionDiv) completionDiv.style.display = "block";
  const completionMessage = completionDiv.querySelector("p");
  if (completionMessage)
    completionMessage.textContent =
      "Fehler beim Senden. Bitte kopiere die Backup-Daten unten.";
}

function handleNetworkError(error, payload) {
  console.error("Network error submitting results:", error);
  alert(
    "Netzwerkfehler beim Senden der Ergebnisse. Bitte kopiere die Daten aus dem Textfeld unten und sende sie an den Versuchsleiter.",
  );
  if (completionDiv) completionDiv.style.display = "block";
  const completionMessage = completionDiv.querySelector("p");
  if (completionMessage)
    completionMessage.textContent =
      "Netzwerkfehler beim Senden. Bitte kopiere die Backup-Daten unten.";
}

// --- Core Experiment Functions ---

function createTrialList() {
  let fullTrialPlan = [];
  for (let i = 0; i < repetitions; i++) {
    coreConditions.forEach((condition) => {
      fullTrialPlan.push({ conditionId: condition.id });
    });
  }
  let safetyCounter = 0;
  const maxAttempts = 1000;
  do {
    trialList = shuffleArray([...fullTrialPlan]);
    if (!hasAdjacentRepeats(trialList)) {
      break;
    }
    safetyCounter++;
    if (safetyCounter >= maxAttempts) {
      console.warn("Max shuffle attempts reached.");
      break;
    }
  } while (true);
  console.log("Shuffled Trial List:", trialList);
}

async function startExperiment() {
  console.log("Start button clicked!");
  try {
    await initializeAudio(); // Ensure audio is ready
    if (!isToneStarted) {
      console.error("Cannot start experiment: AudioContext failed.");
      return;
    }

    // Show Experience Form First
    if (instructionsDiv && experienceFormDiv) {
      instructionsDiv.style.display = "none";
      if (experimentDiv) experimentDiv.style.display = "none";
      if (completionDiv) completionDiv.style.display = "none";
      experienceFormDiv.style.display = "block"; // Show form
      updateRemoveButtonVisibility(); // Set initial remove button state
    } else {
      console.error("Cannot show experience form - divs not found!");
    }
  } catch (error) {
    console.error("Error during startExperiment:", error);
  }
}

function loadTrial(trialIndex) {
  console.log("--- Loading trial:", trialIndex + 1, "---");
  // Stop previous sounds & reset state
  if (isToneStarted && polySynthA) polySynthA.releaseAll(Tone.now());
  if (isToneStarted && polySynthB) polySynthB.releaseAll(Tone.now());
  isSynthAPlaying = false;
  isSynthBPlaying = false;
  currentSelection = null;

  // Reset buttons
  if (playButtonA) {
    playButtonA.textContent = "A starten";
    playButtonA.disabled = false;
  }
  if (playButtonB) {
    playButtonB.textContent = "B starten";
    playButtonB.disabled = false;
  }
  if (submitChoiceButton) submitChoiceButton.disabled = true;
  pickerButtons.forEach((btn) => {
    btn.classList.remove("selected");
    btn.disabled = false;
  });

  if (trialIndex >= totalTrials) {
    endExperiment();
    return;
  }

  const currentTrial = trialList[trialIndex];
  if (!currentTrial) {
    console.error("Error: No trial data for index", trialIndex);
    return;
  }
  const condition = coreConditions.find(
    (c) => c.id === currentTrial.conditionId,
  );
  if (!condition) {
    console.error(`Condition details not found: ${currentTrial.conditionId}`);
    currentTrialIndex++;
    loadTrial(currentTrialIndex);
    return;
  }

  if (trialCounterElement) {
    trialCounterElement.textContent = `Durchgang ${trialIndex + 1} von ${totalTrials}`;
  } else {
    console.error("trialCounterElement not found!");
  }

  // Assign tuning & get configs
  let tuningA, tuningB;
  if (Math.random() < 0.5) {
    tuningA = "JI";
    tuningB = "TET";
  } else {
    tuningA = "TET";
    tuningB = "JI";
  }
  const keyA = `${condition.id}_${tuningA}`;
  const keyB = `${condition.id}_${tuningB}`;
  const configA = stimuliData[keyA];
  const configB = stimuliData[keyB];
  if (!configA || !configB) {
    console.error(`Stimulus data not found: ${keyA}, ${keyB}`);
    currentTrialIndex++;
    loadTrial(currentTrialIndex);
    return;
  }

  currentTrialConfigs = { configA, keyA, tuningA, configB, keyB, tuningB };
  console.log("Trial", trialIndex + 1, "Config Set");
}

// --- Function triggered by the Submit CHOICE Button (During Trials) ---
function handleSubmitChoice() {
  if (currentSelection === null) {
    alert("Bitte wähle A, B oder 'Kein Unterschied' aus, bevor du bestätigst.");
    return;
  }

  // Stop Audio
  if (isToneStarted && polySynthA) polySynthA.releaseAll(Tone.now());
  if (isToneStarted && polySynthB) polySynthB.releaseAll(Tone.now());
  isSynthAPlaying = false;
  isSynthBPlaying = false;

  // Record results
  const { keyA, tuningA, keyB, tuningB } = currentTrialConfigs;
  if (!keyA || !keyB || !tuningA || !tuningB) {
    console.error("Cannot record result: Trial config missing.");
    return;
  }
  const conditionId = keyA.substring(0, keyA.lastIndexOf("_"));
  let chosenTuning = null;
  if (currentSelection === "A") {
    chosenTuning = tuningA;
  } else if (currentSelection === "B") {
    chosenTuning = tuningB;
  }

  results.push({
    participantId,
    trialNumber: currentTrialIndex + 1,
    conditionId,
    sideA_tuning: tuningA,
    sideB_tuning: tuningB,
    userChoice: currentSelection,
    chosenTuning: chosenTuning,
    timestamp: new Date().toISOString(),
  });

  // Disable buttons
  if (playButtonA) playButtonA.disabled = true;
  if (playButtonB) playButtonB.disabled = true;
  pickerButtons.forEach((btn) => (btn.disabled = true));
  if (submitChoiceButton) submitChoiceButton.disabled = true;

  // Load next trial after delay
  const nextTrialDelay = 500;
  setTimeout(() => {
    currentTrialIndex++;
    loadTrial(currentTrialIndex);
  }, nextTrialDelay);
}

// --- Function triggered by the Submit EXPERIENCE Button ---
async function handleExperienceSubmitAndStartTrials() {
  console.log("--- submitExperienceButton clicked ---");
  const experienceData = collectExperienceData();
  console.log("Collected Experience Data:", experienceData);
  collectedExperienceData = experienceData; // Store globally

  // Hide form, Show experiment
  if (experienceFormDiv) experienceFormDiv.style.display = "none";
  if (experimentDiv) experimentDiv.style.display = "block";
  else {
    console.error("Experiment Div not found! Cannot start trials.");
    return;
  }

  // Initialize and Start the Main Experiment Trials
  console.log("Starting main experiment trials...");
  createTrialList();
  currentTrialIndex = 0;
  results = [];
  isSynthAPlaying = false;
  isSynthBPlaying = false;
  currentSelection = null;
  loadTrial(currentTrialIndex);
}

// --- Function called when trials end (before experience form was shown) ---
async function endExperiment() {
  console.log("Ending experiment, preparing final submission.");

  // Ensure correct divs are shown/hidden
  if (experimentDiv && completionDiv) {
    experimentDiv.style.display = "none";
    completionDiv.style.display = "block";
  } else {
    console.error("Experiment or completion div not found!");
  }

  const completionMessage = completionDiv
    ? completionDiv.querySelector("p")
    : null;
  if (completionMessage)
    completionMessage.textContent = "Sende finale Daten...";
  console.log("Final Trial Results:", results);
  console.log("Final Experience Data:", collectedExperienceData);

  // Stop any lingering synth notes
  if (isToneStarted && polySynthA) polySynthA.releaseAll(Tone.now());
  if (isToneStarted && polySynthB) polySynthB.releaseAll(Tone.now());

  // --- Prepare and Submit Combined Data as ONE JSON String ---
  if ((results && results.length > 0) || collectedExperienceData !== null) {
    // 1. Create an object containing ALL data you want inside the final string
    const allExperimentData = {
      participantId: participantId,
      trialData: results,
      experienceData: collectedExperienceData,
    };

    // 2. Convert this entire object into a single JSON string
    //    Using 'null, 2' makes the string indented/readable if viewed later. Remove if not needed.
    const allDataJsonString = JSON.stringify(allExperimentData, null, 2);

    // 3. Prepare the final payload for Formspree - sending the string under a single key
    //    Formspree generally works best with key-value pairs. Let's use 'jsonData'.
    //    You can rename 'jsonData' if you prefer.
    const finalPayloadForFormspree = {
      jsonData: allDataJsonString,
      // Optional: You might still send participantId separately if Formspree uses it for filtering/subjects
      // participantId: participantId
    };

    const FORM_ENDPOINT_URL = "https://formspree.io/f/xgvapanr";
    console.log(
      "Attempting to submit final combined results to Formspree as a single JSON string...",
    );

    try {
      const response = await fetch(FORM_ENDPOINT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json", // We are sending a JSON object (containing a string)
          Accept: "application/json",
        },
        // Stringify the payload object for the request body
        body: JSON.stringify(finalPayloadForFormspree),
      });

      if (response.ok) {
        console.log("Final results submitted successfully!");
        if (completionMessage)
          completionMessage.textContent =
            "Übermittlung erfolgreich. Vielen Dank für deine Teilnahme!";
      } else {
        // Pass the object used to generate the string to the error handler for backup display
        handleSubmissionError(response, allExperimentData); // Pass original object for backup
      }
    } catch (error) {
      // Pass the object used to generate the string to the error handler for backup display
      handleNetworkError(error, allExperimentData); // Pass original object for backup
    }
  } else {
    console.warn("No results or experience data recorded to send.");
    if (completionMessage)
      completionMessage.textContent =
        "Experiment abgeschlossen. Keine Ergebnisse aufgenommen.";
  }
  // --- End data submission ---
}
playButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    const targetId = event.target.dataset.target;
    const clickedButton = event.target;
    let targetSynth,
      otherSynth,
      isTargetPlaying,
      isOtherPlaying,
      otherButton,
      targetConfig;
    if (targetId === "audioA") {
      targetSynth = polySynthA;
      otherSynth = polySynthB;
      isTargetPlaying = isSynthAPlaying;
      isOtherPlaying = isSynthBPlaying;
      otherButton = playButtonB;
      targetConfig = currentTrialConfigs.configA;
    } else {
      targetSynth = polySynthB;
      otherSynth = polySynthA;
      isTargetPlaying = isSynthBPlaying;
      isOtherPlaying = isSynthAPlaying;
      otherButton = playButtonA;
      targetConfig = currentTrialConfigs.configB;
    }
    if (!targetSynth || !otherSynth) {
      console.error("Synths not initialized!");
      return;
    }
    if (!isToneStarted) {
      console.warn("AudioContext not started.");
      Tone.start().then(() => (isToneStarted = true));
      return;
    }
    if (!targetConfig) {
      console.error("Trial config not loaded for " + targetId + "!");
      return;
    }

    if (isTargetPlaying) {
      // Stop Action
      targetSynth.releaseAll(Tone.now());
      if (targetId === "audioA") {
        isSynthAPlaying = false;
        clickedButton.textContent = "A starten";
      } else {
        isSynthBPlaying = false;
        clickedButton.textContent = "B starten";
      }
    } else {
      // Play Action
      if (isOtherPlaying) {
        // Stop Other First
        const otherId = targetId === "audioA" ? "audioB" : "audioA";
        otherSynth.releaseAll(Tone.now());
        if (otherId === "audioA") {
          isSynthAPlaying = false;
          if (otherButton) otherButton.textContent = "A starten";
        } else {
          isSynthBPlaying = false;
          if (otherButton) otherButton.textContent = "B starten";
        }
      }
      // Configure and Play Target
      const waveformType = targetConfig.waveform;
      const volumeAdjustment = waveformVolumeAdjustments[waveformType] || 0; // Get adjustment or default to 0
      const finalVolumeDb = baseSynthVolume + volumeAdjustment;
      console.log(
        `Setting volume for <span class="math-inline">\{targetId\} \(</span>{waveformType}) to ${finalVolumeDb} dB`,
      );
      targetSynth.set({ volume: finalVolumeDb });
      targetSynth.set({ oscillator: { type: waveformType } });
      targetSynth.triggerAttack(targetConfig.frequencies, Tone.now());
      if (targetId === "audioA") {
        isSynthAPlaying = true;
        clickedButton.textContent = "A stoppen";
      } else {
        isSynthBPlaying = true;
        clickedButton.textContent = "B stoppen";
      }
    }
  });
});

// --- Global Event Listeners ---
if (startButton) {
  startButton.addEventListener("click", startExperiment);
} else {
  console.error("Start button not found!");
}

// Attach listeners to picker buttons
if (pickerButtons && pickerButtons.length > 0) {
  pickerButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      const clickedButton = event.target;
      const choice = clickedButton.dataset.choice;
      currentSelection = choice;
      pickerButtons.forEach((btn) => btn.classList.remove("selected"));
      clickedButton.classList.add("selected");
      if (submitChoiceButton) submitChoiceButton.disabled = false;
    });
  });
} else {
  console.warn("Picker buttons not found!");
}

// Attach listener to Submit CHOICE button
if (submitChoiceButton) {
  submitChoiceButton.addEventListener("click", handleSubmitChoice);
} else {
  console.error("Submit Choice button not found!");
}

// Listener for Headphone Checkbox
if (headphoneCheckbox && startButton) {
  startButton.disabled = true;
  headphoneCheckbox.addEventListener("change", () => {
    startButton.disabled = !headphoneCheckbox.checked;
  });
} else {
  if (!headphoneCheckbox) console.warn("Headphone checkbox not found!");
}

// Listeners for Experience Form
if (addInstrumentButton) {
  addInstrumentButton.addEventListener("click", addInstrumentRow);
} else {
  console.warn("Add Instrument button not found!");
}
if (instrumentContainer) {
  instrumentContainer.addEventListener("change", handleInstrumentFormChange);
  instrumentContainer.addEventListener("click", handleInstrumentFormClick);
} else {
  console.warn("Instrument container not found!");
}
if (submitExperienceButton) {
  submitExperienceButton.addEventListener(
    "click",
    handleExperienceSubmitAndStartTrials,
  );
} // Correct function call
else {
  console.error("Submit Experience button not found!");
}

console.log(
  "Script loaded. Event listeners should be attached if elements were found.",
);
