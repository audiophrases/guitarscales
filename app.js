// app.js - Enhanced Core Logic for Guitar Scales App

// Flavor descriptions map (concise, non-expert)
const scaleFlavors = {
  major: 'Bright and happy, uplifting vibe.',
  ionian: 'Classic major, joyful and resolved.',
  minor: 'Sad and introspective, emotional depth.',
  aeolian: 'Natural minor, melancholic and moody.',
  dorian: 'Bluesy with a minor feel, groovy and soulful.',
  phrygian: 'Exotic and tense, Spanish/flamenco flair.',
  lydian: 'Dreamy and bright, ethereal and floating.',
  mixolydian: 'Blues-rock dominant, funky and laid-back.',
  locrian: 'Dark and unstable, tense and dissonant.',
  'major pentatonic': 'Cheerful and simple, country/rock staple.',
  'minor pentatonic': 'Bluesy and versatile, rock solo essential.',
  blues: 'Soulful and gritty, expressive bends.',
  'harmonic minor': 'Mysterious and dramatic, metal/classical edge.',
  'melodic minor': 'Jazz smooth, ascending brightness.',
  arabic: 'Arabesque exotic, Middle Eastern tension and flair' // Hijaz-like for "arabesque"
  // Add more if needed, e.g., 'whole tone': 'Dreamy and ambiguous, sci-fi feel.'
};

// Event listener for analyze button
document.getElementById('analyze').addEventListener('click', analyzeChords);

function analyzeChords() {
  const input = document.getElementById('chords').value.trim();
  if (!input) {
    alert('Please enter chords!');
    return;
  }

  // Parse chords
  const chordStrs = input.split(/\s+/);
  const progression = chordStrs.map((str) => Tonal.Chord.get(str)).filter((chord) => !chord.empty);
  if (progression.length === 0) {
    alert('No valid chords found! Use formats like "Am", "C", "Gmaj7".');
    return;
  }

  // Clear previous outputs
  const wholeOutput = document.getElementById('whole-song');
  const perOutput = document.getElementById('per-chord');
  wholeOutput.innerHTML = '<h2>Whole Song Scales</h2>';
  perOutput.innerHTML = '<h2>Per Chord/Part Scales</h2>';

  // Whole song analysis (enhanced for more scales/flavors)
  const possibleScales = detectProgressionScales(progression);
  if (possibleScales.length === 0) {
    wholeOutput.innerHTML +=
      '<p>No strong scale fits found for the whole progression. Try per-chord suggestions.</p>';
  } else {
    possibleScales.slice(0, 5).forEach((scaleInfo) => {
      // Limit to top 5 diverse flavors
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = `${scaleInfo.name} (Fit: ${(scaleInfo.score * 100).toFixed(0)}%)`;
      details.appendChild(summary);
      const flavorP = document.createElement('p');
      flavorP.textContent = scaleFlavors[scaleInfo.type] || 'Unique flavor.';
      details.appendChild(flavorP);
      wholeOutput.appendChild(details);

      const div = document.createElement('div');
      div.className = 'fretboard-container';
      wholeOutput.appendChild(div);

      const board = new fretboard.Fretboard({ el: div, fretCount: 15, showNotes: true });
      board.renderScale({ type: scaleInfo.type, root: scaleInfo.root });
      board
        .style({
          filter: ({ interval }) => interval === '1P', // Root notes
          fill: 'red',
          text: ({ note }) => note
        })
        .render();
    });
  }

  // Per chord analysis (with flavors)
  progression.forEach((chord, index) => {
    const h3 = document.createElement('h3');
    h3.textContent = `Chord ${index + 1}: ${chord.name}`;
    perOutput.appendChild(h3);

    const scales = getFittingScales(chord);
    if (scales.length === 0) {
      perOutput.innerHTML += '<p>No common scales found for this chord.</p>';
      return;
    }

    const ul = document.createElement('ul');
    scales.slice(0, 7).forEach((scaleName) => {
      // Limit to 7 for variety without clutter
      const [, ...typeParts] = scaleName.split(' ');
      const type = typeParts.join(' ');
      const li = document.createElement('li');
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = scaleName;
      details.appendChild(summary);
      const flavorP = document.createElement('p');
      flavorP.textContent = scaleFlavors[type] || 'Unique flavor.';
      details.appendChild(flavorP);
      li.appendChild(details);
      ul.appendChild(li);
    });
    perOutput.appendChild(ul);

    // Render fretboard for the primary scale (best flavor fit)
    const primaryScale = scales[0];
    const [root, ...typeParts] = primaryScale.split(' ');
    const type = typeParts.join(' ');

    const div = document.createElement('div');
    div.className = 'fretboard-container';
    perOutput.appendChild(div);

    const board = new fretboard.Fretboard({ el: div, fretCount: 15, showNotes: true });
    board.renderScale({ type, root });
    board
      .style({
        filter: ({ note }) => chord.notes.includes(note), // Highlight chord notes in blue
        fill: 'blue',
        text: ({ note }) => note
      })
      .render();
  });
}

// Core Music Logic: Detect fitting scales for the whole progression (enhanced)
function detectProgressionScales(progression) {
  const roots = getPossibleRoots(progression); // Prioritize progression tonics
  const scaleTypes = Object.keys(scaleFlavors); // All modes/flavors
  const results = [];
  const allNotes = [...new Set(progression.flatMap((chord) => chord.notes))]; // Union of all notes

  roots.forEach((root) => {
    scaleTypes.forEach((type) => {
      const scaleName = `${root} ${type}`;
      const scale = Tonal.Scale.get(scaleName);
      if (scale.empty) return;

      // Check if all progression notes are in scale
      if (!allNotes.every((note) => scale.notes.includes(note))) return;

      let score = 0;
      progression.forEach((chord) => {
        if (chord.notes.every((note) => scale.notes.includes(note))) score++;
      });
      score /= progression.length;

      if (score >= 0.8) {
        // Higher threshold for whole-song accuracy
        results.push({ name: scaleName, root, type, score });
      }
    });
  });

  // Sort by score desc, then diversity (group commons first)
  const commonTypes = ['major', 'minor', 'major pentatonic', 'minor pentatonic', 'blues'];
  return results.sort((a, b) => {
    const aBonus = roots[0] === a.root ? 0.1 : 0; // Bonus for matching main tonic
    const bBonus = roots[0] === b.root ? 0.1 : 0;
    const typeOrderA = commonTypes.includes(a.type) ? -1 : 1;
    const typeOrderB = commonTypes.includes(b.type) ? -1 : 1;
    return b.score + bBonus - (a.score + aBonus) || typeOrderA - typeOrderB;
  });
}

// Helper: Get possible roots (progression tonics first, then all)
function getPossibleRoots(progression) {
  const tonicSet = new Set(progression.map((chord) => chord.tonic).filter(Boolean));
  const allRoots = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  return [...tonicSet, ...allRoots.filter((r) => !tonicSet.has(r))];
}

// Core Music Logic: Get fitting scales for a single chord (expanded)
function getFittingScales(chord) {
  if (!chord.tonic) return [];

  const scaleTypes = Object.keys(scaleFlavors);

  return scaleTypes
    .map((type) => {
      const scaleName = `${chord.tonic} ${type}`;
      const scale = Tonal.Scale.get(scaleName);
      const fits = !scale.empty && chord.notes.every((note) => scale.notes.includes(note));
      return fits ? scaleName : null;
    })
    .filter(Boolean)
    .sort((a, b) => {
      // Sort for flavor diversity: commons first
      const commonTypes = ['major', 'minor', 'major pentatonic', 'minor pentatonic', 'blues'];
      const aType = a.split(' ').slice(1).join(' ');
      const bType = b.split(' ').slice(1).join(' ');
      const aCommon = commonTypes.includes(aType) ? -1 : 1;
      const bCommon = commonTypes.includes(bType) ? -1 : 1;
      return aCommon - bCommon || a.localeCompare(b);
    });
}
