const scaleFlavors = {
  ionian: 'Stable major color for melodic clarity and strong tonic pull.',
  lydian: 'Modern major brightness with a floating #4 color.',
  mixolydian: 'Dominant-friendly major sound, perfect for V chords.',
  dorian: 'Minor with a hopeful 6th, great for ii and modal jams.',
  aeolian: 'Natural minor gravity and emotional depth.',
  phrygian: 'Dark and tense minor color with b2 bite.',
  locrian: 'Half-diminished tension and unstable color.',
  'locrian #2': 'Half-diminished color with a smoother 2nd.',
  'major pentatonic': 'Open and consonant major sound for hooks and phrases.',
  'minor pentatonic': 'Core guitar vocabulary for expressive minor lines.',
  blues: 'Minor pentatonic + blue note for grit and tension-release.',
  'major blues': 'Major color with blues spice and expressive passing tones.',
  'minor blues': 'Minor blues language for bends, grit and release.',
  'harmonic minor': 'Dramatic minor color with strong leading tone.',
  'melodic minor': 'Jazz-forward minor language with smooth upper structure.',
  'lydian dominant': 'Dominant sonority with #11 brightness.',
  altered: 'Maximum altered dominant tension before resolution.',
  'phrygian dominant': 'Flamenco-friendly dominant color from harmonic minor.',
  flamenco: 'Spanish/flamenco color (same family as phrygian dominant).',
  'double harmonic major': 'Strong Andalusian/Arabic-flavored major color.',
  'spanish heptatonic': 'Traditional Spanish color often used in flamenco contexts.',
  'whole tone': 'Symmetrical dominant color with dreamy ambiguity.',
  'whole-half diminished': 'Symmetrical diminished palette for dominant movement.',
  'half-whole diminished': 'Classic 8-note dominant diminished sound.',
  'dorian b2': 'Dark dorian variant with b2 tension.',
  'major bebop': 'Major scale plus passing tone for linear bebop phrasing.',
  'dominant bebop': 'Mixolydian plus passing tone for dominant lines.'
};

const commonScalePriority = [
  'ionian',
  'lydian',
  'mixolydian',
  'major pentatonic',
  'major blues',
  'major bebop',
  'dorian',
  'aeolian',
  'minor pentatonic',
  'minor blues',
  'blues',
  'melodic minor',
  'harmonic minor',
  'phrygian',
  'locrian',
  'locrian #2',
  'lydian dominant',
  'dominant bebop',
  'altered',
  'phrygian dominant',
  'flamenco',
  'double harmonic major',
  'spanish heptatonic',
  'whole tone',
  'half-whole diminished',
  'whole-half diminished',
  'dorian b2'
];

const chordScaleRules = [
  { matcher: /maj7#11|maj9#11|maj13#11/i, scales: ['lydian', 'ionian'] },
  { matcher: /maj7|maj9|maj6|Δ/i, scales: ['ionian', 'lydian', 'major pentatonic', 'major blues', 'major bebop'] },
  { matcher: /m7b5|ø/i, scales: ['locrian', 'locrian #2'] },
  { matcher: /m6|mmaj7|m\(maj7\)/i, scales: ['melodic minor', 'dorian', 'harmonic minor'] },
  { matcher: /m(?!aj)/i, scales: ['dorian', 'aeolian', 'minor pentatonic', 'minor blues', 'blues', 'melodic minor', 'dorian b2'] },
  { matcher: /7#11/i, scales: ['lydian dominant', 'mixolydian', 'whole tone'] },
  { matcher: /7b9|7alt|7#9|7#5|7b13/i, scales: ['altered', 'phrygian dominant', 'flamenco', 'double harmonic major', 'spanish heptatonic', 'half-whole diminished', 'whole tone'] },
  { matcher: /13|9|11|7/i, scales: ['mixolydian', 'dominant bebop', 'lydian dominant', 'phrygian dominant', 'flamenco', 'minor pentatonic', 'blues'] },
  { matcher: /dim|o/i, scales: ['whole-half diminished', 'half-whole diminished'] },
  { matcher: /sus/i, scales: ['mixolydian', 'dorian', 'major pentatonic'] }
];

const scaleTypeAliases = {
  flamenco: ['phrygian dominant', 'spanish heptatonic', 'double harmonic major'],
  'minor blues': ['blues'],
  'major blues': ['major blues', 'major pentatonic']
};

const chordRootSelect = document.getElementById('chord-root');
const chordQualitySelect = document.getElementById('chord-quality');
const addChordButton = document.getElementById('add-chord');
const languageSelect = document.getElementById('language-select');
const selectedChords = document.getElementById('selected-chords');
const runtimeStatus = document.getElementById('runtime-status');
const wholeOutput = document.getElementById('whole-song');
const perOutput = document.getElementById('per-chord');
const geniusOutput = document.getElementById('genius-guide');
const sharedFretboard = document.getElementById('shared-fretboard');
const fretboardCaption = document.getElementById('fretboard-caption');
const chordProgressionTokens = [];

const appState = {
  language: 'en',
  selectedWholeKeyIndex: 0,
  selectedScaleKey: null
};
const audioState = {
  context: null,
  masterGain: null,
  midiAccess: null,
  selectedOutput: 'synth',
  noteMap: new Map()
};

const chordRoots = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const chordQualities = ['m', '7', 'm7', 'maj7', 'sus4', '6', '9', 'm7b5', 'dim'];

const textByLang = {
  en: {
    addChord: 'Add chord',
    noChords: 'No chords selected yet. Add chords above to begin.',
    wholeSong: 'Whole Song Musical Direction',
    perChord: 'Per Chord Strategy',
    genius: 'Genius Note Navigator',
    addAtLeastOne: 'Add at least one chord to generate scale ideas.',
    scaleNotes: 'Scale notes',
    coverage: 'Coverage',
    notes: 'notes',
    chords: 'chords',
    functionalMap: 'Functional map',
    suggestedScales: 'Suggested scales',
    chooseScale: 'Click a scale name to show it on the fretboard.',
    likelyFunctionIn: 'Likely function in',
    likelyFunctionUnknown: 'Likely function: tonal center unclear, using chord-quality strategy.',
    noDirectMapping: 'No direct mapping found.',
    allNotesBoard: 'All notes on the fretboard.',
    target: 'target',
    confidence: 'confidence',
    cadenceIntelligence: 'Cadence intelligence',
    noStableKey: 'No stable key center found, so cadence analysis is interval-driven.',
    mostlyLinear: 'mostly linear/modal movement with no strong classical cadence.',
    bestNote: 'Best note',
    alternatives: 'Alternatives',
    microLine: 'Micro-line',
    end: 'end'
  },
  ca: {
    addChord: 'Afegir acord',
    noChords: 'Encara no hi ha acords. Afegeix acords a sobre per començar.',
    wholeSong: 'Direcció musical de tota la cançó',
    perChord: 'Estratègia per acord',
    genius: 'Navegador de notes clau',
    addAtLeastOne: 'Afegeix almenys un acord per generar idees d’escales.',
    scaleNotes: 'Notes de l’escala',
    coverage: 'Cobertura',
    notes: 'notes',
    chords: 'acords',
    functionalMap: 'Mapa funcional',
    suggestedScales: 'Escales suggerides',
    chooseScale: 'Fes clic en una escala per mostrar-la al màstil.',
    likelyFunctionIn: 'Funció probable a',
    likelyFunctionUnknown: 'Funció probable: centre tonal poc clar; s’aplica estratègia per qualitat d’acord.',
    noDirectMapping: 'No s’ha trobat un encaix directe.',
    allNotesBoard: 'Totes les notes al màstil.',
    target: 'objectiu',
    confidence: 'confiança',
    cadenceIntelligence: 'Intel·ligència cadencial',
    noStableKey: 'No s’ha detectat un centre tonal estable, així que l’anàlisi cadencial és per intervals.',
    mostlyLinear: 'moviment principalment lineal/modal sense una cadència clàssica forta.',
    bestNote: 'Millor nota',
    alternatives: 'Alternatives',
    microLine: 'Micro-línia',
    end: 'final'
  }
};

initializeApp();

function initializeApp() {
  if (!window.Tonal) {
    setRuntimeStatus('Analysis is unavailable because the Tonal library failed to load.');
    return;
  }

  setupLanguageSelector();
  setupChordBuilder();
  setRuntimeStatus('');
  addChordButton.addEventListener('click', addSelectedChord);
  applyLanguage();
  analyzeChords();
}

function setupLanguageSelector() {
  if (!languageSelect) return;

  languageSelect.value = appState.language;
  languageSelect.addEventListener('change', () => {
    appState.language = languageSelect.value === 'ca' ? 'ca' : 'en';
    applyLanguage();
    renderSelectedChords();
    analyzeChords();
  });
}

function t(key) {
  return textByLang[appState.language]?.[key] ?? textByLang.en?.[key] ?? key;
}

function applyLanguage() {
  if (addChordButton) addChordButton.textContent = t('addChord');
  refreshChordRootLabels();
}

function refreshChordRootLabels() {
  if (!chordRootSelect) return;
  Array.from(chordRootSelect.options).forEach((option) => {
    if (!option.value) return;
    option.textContent = formatNoteName(option.value);
  });
}

function setupChordBuilder() {
  chordRoots.forEach((root) => {
    const option = document.createElement('option');
    option.value = root;
    option.textContent = formatNoteName(root);
    chordRootSelect.appendChild(option);
  });

  const majorOption = document.createElement('option');
  majorOption.value = '';
  majorOption.textContent = '—';
  chordQualitySelect.appendChild(majorOption);

  chordQualities.forEach((quality) => {
    const option = document.createElement('option');
    option.value = quality;
    option.textContent = quality;
    chordQualitySelect.appendChild(option);
  });

  renderSelectedChords();
}

function addSelectedChord() {
  const quality = chordQualitySelect.value || '';
  const chord = `${chordRootSelect.value}${quality}`;
  const parsed = Tonal.Chord.get(chord);
  if (parsed.empty) {
    setRuntimeStatus('That chord quality/root pairing is not recognized.');
    return;
  }

  chordProgressionTokens.push(chord);
  renderSelectedChords();
  analyzeChords();
}

function removeChord(index) {
  chordProgressionTokens.splice(index, 1);
  renderSelectedChords();
  analyzeChords();
}

function renderSelectedChords() {
  selectedChords.innerHTML = '';

  if (!chordProgressionTokens.length) {
    selectedChords.innerHTML = `<p class="summary-note">${t('noChords')}</p>`;
    return;
  }

  chordProgressionTokens.forEach((token, index) => {
    const row = document.createElement('div');
    row.className = 'chord-token';

    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chord-chip';
    chip.textContent = `${index + 1}. ${formatChordLabel(token)}`;
    chip.title = 'Click to play this chord';
    chip.addEventListener('click', () => {
      const chord = Tonal.Chord.get(token);
      if (!chord.empty) playChordNotes(chord.notes);
    });

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'ghost chord-remove';
    remove.textContent = '✕';
    remove.title = 'Remove this chord';
    remove.setAttribute('aria-label', `Remove chord ${token}`);
    remove.addEventListener('click', () => removeChord(index));

    row.appendChild(chip);
    row.appendChild(remove);
    selectedChords.appendChild(row);
  });
}

async function ensureAudioReady() {
  if (audioState.context) {
    if (audioState.context.state === 'suspended') await audioState.context.resume();
    return;
  }
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    setRuntimeStatus('Audio playback is not supported by this browser.');
    return;
  }

  audioState.context = new AudioCtx();
  audioState.masterGain = audioState.context.createGain();
  audioState.masterGain.gain.value = 0.2;
  audioState.masterGain.connect(audioState.context.destination);
}

function onFretboardClick(event) {
  const noteData = extractNoteFromFretboardTarget(event.target);
  if (!noteData?.note) return;
  playNote(noteData.note, 0.6, 0, noteData.midi);
}

function extractNoteFromFretboardTarget(target) {
  if (!target) return null;
  const noteRegex = /([A-G](?:#|b|♯|♭)?)/;

  const candidates = [
    target?.dataset?.note,
    target.getAttribute?.('data-note'),
    target.getAttribute?.('aria-label'),
    target.textContent,
    target.parentElement?.querySelector?.('text')?.textContent,
    target.closest?.('g')?.querySelector?.('text')?.textContent,
    target.closest?.('g')?.getAttribute?.('aria-label'),
    target.closest?.('[aria-label]')?.getAttribute?.('aria-label')
  ].filter(Boolean);

  let note = null;
  for (const candidate of candidates) {
    const match = normalizeNoteName(String(candidate)).match(noteRegex);
    if (match) {
      note = match[1];
      break;
    }
  }

  if (!note) return null;

  const location = extractFretboardLocation(target);
  const explicitMidi = Number(target?.dataset?.midi || target?.getAttribute?.('data-midi'));
  return {
    note,
    midi: Number.isFinite(explicitMidi) ? explicitMidi : resolveMidiForFretboardNote(note, location)
  };
}

function extractFretboardLocation(target) {
  const nodes = [target, target?.closest?.('g'), target?.closest?.('[data-string],[data-fret],[aria-label]')].filter(Boolean);

  for (const node of nodes) {
    const explicit = parseStringAndFretFromNode(node);
    if (explicit) return explicit;

    const stringValue = matchIndex(node?.getAttribute?.('aria-label'), /string\s*(\d+)/i);
    const fretValue = matchIndex(node?.getAttribute?.('aria-label'), /fret\s*(\d+)/i);

    if (stringValue || fretValue) {
      return {
        string: Number(stringValue),
        fret: Number(fretValue)
      };
    }
  }

  return null;
}

function matchIndex(text, regex) {
  if (!text) return null;
  const found = String(text).match(regex);
  return found?.[1] || null;
}

function resolveMidiFromStringAndFret(location) {
  if (!location || Number.isNaN(location.fret) || Number.isNaN(location.string)) return null;
  const stringIdx = location.string - 1;
  const openStrings = ['E4', 'B3', 'G3', 'D3', 'A2', 'E2'];
  const openMidi = Tonal.Note.midi(openStrings[stringIdx]);
  if (openMidi === null || openMidi === undefined) return null;
  return openMidi + location.fret;
}

function resolveMidiForFretboardNote(note, location) {
  if (!location || Number.isNaN(location.fret) || Number.isNaN(location.string)) return null;

  const stringIdx = location.string - 1;
  const fret = location.fret;
  const pitchClass = Tonal.Note.pitchClass(note);
  if (stringIdx < 0 || !pitchClass) return null;

  const tuningMaps = [
    ['E4', 'B3', 'G3', 'D3', 'A2', 'E2'],
    ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']
  ];

  const candidates = tuningMaps
    .map((tuning) => {
      const openMidi = Tonal.Note.midi(tuning[stringIdx]);
      if (openMidi === null || openMidi === undefined) return null;
      return openMidi + fret;
    })
    .filter((midi) => midi !== null);

  const matching = candidates.find((midi) => Tonal.Note.pitchClass(Tonal.Note.fromMidi(midi)) === pitchClass);
  return matching ?? candidates[0] ?? null;

}

async function playChordNotes(notes = []) {
  await ensureAudioReady();
  notes.forEach((note) => playNote(note, 0.85, 0));
}

async function playNote(note, duration = 0.7, offset = 0, forcedMidi = null) {
  await ensureAudioReady();
  if (!audioState.context || !note) return;

  const output = getSelectedMidiOutput();
  if (output) {
    playMidiNote(output, note, duration, offset, forcedMidi);
    return;
  }

  const frequency = forcedMidi !== null ? Tonal.Note.freq(Tonal.Note.fromMidi(forcedMidi)) : Tonal.Note.freq(`${note}4`) || Tonal.Note.freq(note);
  if (!frequency) return;

  const now = audioState.context.currentTime + offset;
  const osc = audioState.context.createOscillator();
  const gain = audioState.context.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(frequency, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.35, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(audioState.masterGain);
  osc.start(now);
  osc.stop(now + duration + 0.03);
}

function getSelectedMidiOutput() {
  return null;
}

function playMidiNote(output, note, duration = 0.7, offset = 0, forcedMidi = null) {
  const midi = forcedMidi ?? Tonal.Note.midi(`${note}4`) ?? Tonal.Note.midi(note);
  if (midi === null || midi === undefined) return;

  const nowMs = window.performance.now() + offset * 1000;
  output.send([0x90, midi, 110], nowMs);
  output.send([0x80, midi, 0], nowMs + duration * 1000);
}

function setRuntimeStatus(message) {
  if (!runtimeStatus) return;
  runtimeStatus.textContent = message;
}


function analyzeChords() {
  const progression = chordProgressionTokens
    .map((token) => Tonal.Chord.get(token))
    .filter((chord) => !chord.empty);

  if (!progression.length) {
    appState.selectedWholeKeyIndex = 0;
    appState.selectedScaleKey = null;
    wholeOutput.innerHTML = `<h2>${t('wholeSong')}</h2><p>${t('addAtLeastOne')}</p>`;
    perOutput.innerHTML = `<h2>${t('perChord')}</h2>`;
    geniusOutput.innerHTML = `<h2>${t('genius')}</h2>`;
    renderSharedFretboard(null, null, { notes: [] }, '', [], { showAllNotes: true });
    return;
  }

  wholeOutput.innerHTML = `<h2>${t('wholeSong')}</h2>`;
  perOutput.innerHTML = `<h2>${t('perChord')}</h2>`;
  geniusOutput.innerHTML = `<h2>${t('genius')}</h2>`;

  const keyCandidates = detectKeyCenters(progression);
  const keySummary = keyCandidates[0];

  renderWholeSongInsights(progression, keyCandidates);
  renderPerChordInsights(progression, keySummary);
  renderGeniusNavigator(progression, keySummary);

  const selectedCandidate = keyCandidates[appState.selectedWholeKeyIndex] || keySummary;
  const selectedGlobalScales = selectedCandidate ? suggestGlobalScales(selectedCandidate) : [];
  const selectedScale = selectedGlobalScales.find((scale) => scale.name === appState.selectedScaleKey) || selectedGlobalScales[0];

  const focusScale = selectedScale
    ? { root: selectedScale.root, type: selectedScale.type, label: selectedScale.displayName || selectedScale.name }
    : keySummary
      ? { root: keySummary.root, type: keySummary.mode === 'minor' ? 'aeolian' : 'ionian', label: `${keySummary.root} ${keySummary.mode === 'minor' ? 'aeolian' : 'ionian'}` }
      : { root: progression[0].tonic, type: 'ionian', label: `${progression[0].tonic} ionian` };

  renderSharedFretboard(
    focusScale.root,
    focusScale.type,
    progression[0],
    `${formatScaleName(focusScale.label)} · ${formatChordLabel(progression[0].symbol)}`,
    progression[1]?.notes || []
  );
}

function detectKeyCenters(progression) {
  const allNotes = [...new Set(progression.flatMap((chord) => chord.notes))];
  const roots = getPossibleRoots(progression);
  const keyCandidates = [];

  roots.forEach((root) => {
    const majorKey = Tonal.Key.majorKey(root);
    const minorKey = Tonal.Key.minorKey(root);

    [
      { mode: 'major', keyObj: majorKey },
      { mode: 'minor', keyObj: minorKey }
    ].forEach(({ mode, keyObj }) => {
      if (!keyObj?.scale?.length) return;

      const noteCoverage = allNotes.filter((n) => keyObj.scale.some((scaleNote) => isSamePitchClass(scaleNote, n))).length / allNotes.length;
      const chordCoverage = progression.filter((chord) => chord.notes.every((n) => keyObj.scale.some((scaleNote) => isSamePitchClass(scaleNote, n)))).length /
        progression.length;
      const tonicBonus = progression[0]?.tonic === root ? 0.08 : 0;
      const cadenceBonus = cadenceBonusForKey(progression, keyObj.scale, root);
      const score = noteCoverage * 0.55 + chordCoverage * 0.35 + tonicBonus + cadenceBonus;

      keyCandidates.push({
        label: `${root} ${mode}`,
        root,
        mode,
        score,
        scale: keyObj.scale,
        notes: allNotes,
        chordCoverage,
        noteCoverage
      });
    });
  });

  return keyCandidates.sort((a, b) => b.score - a.score).slice(0, 4);
}

function cadenceBonusForKey(progression, scaleNotes, root) {
  let bonus = 0;
  progression.forEach((chord, idx) => {
    const next = progression[idx + 1];
    if (!next) return;
    const rn = romanForChord(chord, scaleNotes, root);
    const nextRn = romanForChord(next, scaleNotes, root);
    if (/ii/i.test(rn) && /V7?/.test(nextRn)) bonus += 0.015;
    if (/V7?/.test(rn) && /I/i.test(nextRn)) bonus += 0.03;
    if (/iv/i.test(rn) && /V7?/.test(nextRn)) bonus += 0.012;
  });
  return Math.min(bonus, 0.09);
}

function computeScaleCoverage(progression, scaleNotes = [], root = '') {
  if (!progression.length || !scaleNotes.length) {
    return { noteCoverage: 0, chordCoverage: 0, confidence: 0 };
  }

  const allNotes = [...new Set(progression.flatMap((chord) => chord.notes || []))];
  const noteCoverage = allNotes.length
    ? allNotes.filter((n) => scaleNotes.some((s) => isSamePitchClass(s, n))).length / allNotes.length
    : 0;

  const chordCoverage = progression.length
    ? progression.filter((chord) => (chord.notes || []).every((n) => scaleNotes.some((s) => isSamePitchClass(s, n)))).length / progression.length
    : 0;

  const tonicBonus = progression[0]?.tonic && root && isSamePitchClass(progression[0].tonic, root) ? 0.06 : 0;
  const confidence = Math.min(1, noteCoverage * 0.58 + chordCoverage * 0.36 + tonicBonus);

  return { noteCoverage, chordCoverage, confidence };
}

function renderWholeSongInsights(progression, keyCandidates) {
  if (!keyCandidates.length) {
    wholeOutput.innerHTML += '<p>No convincing key center was detected.</p>';
    return;
  }

  appState.selectedWholeKeyIndex = Math.min(
    Math.max(appState.selectedWholeKeyIndex, 0),
    keyCandidates.length - 1
  );

  const selectedCandidate = keyCandidates[appState.selectedWholeKeyIndex];
  const selectedScales = suggestGlobalScales(selectedCandidate);
  if (!selectedScales.some((scale) => scale.name === appState.selectedScaleKey)) {
    appState.selectedScaleKey = selectedScales[0]?.name || null;
  }

  const selectedScale = selectedScales.find((scale) => scale.name === appState.selectedScaleKey) || selectedScales[0] || null;
  const selectedScaleName = selectedScale ? (selectedScale.displayName || selectedScale.name) : selectedCandidate.label;
  const selectedScaleNotes = selectedScale
    ? (Tonal.Scale.get(selectedScale.name).notes || [])
    : (selectedCandidate.scale || []);

  const { noteCoverage, chordCoverage, confidence } = computeScaleCoverage(
    progression,
    selectedScaleNotes,
    selectedScale?.root || selectedCandidate.root
  );

  const summary = document.createElement('div');
  summary.className = 'scale-block';

  const h4 = document.createElement('h4');
  h4.textContent = `${appState.selectedWholeKeyIndex + 1}. ${formatScaleName(selectedScaleName).toUpperCase()} · ${t('confidence')} ${(confidence * 100).toFixed(0)}%`;
  summary.appendChild(h4);

  const p = document.createElement('p');
  p.className = 'scale-meta';
  p.textContent = `${t('scaleNotes')}: ${selectedScaleNotes.map(formatNoteName).join(' · ')}`;
  summary.appendChild(p);

  const p2 = document.createElement('p');
  p2.className = 'summary-note';
  p2.textContent = `${t('coverage')}: ${t('notes')} ${(noteCoverage * 100).toFixed(0)}% · ${t('chords')} ${(chordCoverage * 100).toFixed(0)}%`;
  summary.appendChild(p2);

  const functionMap = progression
    .map((chord) => `${formatChordLabel(chord.symbol)}: ${romanForChord(chord, selectedScaleNotes, selectedScale?.root || selectedCandidate.root)}`)
    .join(' | ');
  const p3 = document.createElement('p');
  p3.className = 'summary-note';
  p3.textContent = `${t('functionalMap')}: ${functionMap}`;
  summary.appendChild(p3);

  const p4 = document.createElement('p');
  p4.className = 'summary-note';
  p4.textContent = `${t('chooseScale')}`;
  summary.appendChild(p4);

  wholeOutput.appendChild(summary);

  keyCandidates.forEach((keyCandidate, index) => {
    const block = document.createElement('div');
    block.className = 'scale-block';

    const keyButton = document.createElement('button');
    keyButton.className = `scale-link ${index === appState.selectedWholeKeyIndex ? 'active' : ''}`;
    keyButton.textContent = `${index + 1}. ${formatScaleName(keyCandidate.label).toUpperCase()}`;
    keyButton.addEventListener('click', () => {
      appState.selectedWholeKeyIndex = index;
      appState.selectedScaleKey = null;
      renderWholeSongInsights(progression, keyCandidates);

      const firstScale = suggestGlobalScales(keyCandidate)[0];
      if (firstScale) {
        const shownScaleName = firstScale.displayName || firstScale.name;
        renderSharedFretboard(firstScale.root, firstScale.type, progression[0], `${formatScaleName(shownScaleName)} · ${firstScale.reason}`);
      }
    });
    block.appendChild(keyButton);

    const links = document.createElement('div');
    links.className = 'scale-links';

    suggestGlobalScales(keyCandidate).forEach((scale) => {
      const shownScaleName = scale.displayName || scale.name;
      const scaleBtn = document.createElement('button');
      const active = index === appState.selectedWholeKeyIndex && appState.selectedScaleKey === scale.name;
      scaleBtn.className = `scale-link ${active ? 'active' : ''}`;
      scaleBtn.textContent = formatScaleName(shownScaleName);
      scaleBtn.title = scale.reason;
      scaleBtn.addEventListener('click', () => {
        appState.selectedWholeKeyIndex = index;
        appState.selectedScaleKey = scale.name;
        renderWholeSongInsights(progression, keyCandidates);
        renderSharedFretboard(scale.root, scale.type, progression[0], `${formatScaleName(shownScaleName)} · ${scale.reason}`);
      });
      links.appendChild(scaleBtn);
    });

    block.appendChild(links);
    wholeOutput.appendChild(block);
  });
}

function suggestGlobalScales(keyCandidate) {
  const modeMap = {
    major: ['ionian', 'lydian', 'major pentatonic', 'major blues', 'mixolydian', 'double harmonic major'],
    minor: ['aeolian', 'dorian', 'minor pentatonic', 'minor blues', 'blues', 'harmonic minor', 'phrygian dominant', 'flamenco']
  };

  return (modeMap[keyCandidate.mode] || ['ionian'])
    .map((requestedType) => {
      const resolved = resolveScaleTypeForRoot(keyCandidate.root, requestedType);
      if (!resolved) return null;

      return {
        root: keyCandidate.root,
        type: resolved.type,
        labelType: requestedType,
        name: resolved.name,
        displayName: resolved.displayName,
        reason: scaleFlavors[requestedType] || scaleFlavors[resolved.type] || 'Useful harmonic color.'
      };
    })
    .filter(Boolean)
    .sort((a, b) => scalePriority(a.labelType || a.type) - scalePriority(b.labelType || b.type));
}

function renderPerChordInsights(progression, primaryKey) {
  progression.forEach((chord, index) => {
    const block = document.createElement('div');
    block.className = 'scale-block';

    const h4 = document.createElement('h4');
    h4.textContent = `Chord ${index + 1}: ${formatChordLabel(chord.symbol)}`;
    block.appendChild(h4);

    const fn = document.createElement('p');
    fn.className = 'summary-note';
    if (primaryKey) {
      fn.textContent = `${t('likelyFunctionIn')} ${formatScaleName(primaryKey.label)}: ${romanForChord(chord, primaryKey.scale, primaryKey.root)}`;
    } else {
      fn.textContent = t('likelyFunctionUnknown');
    }
    block.appendChild(fn);

    const fittingScales = getChordScaleOptions(chord);
    if (!fittingScales.length) {
      const fallback = document.createElement('p');
      fallback.textContent = t('noDirectMapping');
      block.appendChild(fallback);
      perOutput.appendChild(block);
      return;
    }

    const links = document.createElement('div');
    links.className = 'scale-links';

    fittingScales.forEach((scale) => {
      const scaleBtn = document.createElement('button');
      scaleBtn.className = 'scale-link';
      const shownScaleName = scale.displayName || scale.name;
      scaleBtn.textContent = formatScaleName(shownScaleName);
      scaleBtn.title = scale.reason;
      scaleBtn.addEventListener('click', () => {
        renderSharedFretboard(scale.root, scale.type, chord, `${formatChordLabel(chord.symbol)} ${t('target')}: ${formatScaleName(shownScaleName)} · ${scale.reason}`);
      });
      links.appendChild(scaleBtn);
    });

    block.appendChild(links);

    perOutput.appendChild(block);
  });
}

function renderGeniusNavigator(progression, keySummary) {
  if (!progression.length) return;

  const analysis = progression.map((chord, index) => {
    const nextChord = progression[index + 1] || null;
    return analyzeBestNote(chord, nextChord, keySummary);
  });

  const cadenceSummary = summarizeCadences(progression, keySummary);
  const cadence = document.createElement('p');
  cadence.className = 'summary-note';
  cadence.textContent = cadenceSummary;
  geniusOutput.appendChild(cadence);

  analysis.forEach((entry, index) => {
    const block = document.createElement('div');
    block.className = 'scale-block note-block';

    const header = document.createElement('h4');
    header.textContent = `${index + 1}. ${formatChordLabel(entry.chord)} → ${entry.nextChord ? formatChordLabel(entry.nextChord) : t('end')}`;
    block.appendChild(header);

    const best = document.createElement('p');
    best.innerHTML = `<strong>${t('bestNote')}:</strong> ${formatNoteName(entry.bestNote)} <span class="summary-note">(${entry.reason})</span>`;
    block.appendChild(best);

    const alt = document.createElement('p');
    alt.className = 'summary-note';
    alt.textContent = `${t('alternatives')}: ${entry.alternatives.map(formatNoteName).join(' · ')}`;
    block.appendChild(alt);

    const microLine = document.createElement('p');
    microLine.className = 'summary-note';
    microLine.textContent = `${t('microLine')}: ${entry.microLine.map(formatNoteName).join(' → ')}`;
    block.appendChild(microLine);

    geniusOutput.appendChild(block);
  });
}

function analyzeBestNote(chord, nextChord, keySummary) {
  const chordNotes = chord.notes || [];
  const extensionPool = getExtensionPool(chord, keySummary);
  const candidates = [...new Set([...chordNotes, ...extensionPool])];

  const ranked = candidates
    .map((note) => ({
      note,
      score: scoreCandidateNote(note, chord, nextChord, keySummary)
    }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0]?.note || chord.tonic || chord.symbol;
  const alt = ranked.slice(1, 4).map((item) => item.note);
  const target = nextChord ? pickClosestResolution(best, nextChord.notes) : best;

  return {
    chord: chord.symbol,
    nextChord: nextChord?.symbol,
    bestNote: best,
    alternatives: alt.length ? alt : chordNotes.slice(0, 3),
    microLine: [best, target, nextChord?.tonic || best],
    reason: buildNoteReason(best, chord, nextChord, keySummary)
  };
}

function scoreCandidateNote(note, chord, nextChord, keySummary) {
  const chordNotes = chord.notes || [];
  let score = 0;
  const interval = chord.tonic ? Tonal.Interval.distance(chord.tonic, note) : '';

  if (note === chord.tonic) score += 1;
  if (chordNotes[1] === note) score += 0.95;
  if (chordNotes[2] === note) score += 0.72;
  if (chordNotes[3] === note) score += 0.86;
  if (!chordNotes.includes(note)) score += extensionScore(interval, chord.symbol || chord.name || '');

  if (keySummary?.scale?.some((scaleNote) => isSamePitchClass(scaleNote, note))) score += 0.35;

  if (nextChord?.notes?.length) {
    const closest = nearestSemitoneDistance(note, nextChord.notes);
    score += Math.max(0.45 - closest * 0.11, 0);

    if (isDominant(chord.symbol) && (nextChord.symbol || '').match(/maj|min|m/i)) {
      const resolved = pickClosestResolution(note, nextChord.notes);
      if (nearestSemitoneDistance(note, [resolved]) <= 1) score += 0.2;
    }
  }

  return score;
}

function extensionScore(interval, symbol) {
  const dominant = /7/.test(symbol) && !/maj7/.test(symbol);
  if (['2M', '9M'].includes(interval)) return 0.58;
  if (['4P', '11P'].includes(interval)) return dominant ? 0.55 : 0.3;
  if (['6M', '13M'].includes(interval)) return 0.52;
  if (['2m', '9m', '5A', '6m'].includes(interval)) return dominant ? 0.48 : 0.12;
  return 0.1;
}

function nearestSemitoneDistance(note, targetNotes) {
  const source = Tonal.Note.chroma(note);
  if (source === null || source === undefined) return 12;

  return Math.min(
    ...targetNotes
      .map((target) => Tonal.Note.chroma(target))
      .filter((value) => value !== null && value !== undefined)
      .map((targetChroma) => {
        const diff = Math.abs(source - targetChroma);
        return Math.min(diff, 12 - diff);
      })
  );
}

function pickClosestResolution(note, targetNotes = []) {
  if (!targetNotes.length) return note;
  let best = targetNotes[0];
  let bestDistance = nearestSemitoneDistance(note, [best]);

  targetNotes.forEach((target) => {
    const distance = nearestSemitoneDistance(note, [target]);
    if (distance < bestDistance) {
      best = target;
      bestDistance = distance;
    }
  });

  return best;
}

function buildNoteReason(note, chord, nextChord, keySummary) {
  const reasons = [];
  if ((chord.notes || []).includes(note)) reasons.push('strong chord tone');
  if (keySummary?.scale?.some((scaleNote) => isSamePitchClass(scaleNote, note))) {
    reasons.push(`inside ${formatScaleName(keySummary.label)}`);
  }
  if (nextChord?.notes?.length && nearestSemitoneDistance(note, nextChord.notes) <= 1) {
    reasons.push(`resolves by step into ${formatChordLabel(nextChord.symbol)}`);
  }
  if (!reasons.length) reasons.push('color tension with directional pull');
  return reasons.join(', ');
}

function summarizeCadences(progression, keySummary) {
  if (!keySummary) return t('noStableKey');

  const labels = progression.map((chord) => romanForChord(chord, keySummary.scale, keySummary.root));
  const moves = [];

  labels.forEach((label, idx) => {
    const next = labels[idx + 1];
    if (!next) return;
    if (/ii/i.test(label) && /V/.test(next)) moves.push('ii→V motion detected');
    if (/V/.test(label) && /^I/.test(next)) moves.push('authentic V→I cadence');
    if (/IV/.test(label) && /V/.test(next)) moves.push('pre-dominant IV→V setup');
  });

  return moves.length
    ? `${t('cadenceIntelligence')}: ${[...new Set(moves)].join(' · ')}.`
    : `${t('cadenceIntelligence')}: ${t('mostlyLinear')}`;
}

function getExtensionPool(chord, keySummary) {
  const targetScale = getChordScaleOptions(chord)[0];
  const scaleNotes = targetScale ? Tonal.Scale.get(targetScale.name).notes : keySummary?.scale || [];
  return scaleNotes.filter((note) => !(chord.notes || []).includes(note));
}

function isDominant(symbol = '') {
  return /7/.test(symbol) && !/maj7|m7b5|ø/.test(symbol);
}

function scalePriority(type = '') {
  const idx = commonScalePriority.indexOf(type);
  return idx === -1 ? commonScalePriority.length + 99 : idx;
}

function resolveScaleTypeForRoot(root, requestedType) {
  const attempts = [requestedType, ...(scaleTypeAliases[requestedType] || [])];

  for (const type of attempts) {
    const name = `${root} ${type}`;
    const scale = Tonal.Scale.get(name);
    if (!scale.empty && scale.notes?.length) {
      return {
        type,
        requestedType,
        name,
        notes: scale.notes,
        displayName: type === requestedType ? name : `${root} ${requestedType} (${type})`
      };
    }
  }

  return null;
}

function getFallbackScaleTypes(chord) {
  const symbol = chord.symbol || chord.name || '';

  if (/m7b5|ø/i.test(symbol)) return ['locrian', 'locrian #2', 'dorian b2'];
  if (/dim|o/i.test(symbol)) return ['whole-half diminished', 'half-whole diminished'];
  if (/7b9|7alt|7#9|7#5|7b13/i.test(symbol)) return ['altered', 'phrygian dominant', 'flamenco', 'double harmonic major', 'spanish heptatonic', 'half-whole diminished', 'whole tone', 'mixolydian'];
  if (/13|9|11|7/i.test(symbol)) return ['mixolydian', 'dominant bebop', 'lydian dominant', 'phrygian dominant', 'flamenco', 'whole tone', 'blues'];
  if (/m6|mmaj7|m\(maj7\)/i.test(symbol)) return ['melodic minor', 'harmonic minor', 'dorian', 'aeolian', 'minor blues'];
  if (/m(?!aj)/i.test(symbol)) return ['dorian', 'aeolian', 'minor pentatonic', 'minor blues', 'blues', 'melodic minor', 'harmonic minor'];

  return ['ionian', 'lydian', 'major pentatonic', 'major blues', 'mixolydian', 'major bebop', 'double harmonic major'];
}

function getChordScaleOptions(chord) {
  if (!chord.tonic) return [];

  const qualityMatch = chordScaleRules.find((rule) => rule.matcher.test(chord.symbol || chord.name));
  const ruleTypes = qualityMatch?.scales?.length ? qualityMatch.scales : [];
  const candidateTypes = [...new Set([...ruleTypes, ...getFallbackScaleTypes(chord)])];

  return candidateTypes
    .map((type) => {
      const resolved = resolveScaleTypeForRoot(chord.tonic, type);
      if (!resolved) return null;

      const fit = chord.notes.every((note) => resolved.notes.some((scaleNote) => isSamePitchClass(scaleNote, note)));
      if (!fit) return null;

      return {
        root: chord.tonic,
        type: resolved.type,
        labelType: resolved.requestedType,
        name: resolved.name,
        displayName: resolved.displayName,
        reason: scaleFlavors[resolved.requestedType] || scaleFlavors[resolved.type] || `${type} color for ${chord.symbol}`
      };
    })
    .filter(Boolean)
    .sort((a, b) => scalePriority(a.labelType || a.type) - scalePriority(b.labelType || b.type))
    .slice(0, 8);
}

function romanForChord(chord, scaleNotes, keyRoot) {
  if (!chord.tonic || !scaleNotes?.length) return 'outside';
  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const idx = scaleNotes.findIndex((scaleNote) => isSamePitchClass(scaleNote, chord.tonic));
  if (idx === -1) return 'outside';

  const numeral = romanNumerals[idx];
  const symbol = chord.symbol || '';
  if (/m(?!aj)|dim|ø/i.test(symbol)) return numeral.toLowerCase();
  if (/7/.test(symbol) && !/maj7/.test(symbol) && idx === 4) return `${numeral}7`;
  if (/maj7/.test(symbol)) return `${numeral}Δ`;
  if (/dim|ø/i.test(symbol)) return `${numeral.toLowerCase()}°`;
  if (/7/.test(symbol)) return `${numeral}7`;
  return numeral;
}

function renderSharedFretboard(root, type, chord, captionText, nextChordNotes = [], options = {}) {
  const tuning = ['E4', 'B3', 'G3', 'D3', 'A2', 'E2'];
  const fretCount = 15;
  const showAllNotes = Boolean(options.showAllNotes) || !root || !type;
  const scaleNotes = showAllNotes ? [] : Tonal.Scale.get(`${root} ${type}`).notes || [];

  sharedFretboard.innerHTML = '';
  audioState.noteMap = new Map();

  const grid = document.createElement('div');
  grid.className = 'fretboard-grid';

  const fretHeader = document.createElement('div');
  fretHeader.className = 'fretboard-row';
  fretHeader.appendChild(Object.assign(document.createElement('span'), { className: 'string-label', textContent: '' }));

  for (let fret = 0; fret <= fretCount; fret += 1) {
    const fretLabel = document.createElement('span');
    fretLabel.className = 'fret-index';
    fretLabel.textContent = String(fret);
    fretHeader.appendChild(fretLabel);
  }
  grid.appendChild(fretHeader);

  tuning.forEach((openString, idx) => {
    const stringNumber = idx + 1;
    const row = document.createElement('div');
    row.className = 'fretboard-row';

    const label = document.createElement('span');
    label.className = 'string-label';
    label.textContent = `${formatNoteName(openString.slice(0, -1))}${stringNumber}`;
    row.appendChild(label);

    const openMidi = Tonal.Note.midi(openString);

    for (let fret = 0; fret <= fretCount; fret += 1) {
      const midi = openMidi + fret;
      const note = Tonal.Note.pitchClass(Tonal.Note.fromMidi(midi));
      const noteLabel = formatNoteName(note);
      const noteButton = document.createElement('button');
      noteButton.type = 'button';
      noteButton.className = 'fret-note';
      noteButton.title = `Play ${noteLabel} (string ${stringNumber}, fret ${fret})`;
      noteButton.dataset.note = note;
      noteButton.dataset.midi = String(midi);
      noteButton.dataset.string = String(stringNumber);
      noteButton.dataset.fret = String(fret);

      const inScale = showAllNotes || scaleNotes.some((scaleNote) => isSamePitchClass(scaleNote, note));
      if (inScale) {
        noteButton.textContent = noteLabel;
      }

      noteButton.addEventListener('click', () => playNote(note, 0.6, 0, midi));
      row.appendChild(noteButton);
      audioState.noteMap.set(`${stringNumber}:${fret}`, { note, midi });
    }

    grid.appendChild(row);
  });

  sharedFretboard.appendChild(grid);
  fretboardCaption.textContent = captionText || (showAllNotes ? t('allNotesBoard') : '');
}

function attachFretboardNoteMetadata() {
  audioState.noteMap = new Map();
  const noteGroups = sharedFretboard.querySelectorAll('g');
  noteGroups.forEach((group) => {
    const textNode = group.querySelector('text');
    const labelSource =
      textNode?.textContent || group.getAttribute('aria-label') || group.getAttribute('data-note') || '';
    const normalized = normalizeNoteName(labelSource);
    const noteMatch = normalized.match(/([A-G](?:#|b)?)/);
    if (!noteMatch) return;

    const note = noteMatch[1];
    const location = inferFretboardLocation(group);
    const midi = location ? resolveMidiFromStringAndFret(location) : null;

    group.setAttribute('data-note', note);
    if (location) {
      group.setAttribute('data-string', String(location.string));
      group.setAttribute('data-fret', String(location.fret));
    }
    if (midi !== null) group.setAttribute('data-midi', String(midi));

    if (location && midi !== null) {
      audioState.noteMap.set(`${location.string}:${location.fret}`, { note, midi });
    }

    group.querySelectorAll('*').forEach((node) => {
      node.setAttribute('data-note', note);
      if (midi !== null) node.setAttribute('data-midi', String(midi));
      if (!location) return;
      node.setAttribute('data-string', String(location.string));
      node.setAttribute('data-fret', String(location.fret));
    });
  });
}

function inferFretboardLocation(node) {
  if (!node) return null;

  const fromAttribute = parseStringAndFretFromNode(node);
  if (fromAttribute) return fromAttribute;

  const descendants = node.querySelectorAll?.('*') || [];
  for (const child of descendants) {
    const childLocation = parseStringAndFretFromNode(child);
    if (childLocation) return childLocation;
  }

  return null;
}

function parseStringAndFretFromNode(node) {
  if (!node) return null;

  const stringValue =
    node?.dataset?.string ||
    node?.getAttribute?.('data-string') ||
    node?.getAttribute?.('string') ||
    matchIndex(node?.getAttribute?.('aria-label'), /string\s*(\d+)/i) ||
    matchIndex(node?.getAttribute?.('class'), /(?:^|\s)s(?:tring)?[-_]?([1-6])(?:\s|$)/i);
  const fretValue =
    node?.dataset?.fret ||
    node?.getAttribute?.('data-fret') ||
    node?.getAttribute?.('fret') ||
    matchIndex(node?.getAttribute?.('aria-label'), /fret\s*(\d+)/i) ||
    matchIndex(node?.getAttribute?.('class'), /(?:^|\s)f(?:ret)?[-_]?(\d{1,2})(?:\s|$)/i);

  if (!stringValue || !fretValue) return null;

  return {
    string: Number(stringValue),
    fret: Number(fretValue)
  };
}



function formatScaleName(label = '') {
  return String(label).replace(/[A-G](?:#|b)?/g, (token) => formatNoteName(token));
}

function formatChordLabel(symbol = '') {
  if (!symbol) return '';
  return String(symbol).replace(/[A-G](?:#|b)?/g, (token) => formatNoteName(token));
}

function toCatalanNote(note = '') {
  const map = {
    C: 'Do',
    D: 'Re',
    E: 'Mi',
    F: 'Fa',
    G: 'Sol',
    A: 'La',
    B: 'Si'
  };
  const normalized = normalizeNoteName(note);
  const base = normalized.match(/^[A-G]/)?.[0];
  if (!base) return normalized;
  const accidental = normalized.slice(1);
  return `${map[base] || base}${accidental}`;
}

function formatNoteName(note = '') {
  const normalized = normalizeNoteName(note);
  const replacements = {
    Cb: 'B',
    Db: 'C#',
    Eb: 'D#',
    Fb: 'E',
    Gb: 'F#',
    Ab: 'G#',
    Bb: 'A#',
    'E#': 'F',
    'B#': 'C'
  };

  const pitchClass = normalized.match(/[A-G](?:#|b)?/);
  if (!pitchClass) return normalized;
  const mapped = replacements[pitchClass[0]] || pitchClass[0];
  const localized = appState.language === 'ca' ? toCatalanNote(mapped) : mapped;
  return normalized.replace(pitchClass[0], localized);
}

function normalizeNoteName(value = '') {
  return String(value)
    .replaceAll('♯', '#')
    .replaceAll('♭', 'b')
    .trim();
}

function isSamePitchClass(a, b) {
  const left = Tonal.Note.chroma(a);
  const right = Tonal.Note.chroma(b);
  return left !== null && left !== undefined && right !== null && right !== undefined && left === right;
}

function getPossibleRoots(progression) {
  const tonicSet = new Set(progression.map((chord) => chord.tonic).filter(Boolean));
  const chromatic = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return [...tonicSet, ...chromatic.filter((note) => !tonicSet.has(note))];
}
