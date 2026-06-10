/**
 * CLI du skill creole-tts-adaptation : donne, pour un texte créole, la sortie
 * exacte à envoyer à chaque moteur (Gemini TTS, ElevenLabs, fal.ai, Suno) et
 * celle qui reste affichée à l'utilisateur (sous-titres / script).
 *
 * AUTONOME : toutes les règles sont embarquées, aucun import externe. Le
 * script fonctionne dans n'importe quel projet avec bun (ou tsx/ts-node).
 * Dans OtomatikEdit, la source de vérité du pipeline reste
 * backend/src/services/generation/creole-tts.service.ts : si vous modifiez
 * les règles là-bas, répercutez-les ici (et inversement).
 *
 * Usage :
 *   bun adapt-creole.ts "Mwen fatige anpil, annale lakay nou."
 *   echo "Bondye bon" | bun adapt-creole.ts
 *   bun adapt-creole.ts --force "Mwen fatige."   # force (texte court non détecté)
 *   bun adapt-creole.ts --json "..."             # sortie JSON programmatique
 */

// ---------------------------------------------------------------------------
// Détection : marqueurs distinctifs du Kreyòl (voir SKILL.md pour le seuil).
// ---------------------------------------------------------------------------
const STRONG_MARKERS = [
  'mwen', 'anpil', 'kreyòl', 'poukisa', 'paske', 'tankou', 'konsa', 'kounye',
  'jodi', 'ayiti', 'ayisyen', 'timoun', 'lakay', 'bondye', 'zanmi', 'bagay',
  'kijan', 'eske', 'èske', 'avèk', 'kote', 'anvan', 'apre', 'pandan', 'fanmi',
  'renmen', 'jezi', 'istwa', 'gade', 'sonje', 'kenbe', 'manje', 'lavi',
];
const WEAK_MARKERS = [
  'nan', 'pou', 'ak', 'yo', 'li', 'nou', 'ki', 'sa', 'se', 'te', 'ap', 'pral',
  'fè', 'gen', 'pa', 'yon', 'lè', 'byen', 'moun', 'fin',
];

export function looksLikeHaitianCreole(text: string): boolean {
  const t = ` ${String(text).toLowerCase()} `;
  const hits = (words: string[]) =>
    words.filter((w) => new RegExp(`(^|[^a-zà-ÿ])${w}([^a-zà-ÿ]|$)`, 'i').test(t)).length;
  const strong = hits(STRONG_MARKERS);
  const weak = hits(WEAK_MARKERS);
  return (strong >= 1 && strong + weak >= 4) || strong >= 3;
}

// ---------------------------------------------------------------------------
// Mots que les voix LLM "corrigent" en mots français (normalisation lexicale,
// constatée en production) : remplacés par des NON-mots aux mêmes sons.
// ---------------------------------------------------------------------------
const WORD_OVERRIDES: Record<string, string> = {
  bib: 'bibe',
  labib: 'la-bibe',
  bondye: 'bon-dyé',
  istwa: 'iss-toua',
  listwa: 'liss-toua',
  kreyatè: 'kré-ya-tè',
  kreyate: 'kré-ya-té',
  gade: 'ga-dé',
  kwè: 'kouè',
  kwe: 'kouè',
  jezi: 'jé-zi',
  lapriyè: 'la-pri-yè',
  lapriye: 'la-pri-yé',
  priyè: 'pri-yè',
  priye: 'pri-yé',
  // Reported 2026-06-10: lidè -> "leader", premye -> "premier",
  // kanpe -> "kanpeu", revolisyon -> "révolution".
  lidè: 'li-dè',
  premye: 'pré-myé',
  kanpe: 'kan-pé',
  revolisyon: 'ré-vo-li-syon',
  kontinye: 'kon-ti-nyé', // disait « continuer »
  // Préventif, mêmes classes que les signalements.
  // Classe r supprimé (le créole écrit w ou rien là où le français a un r) :
  libète: 'li-bè-té',     // risque « liberté »
  pati: 'pa-ti',          // risque « parti(r) »
  pwoblèm: 'pwo-blèm',    // risque « problème »
  pwofesè: 'pwo-fé-sè',   // risque « professeur »
  pwogram: 'pwo-gram',    // risque « programme »
  pwojè: 'pwo-jè',        // risque « projet »
  pwomès: 'pwo-mèss',     // risque « promesse »
  koulè: 'kou-lè',        // risque « couleur »
  pawòl: 'pa-wol',        // risque « parole »
  glwa: 'gloua',          // risque « gloire »
  pastè: 'pas-tè',        // risque « pasteur »
  mirak: 'mi-rak',        // risque « miracle »
  // Classe u français [y] -> i créole :
  jistis: 'jiss-tiss',    // risque « justice »
  mizik: 'mi-zik',        // risque « musique »
  minit: 'mi-nit',        // risque « minute »
  kilti: 'kil-ti',        // risque « culture »
  natir: 'na-tir',        // risque « nature »
  plis: 'pliss',          // risque « plus »
  // Classe verbes en -e proches d'un infinitif français :
  mache: 'ma-ché',        // risque « marcher »
  rete: 'ré-té',          // risque « rester »
  pèdi: 'pè-di',          // risque « perdu »
  levanjil: 'lé-van-jil', // risque « évangile »
  // « pòt » deviendrait « pot » (lu [po] en français) via la règle ò -> o :
  pòt: 'potte',
  // Troisième vague signalée 2026-06-10 (le moteur disait le mot français) :
  enfliyanse: 'in-fli-yan-sé', // « influencer »
  pèp: 'pèpe',                 // « peuple » (le e final muet garde [pèp])
  sou: 'soue',                 // « sur » (« soue » se lit [sou])
  reyini: 'ré-yi-ni',          // « réuni »
  mizilman: 'mi-zil-man',      // « musulman »
  pataje: 'pa-ta-jé',          // « partager »
  jidayis: 'ji-da-yiss',       // « judaïste »
  fanmi: 'fan-mi',             // « famille »
  sensè: 'sin-sè',             // « sincère »
  sense: 'sin-sé',
  enpòtans: 'in-pò-tans',      // « importance »
  enpotans: 'in-pò-tans',
  lanmou: 'lan-mou',           // « l'amour »
  cheche: 'ché-ché',           // « chercher »
  chache: 'cha-ché',
  sèvis: 'sè-viss',            // « service »
  sevis: 'sé-viss',
  ini: 'i-ni',                 // « uni »
  plizyè: 'pli-zyè',           // « plusieurs »
  plizye: 'pli-zyé',
  valè: 'va-lè',               // « valeur »
  vale: 'va-lé',
  viv: 'vive',                 // « vivre » (« vive » se prononce [viv])
  komen: 'ko-min',             // « commun »
};

// ---------------------------------------------------------------------------
// Règles de graphème IPN -> orthographe que le français lit comme du Kreyòl.
// L'ORDRE COMPTE (voir SKILL.md, section "Ordre d'application des règles").
// ---------------------------------------------------------------------------
const V = 'aeiouéèàâêîôûò';

function applyGraphemeRules(input: string): string {
  let t = input;
  // 1. "enn" = e oral + n ("venn" -> "vèn"), avant la règle nasale.
  t = t.replace(/enn/g, 'èn').replace(/Enn/g, 'Èn');
  // 2. "e" = [e] (é) SAUF s'il forme le "en" nasal (n + consonne ou fin).
  t = t.replace(new RegExp(`e(?!n(?![${V}]))`, 'g'), 'é');
  t = t.replace(new RegExp(`E(?!n(?![${V}]))`, 'g'), 'É');
  // 3. "en" nasal restant = [ɛ̃] : le français lit "in" juste ("mwen" -> "mwin").
  t = t.replace(new RegExp(`en(?![${V}])`, 'g'), 'in');
  t = t.replace(new RegExp(`En(?![${V}])`, 'g'), 'In');
  // 4. "g" toujours dur : "gu" devant e/i/é/è ("gid" -> "guid").
  t = t.replace(/g(?=[ieéè])/g, 'gu').replace(/G(?=[ieéè])/g, 'Gu');
  // 5. "s" entre voyelles reste [s] : doubler ("présé" -> "préssé").
  t = t.replace(new RegExp(`([${V}])s(?=[${V}])`, 'gi'), '$1ss');
  // 6. "ò" = [ɔ] : un "o" simple est plus sûr pour un moteur français.
  t = t.replace(/ò/g, 'o').replace(/Ò/g, 'O');
  return t;
}

function matchCase(original: string, replacement: string): string {
  if (original.length && original[0] === original[0].toUpperCase() && original[0] !== original[0].toLowerCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

export function adaptCreoleTextForTts(input: string): string {
  return String(input)
    .split(/(\s+)/)
    .map((token) => {
      if (!token || /^\s+$/.test(token)) return token;
      const m = token.match(/^([^A-Za-zÀ-ÿ]*)([A-Za-zÀ-ÿ'’-]*)([^A-Za-zÀ-ÿ]*)$/);
      if (!m) return applyGraphemeRules(token);
      const [, lead, core, trail] = m;
      const override = core ? WORD_OVERRIDES[core.toLowerCase()] : undefined;
      const replaced = override ? matchCase(core, override) : applyGraphemeRules(core);
      return `${lead}${replaced}${trail}`;
    })
    .join('');
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8').trim();
}

const args = process.argv.slice(2);
const force = args.includes('--force');
const asJson = args.includes('--json');
const positional = args.filter((a) => !a.startsWith('--'));

const text = positional.length ? positional.join(' ') : await readStdin();
if (!text) {
  console.error('Usage: bun adapt-creole.ts [--force] [--json] "tèks kreyòl la"');
  process.exit(1);
}

const detected = looksLikeHaitianCreole(text);
// Un texte court peut rater la détection : --force applique quand même
// (c'est ce que fait le pipeline quand le script COMPLET est créole).
const adapted = force || detected ? adaptCreoleTextForTts(text) : text;

const result = {
  original: text,
  detectedCreole: detected,
  forced: force,
  engines: {
    // Toutes les voix parlées reçoivent la même réécriture phonétique.
    geminiTts: adapted,
    elevenlabs: adapted,
    falaiVoice: adapted,
    // Suno : paroles CHANTÉES (prompt en mode chanson) = même réécriture.
    // Le champ style (description d'ambiance) ne doit PAS être adapté.
    sunoLyrics: adapted,
    // Ce qui reste visible par l'utilisateur, jamais modifié.
    subtitlesAndDisplay: text,
  },
};

if (asJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Texte original          : ${result.original}`);
  console.log(`Détecté créole          : ${detected}${force ? ' (adaptation forcée)' : ''}`);
  console.log('');
  console.log(`Gemini TTS              : ${result.engines.geminiTts}`);
  console.log(`ElevenLabs              : ${result.engines.elevenlabs}`);
  console.log(`fal.ai (voix)           : ${result.engines.falaiVoice}`);
  console.log(`Suno (paroles chantées) : ${result.engines.sunoLyrics}`);
  console.log(`Sous-titres / affichage : ${result.engines.subtitlesAndDisplay}`);
}
