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
const noteLabelCheckbox = document.getElementById('show-note-labels');
const audioEnableButton = document.getElementById('audio-enable');
const midiOutputSelect = document.getElementById('midi-output-select');
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
  selectedOutput: 'synth'
};

const chordRoots = ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const chordQualities = ['maj7', 'm7', '7', 'm', 'maj', 'm7b5', 'dim', 'sus4', '6', '9'];

initializeApp();

function initializeApp() {
  if (!window.Tonal) {
    setRuntimeStatus('Analysis is unavailable because the Tonal library failed to load.');
    return;
  }

  setupChordBuilder();
  setupAudioControls();
  setRuntimeStatus('');
  addChordButton.addEventListener('click', addSelectedChord);
  noteLabelCheckbox.addEventListener('change', analyzeChords);
  sharedFretboard.addEventListener('click', onFretboardClick);

  if (!getFretboardApi()) {
    fretboardCaption.textContent =
      'Fretboard visualization is currently unavailable. Scale suggestions still work below.';
  }

  analyzeChords();
}

function setupChordBuilder() {
  chordRoots.forEach((root) => {
    const option = document.createElement('option');
    option.value = root;
    option.textContent = root;
    chordRootSelect.appendChild(option);
  });

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
  const chord = `${chordRootSelect.value}${chordQualitySelect.value}`;
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

function setupAudioControls() {
  audioEnableButton?.addEventListener('click', async () => {
    await ensureAudioReady();
    if (audioState.context?.state === 'suspended') await audioState.context.resume();
    setRuntimeStatus('Audio ready. Click a chord or fretboard note to hear it.');
  });

  midiOutputSelect?.addEventListener('change', () => {
    audioState.selectedOutput = midiOutputSelect.value;
    const label = audioState.selectedOutput === 'synth' ? 'Web Audio synth' : `MIDI: ${audioState.selectedOutput}`;
    setRuntimeStatus(`Playback output set to ${label}.`);
  });

  populateMidiOutputs();
}

async function populateMidiOutputs() {
  if (!navigator.requestMIDIAccess || !midiOutputSelect) return;

  try {
    audioState.midiAccess = await navigator.requestMIDIAccess();
    const outputs = [...audioState.midiAccess.outputs.values()];
    outputs.forEach((output) => {
      const option = document.createElement('option');
      option.value = output.id;
      option.textContent = output.name || `MIDI Output ${output.id}`;
      midiOutputSelect.appendChild(option);
    });
  } catch (error) {
    console.warn('MIDI unavailable:', error);
  }
}

async function ensureAudioReady() {
  if (audioState.context) return;
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
  const note = extractNoteFromFretboardTarget(event.target);
  if (!note) return;
  playNote(note, 0.6);
}

function extractNoteFromFretboardTarget(target) {
  if (!target) return null;
  const noteRegex = /([A-G](?:#|b)?)/;

  const candidates = [
    target?.dataset?.note,
    target.getAttribute?.('data-note'),
    target.getAttribute?.('aria-label'),
    target.textContent,
    target.parentElement?.querySelector?.('text')?.textContent,
    target.closest?.('g')?.querySelector?.('text')?.textContent
  ].filter(Boolean);

  for (const candidate of candidates) {
    const match = String(candidate).match(noteRegex);
    if (match) return match[1];
  }

  return null;
}

async function playChordNotes(notes = []) {
  await ensureAudioReady();
  notes.forEach((note, index) => playNote(note, 0.85, index * 0.04));
}

async function playNote(note, duration = 0.7, offset = 0) {
  await ensureAudioReady();
  if (!audioState.context || !note) return;

  const output = getSelectedMidiOutput();
  if (output) {
    playMidiNote(output, note, duration, offset);
    return;
  }

  const frequency = Tonal.Note.freq(`${note}4`) || Tonal.Note.freq(note);
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
  if (audioState.selectedOutput === 'synth' || !audioState.midiAccess) return null;
  return audioState.midiAccess.outputs.get(audioState.selectedOutput) || null;
}

function playMidiNote(output, note, duration = 0.7, offset = 0) {
  const midi = Tonal.Note.midi(`${note}4`) || Tonal.Note.midi(note);
  if (midi === null || midi === undefined) return;

  const nowMs = window.performance.now() + offset * 1000;
  output.send([0x90, midi, 110], nowMs);
  output.send([0x80, midi, 0], nowMs + duration * 1000);
}

function setRuntimeStatus(message) {
  if (!runtimeStatus) return;
  runtimeStatus.textContent = message;
}

function getFretboardApi() {
  if (window.fretboard?.Fretboard) return window.fretboard;
  return null;
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
    `Live map: ${focusScale.root} ${focusScale.type} over ${progression[0].symbol}`,
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
    h4.textContent = `${index + 1}. ${keyCandidate.label.toUpperCase()} · confidence ${(keyCandidate.score * 100).toFixed(0)}%`;
    block.appendChild(h4);

    const p = document.createElement('p');
    p.className = 'scale-meta';
    p.textContent = `Scale notes: ${keyCandidate.scale.join(' · ')}`;
    block.appendChild(p);

    const p2 = document.createElement('p');
    p2.className = 'summary-note';
    p2.textContent = `Coverage: notes ${(keyCandidate.noteCoverage * 100).toFixed(0)}% · chords ${(keyCandidate.chordCoverage * 100).toFixed(0)}%`;
    block.appendChild(p2);

    const functionMap = progression
      .map((chord) => `${chord.symbol}: ${romanForChord(chord, keyCandidate.scale, keyCandidate.root)}`)
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
      btn.textContent = `Show ${scale.name}`;
      btn.addEventListener('click', () => {
        renderSharedFretboard(scale.root, scale.type, progression[0], `${scale.name}: ${scale.reason}`);
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
      name: `${keyCandidate.root} ${type}`,
      reason: scaleFlavors[type] || 'Useful harmonic color.'
    }))
    .filter((candidate) => !Tonal.Scale.get(candidate.name).empty);
}

function renderPerChordInsights(progression, primaryKey) {
  progression.forEach((chord, index) => {
    const block = document.createElement('div');
    block.className = 'scale-block';

    const h4 = document.createElement('h4');
    h4.textContent = `Chord ${index + 1}: ${chord.symbol}`;
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
      btn.textContent = `Show ${scale.name}`;
      btn.addEventListener('click', () => {
        renderSharedFretboard(scale.root, scale.type, chord, `${chord.symbol} target: ${scale.reason}`);
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
    header.textContent = `${index + 1}. ${entry.chord} → ${entry.nextChord || 'end'}`;
    block.appendChild(header);

    const best = document.createElement('p');
    best.innerHTML = `<strong>Best note:</strong> ${entry.bestNote} <span class="summary-note">(${entry.reason})</span>`;
    block.appendChild(best);

    const alt = document.createElement('p');
    alt.className = 'summary-note';
    alt.textContent = `Alternatives: ${entry.alternatives.join(' · ')}`;
    block.appendChild(alt);

    const microLine = document.createElement('p');
    microLine.className = 'summary-note';
    microLine.textContent = `Micro-line: ${entry.microLine.join(' → ')}`;
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
  if (keySummary?.scale?.includes(note)) reasons.push(`inside ${keySummary.label}`);
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
  const fretboardApi = getFretboardApi();
  if (!fretboardApi) {
    fretboardCaption.textContent =
      'Cannot render fretboard right now because the fretboard library is unavailable.';
    return;
  }

  sharedFretboard.innerHTML = '';
  const board = new fretboardApi.Fretboard({
    el: sharedFretboard,
    fretCount: 15,
    showNotes: noteLabelCheckbox.checked
  });

  board.renderScale({ root, type });

  board
    .style({
      filter: ({ interval }) => interval === '1P',
      fill: '#ef4444',
      text: ({ note }) => note
    })
    .style({
      filter: ({ note }) => chord?.notes?.includes(note),
      fill: '#3b82f6',
      text: ({ note }) => note
    })
    .style({
      filter: ({ note }) => nextChordNotes.includes(note),
      fill: '#22c55e',
      text: ({ note }) => note
    })
    .render();

  fretboardCaption.textContent = captionText;
}

function getPossibleRoots(progression) {
  const tonicSet = new Set(progression.map((chord) => chord.tonic).filter(Boolean));
  const chromatic = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  return [...tonicSet, ...chromatic.filter((note) => !tonicSet.has(note))];
}
