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

const analyzeButton = document.getElementById('analyze');
const noteLabelCheckbox = document.getElementById('show-note-labels');
const runtimeStatus = document.getElementById('runtime-status');
const wholeOutput = document.getElementById('whole-song');
const perOutput = document.getElementById('per-chord');
const sharedFretboard = document.getElementById('shared-fretboard');
const fretboardCaption = document.getElementById('fretboard-caption');

initializeApp();

function initializeApp() {
  if (!window.Tonal) {
    analyzeButton.disabled = true;
    setRuntimeStatus('Analysis is unavailable because the Tonal library failed to load.');
    return;
  }

  analyzeButton.disabled = false;
  setRuntimeStatus('');
  analyzeButton.addEventListener('click', analyzeChords);

  if (!getFretboardApi()) {
    fretboardCaption.textContent =
      'Fretboard visualization is currently unavailable. Scale suggestions still work below.';
  }
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
  const input = document.getElementById('chords').value.trim();
  if (!input) {
    alert('Please enter a progression first.');
    return;
  }

  const progression = tokenizeProgression(input)
    .map((token) => Tonal.Chord.get(token))
    .filter((chord) => !chord.empty);

  if (!progression.length) {
    alert('No valid chords found. Try values like Am7 D7 Gmaj7.');
    return;
  }

  wholeOutput.innerHTML = '<h2>Whole Song Musical Direction</h2>';
  perOutput.innerHTML = '<h2>Per Chord Strategy</h2>';

  const keyCandidates = detectKeyCenters(progression);
  const keySummary = keyCandidates[0];

  renderWholeSongInsights(progression, keyCandidates);
  renderPerChordInsights(progression, keySummary);
}

function tokenizeProgression(input) {
  return input
    .replace(/[\n\r]/g, ' ')
    .replace(/[|,;/]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
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
      const score = noteCoverage * 0.6 + chordCoverage * 0.4 + tonicBonus;

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

function renderSharedFretboard(root, type, chord, captionText) {
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
      fill: '#dc2626',
      text: ({ note }) => note
    })
    .style({
      filter: ({ note }) => chord?.notes?.includes(note),
      fill: '#2563eb',
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
