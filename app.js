const scaleFlavors = {
  ionian: 'Stable major color for melodic clarity and strong tonic pull.',
  lydian: 'Modern major brightness with a floating #4 color.',
  mixolydian: 'Dominant-friendly major sound, perfect for V chords.',
  dorian: 'Minor with a hopeful 6th, great for ii and modal jams.',
  aeolian: 'Natural minor gravity and emotional depth.',
  phrygian: 'Dark and tense minor color with b2 bite.',
  locrian: 'Half-diminished tension and unstable color.',
  'major pentatonic': 'Open and consonant major sound for hooks and phrases.',
  'minor pentatonic': 'Core guitar vocabulary for expressive minor lines.',
  blues: 'Minor pentatonic + blue note for grit and tension-release.',
  'harmonic minor': 'Dramatic minor color with strong leading tone.',
  'melodic minor': 'Jazz-forward minor language with smooth upper structure.'
};

const commonScalePriority = [
  'ionian',
  'aeolian',
  'dorian',
  'mixolydian',
  'lydian',
  'minor pentatonic',
  'major pentatonic',
  'blues',
  'harmonic minor',
  'melodic minor',
  'phrygian',
  'locrian'
];

const chordScaleRules = [
  { matcher: /maj7|maj9|Δ/i, scales: ['ionian', 'lydian'] },
  { matcher: /m7b5|ø/i, scales: ['locrian', 'locrian #2'] },
  { matcher: /m(?!aj)/i, scales: ['dorian', 'aeolian', 'minor pentatonic', 'blues'] },
  { matcher: /7#11/i, scales: ['lydian dominant', 'mixolydian'] },
  { matcher: /7b9|7alt|7#9|7#5|7b13/i, scales: ['phrygian dominant', 'altered'] },
  { matcher: /7/i, scales: ['mixolydian', 'minor pentatonic', 'blues'] },
  { matcher: /dim|o/i, scales: ['whole-half diminished'] },
  { matcher: /sus/i, scales: ['mixolydian', 'dorian'] }
];

const chordRootSelect = document.getElementById('chord-root');
const chordQualitySelect = document.getElementById('chord-quality');
const addChordButton = document.getElementById('add-chord');
const selectedChords = document.getElementById('selected-chords');
const runtimeStatus = document.getElementById('runtime-status');
const wholeOutput = document.getElementById('whole-song');
const perOutput = document.getElementById('per-chord');
const geniusOutput = document.getElementById('genius-guide');
const sharedFretboard = document.getElementById('shared-fretboard');
const fretboardCaption = document.getElementById('fretboard-caption');
const chordProgressionTokens = [];
const audioState = {
  context: null,
  masterGain: null,
  midiAccess: null,
  selectedOutput: 'synth',
  noteMap: new Map()
};

const chordRoots = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const chordQualities = ['m', '7', 'm7', 'maj7', 'sus4', '6', '9', 'm7b5', 'dim'];

initializeApp();

function initializeApp() {
  if (!window.Tonal) {
    setRuntimeStatus('Analysis is unavailable because the Tonal library failed to load.');
    return;
  }

  setupChordBuilder();
  setRuntimeStatus('');
  addChordButton.addEventListener('click', addSelectedChord);

  analyzeChords();
}

function setupChordBuilder() {
  chordRoots.forEach((root) => {
    const option = document.createElement('option');
    option.value = root;
    option.textContent = root;
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

  ['Am7', 'D7', 'Gmaj7'].forEach((defaultChord) => chordProgressionTokens.push(defaultChord));
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
    selectedChords.innerHTML = '<p class="summary-note">No chords selected yet. Add chords above to begin.</p>';
    return;
  }

  chordProgressionTokens.forEach((token, index) => {
    const row = document.createElement('div');
    row.className = 'chord-token';

    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chord-chip';
    chip.textContent = `${index + 1}. ${token}`;
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
    wholeOutput.innerHTML = '<h2>Whole Song Musical Direction</h2><p>Add at least one chord to generate scale ideas.</p>';
    perOutput.innerHTML = '<h2>Per Chord Strategy</h2>';
    geniusOutput.innerHTML = '<h2>Genius Note Navigator</h2>';
    renderSharedFretboard('C', 'ionian', { notes: [] }, 'Waiting for chords. Showing C ionian as a neutral map.', []);
    return;
  }

  wholeOutput.innerHTML = '<h2>Whole Song Musical Direction</h2>';
  perOutput.innerHTML = '<h2>Per Chord Strategy</h2>';
  geniusOutput.innerHTML = '<h2>Genius Note Navigator</h2>';

  const keyCandidates = detectKeyCenters(progression);
  const keySummary = keyCandidates[0];

  renderWholeSongInsights(progression, keyCandidates);
  renderPerChordInsights(progression, keySummary);
  renderGeniusNavigator(progression, keySummary);

  const focusScale = keySummary ? { root: keySummary.root, type: keySummary.mode === 'minor' ? 'aeolian' : 'ionian' } : { root: progression[0].tonic, type: 'ionian' };
  renderSharedFretboard(
    focusScale.root,
    focusScale.type,
    progression[0],
    `${focusScale.root} ${focusScale.type} over ${progression[0].symbol}`,
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

      const noteCoverage = allNotes.filter((n) => keyObj.scale.includes(n)).length / allNotes.length;
      const chordCoverage = progression.filter((chord) => chord.notes.every((n) => keyObj.scale.includes(n))).length /
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

function renderWholeSongInsights(progression, keyCandidates) {
  if (!keyCandidates.length) {
    wholeOutput.innerHTML += '<p>No convincing key center was detected.</p>';
    return;
  }

  keyCandidates.forEach((keyCandidate, index) => {
    const block = document.createElement('div');
    block.className = 'scale-block';

    const h4 = document.createElement('h4');
    h4.textContent = `${index + 1}. ${formatScaleName(keyCandidate.label).toUpperCase()} · confidence ${(keyCandidate.score * 100).toFixed(0)}%`;
    block.appendChild(h4);

    const p = document.createElement('p');
    p.className = 'scale-meta';
    p.textContent = `Scale notes: ${keyCandidate.scale.map(formatNoteName).join(' · ')}`;
    block.appendChild(p);

    const p2 = document.createElement('p');
    p2.className = 'summary-note';
    p2.textContent = `Coverage: notes ${(keyCandidate.noteCoverage * 100).toFixed(0)}% · chords ${(keyCandidate.chordCoverage * 100).toFixed(0)}%`;
    block.appendChild(p2);

    const functionMap = progression
      .map((chord) => `${formatScaleName(chord.symbol)}: ${romanForChord(chord, keyCandidate.scale, keyCandidate.root)}`)
      .join(' | ');
    const p3 = document.createElement('p');
    p3.className = 'summary-note';
    p3.textContent = `Functional map: ${functionMap}`;
    block.appendChild(p3);

    const strongScales = suggestGlobalScales(keyCandidate);
    strongScales.forEach((scale) => {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = `${scale.name} (${scale.reason})`;
      block.appendChild(badge);

      const btn = document.createElement('button');
      btn.className = 'ghost';
      btn.textContent = `Show ${formatScaleName(scale.name)}`;
      btn.addEventListener('click', () => {
        renderSharedFretboard(scale.root, scale.type, progression[0], `${formatScaleName(scale.name)}: ${scale.reason}`);
      });
      block.appendChild(btn);
    });

    wholeOutput.appendChild(block);
  });
}

function suggestGlobalScales(keyCandidate) {
  const modeMap = {
    major: ['ionian', 'lydian', 'major pentatonic'],
    minor: ['aeolian', 'dorian', 'minor pentatonic', 'blues', 'harmonic minor']
  };

  return (modeMap[keyCandidate.mode] || ['ionian'])
    .map((type) => ({
      root: keyCandidate.root,
      type,
      name: formatScaleName(`${keyCandidate.root} ${type}`),
      reason: scaleFlavors[type] || 'Useful harmonic color.'
    }))
    .filter((candidate) => !Tonal.Scale.get(candidate.name).empty);
}

function renderPerChordInsights(progression, primaryKey) {
  progression.forEach((chord, index) => {
    const block = document.createElement('div');
    block.className = 'scale-block';

    const h4 = document.createElement('h4');
    h4.textContent = `Chord ${index + 1}: ${formatScaleName(chord.symbol)}`;
    block.appendChild(h4);

    const fn = document.createElement('p');
    fn.className = 'summary-note';
    if (primaryKey) {
      fn.textContent = `Likely function in ${primaryKey.label}: ${romanForChord(chord, primaryKey.scale, primaryKey.root)}`;
    } else {
      fn.textContent = 'Likely function: tonal center unclear, using chord-quality strategy.';
    }
    block.appendChild(fn);

    const fittingScales = getChordScaleOptions(chord);
    if (!fittingScales.length) {
      const fallback = document.createElement('p');
      fallback.textContent = 'No direct mapping found.';
      block.appendChild(fallback);
      perOutput.appendChild(block);
      return;
    }

    fittingScales.forEach((scale) => {
      const btn = document.createElement('button');
      btn.className = 'ghost';
      btn.textContent = `Show ${formatScaleName(scale.name)}`;
      btn.addEventListener('click', () => {
        renderSharedFretboard(scale.root, scale.type, chord, `${formatScaleName(chord.symbol)} target: ${scale.reason}`);
      });
      block.appendChild(btn);

      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = scale.reason;
      block.appendChild(badge);
    });

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
    header.textContent = `${index + 1}. ${formatScaleName(entry.chord)} → ${entry.nextChord ? formatScaleName(entry.nextChord) : 'end'}`;
    block.appendChild(header);

    const best = document.createElement('p');
    best.innerHTML = `<strong>Best note:</strong> ${formatNoteName(entry.bestNote)} <span class="summary-note">(${entry.reason})</span>`;
    block.appendChild(best);

    const alt = document.createElement('p');
    alt.className = 'summary-note';
    alt.textContent = `Alternatives: ${entry.alternatives.map(formatNoteName).join(' · ')}`;
    block.appendChild(alt);

    const microLine = document.createElement('p');
    microLine.className = 'summary-note';
    microLine.textContent = `Micro-line: ${entry.microLine.map(formatNoteName).join(' → ')}`;
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

  if (keySummary?.scale?.includes(note)) score += 0.35;

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
  if (keySummary?.scale?.includes(note)) reasons.push(`inside ${formatScaleName(keySummary.label)}`);
  if (nextChord?.notes?.length && nearestSemitoneDistance(note, nextChord.notes) <= 1) {
    reasons.push(`resolves by step into ${nextChord.symbol}`);
  }
  if (!reasons.length) reasons.push('color tension with directional pull');
  return reasons.join(', ');
}

function summarizeCadences(progression, keySummary) {
  if (!keySummary) return 'No stable key center found, so cadence analysis is interval-driven.';

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
    ? `Cadence intelligence: ${[...new Set(moves)].join(' · ')}.`
    : 'Cadence intelligence: mostly linear/modal movement with no strong classical cadence.';
}

function getExtensionPool(chord, keySummary) {
  const targetScale = getChordScaleOptions(chord)[0];
  const scaleNotes = targetScale ? Tonal.Scale.get(targetScale.name).notes : keySummary?.scale || [];
  return scaleNotes.filter((note) => !(chord.notes || []).includes(note));
}

function isDominant(symbol = '') {
  return /7/.test(symbol) && !/maj7|m7b5|ø/.test(symbol);
}

function getChordScaleOptions(chord) {
  if (!chord.tonic) return [];

  const qualityMatch = chordScaleRules.find((rule) => rule.matcher.test(chord.symbol || chord.name));
  const candidateTypes = qualityMatch?.scales?.length
    ? qualityMatch.scales
    : ['ionian', 'major pentatonic', 'mixolydian'];

  return candidateTypes
    .map((type) => {
      const name = `${chord.tonic} ${type}`;
      const scale = Tonal.Scale.get(name);
      if (scale.empty) return null;

      const fit = chord.notes.every((note) => scale.notes.includes(note));
      if (!fit) return null;

      return {
        root: chord.tonic,
        type,
        name,
        reason: scaleFlavors[type] || `${type} color for ${chord.symbol}`
      };
    })
    .filter(Boolean)
    .sort((a, b) => commonScalePriority.indexOf(a.type) - commonScalePriority.indexOf(b.type));
}

function romanForChord(chord, scaleNotes, keyRoot) {
  if (!chord.tonic || !scaleNotes?.length) return 'outside';
  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const idx = scaleNotes.indexOf(chord.tonic);
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

function renderSharedFretboard(root, type, chord, captionText, nextChordNotes = []) {
  const tuning = ['E4', 'B3', 'G3', 'D3', 'A2', 'E2'];
  const fretCount = 15;
  const scaleNotes = Tonal.Scale.get(`${root} ${type}`).notes || [];
  const chordNotes = chord?.notes || [];
  const nextNotes = nextChordNotes || [];

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

      const inScale = scaleNotes.some((scaleNote) => isSamePitchClass(scaleNote, note));
      const inChord = chordNotes.some((chordNote) => isSamePitchClass(chordNote, note));
      const inNextChord = nextNotes.some((nextNote) => isSamePitchClass(nextNote, note));
      if (inScale) {
        noteButton.classList.add('is-active');
        noteButton.textContent = noteLabel;
      }
      if (inChord) noteButton.classList.add('is-chord-tone');
      if (inNextChord) noteButton.classList.add('is-next-tone');

      noteButton.addEventListener('click', () => playNote(note, 0.6, 0, midi));
      row.appendChild(noteButton);
      audioState.noteMap.set(`${stringNumber}:${fret}`, { note, midi });
    }

    grid.appendChild(row);
  });

  sharedFretboard.appendChild(grid);
  fretboardCaption.textContent = captionText;
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
  return normalized.replace(pitchClass[0], mapped);
}

function normalizeNoteName(value = '') {
  return String(value)
    .replaceAll('♯', '#')
    .replaceAll('♭', 'b')
    .trim();
}

function isSamePitchClass(a, b) {
  const left = Tonal.Note.pitchClass(a);
  const right = Tonal.Note.pitchClass(b);
  return left && right && left === right;
}

function getPossibleRoots(progression) {
  const tonicSet = new Set(progression.map((chord) => chord.tonic).filter(Boolean));
  const chromatic = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return [...tonicSet, ...chromatic.filter((note) => !tonicSet.has(note))];
}
