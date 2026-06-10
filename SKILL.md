---
name: creole-tts-adaptation
description: >
  Faire prononcer correctement le créole haïtien (Kreyòl ayisyen, orthographe
  IPN) par un moteur de synthèse vocale (TTS) calibré pour le français ou
  l'anglais (Gemini TTS, ElevenLabs, fal.ai). Utiliser ce skill pour : corriger
  un mot créole mal prononcé par la voix, ajouter un mot au dictionnaire
  d'exceptions, comprendre ou modifier les règles de réécriture phonétique,
  diagnostiquer une narration créole lue avec un accent français, ou porter ce
  système vers un autre projet. Déclencheurs : "prononciation créole",
  "kreyòl", "la voix dit X au lieu de Y", "mot créole mal lu", "TTS créole".
---

# Adaptation phonétique du créole haïtien pour la synthèse vocale

## Le problème en une phrase

Aucun moteur TTS grand public ne connaît le créole haïtien : il lit le texte
avec les règles du français (ou de l'anglais), ce qui massacre les voyelles,
et les moteurs à base de LLM vont plus loin en remplaçant carrément les mots
créoles par leurs cousins français. La solution est de réécrire le texte,
juste avant l'appel TTS, dans une orthographe que le moteur prononce comme un
locuteur créole le ferait, sans jamais toucher au texte affiché ni aux
sous-titres.

## Les DEUX modes de défaillance (à bien distinguer)

### 1. Mauvaise lecture des graphèmes (règles génériques)

Le moteur applique la phonétique française à l'orthographe IPN :

| Écrit (IPN) | Le moteur dit | Attendu | Cause |
|---|---|---|---|
| repoze | reupozeu | répozé | « e » français = muet/[ə], « e » créole = [e] |
| manje | manjeu | manjé | idem |
| mwen | mouan | mwin | « en » français = [ɑ̃], « en » créole = [ɛ̃] |
| genyen | jenyen | guinyin | « g » français mou devant e/i, « g » créole toujours dur |
| prese | prézé | préssé | « s » intervocalique français = [z], créole = [s] |

Se corrige par des règles de réécriture mécaniques (voir plus bas).

### 2. Normalisation lexicale (moteurs LLM : Gemini TTS, etc.)

Le moteur ne lit pas les lettres : il reconnaît un mot proche du français et
prononce LE MOT FRANÇAIS. Tous ces cas ont été constatés en production :

| Écrit (IPN) | Le moteur dit | Attendu |
|---|---|---|
| Bib | « Bible » | bib |
| Bondye | « Bon Dieu » | bon-dyé |
| istwa | « histoire » (!) | iss-twa |
| kreyatè | « créateur » | kré-ya-tè |
| gade | « garder » | ga-dé |
| kwè | « croire » | kwè |
| Jezi | « Jésus » | jé-zi |
| lapriyè | « la prière » | la-pri-yè |

**Aucune règle de graphie ne gagne contre ça** tant que le mot reste
reconnaissable. La parade : remplacer ces mots par des NON-MOTS français
portant les mêmes sons (« Bibe », « Bon-dyé », « iss-toua », « Jé-zi »).
Le moteur n'a plus rien à normaliser et lit ce qui est écrit. Le tiret
aide : il casse la reconnaissance lexicale et se lit de façon fluide.

## Référence linguistique : graphème IPN → son → réécriture sûre

Orthographe officielle IPN (adoptée en 1979, 32 graphèmes, AUCUNE lettre
muette, un son = un signe). Table vérifiée contre Wikipédia (Prononciation du
créole haïtien) et creole101.com.

### Voyelles orales

| IPN | API | Exemple | Le français lit | Réécriture sûre |
|---|---|---|---|---|
| a | [a] | papa | [a] correct | inchangé |
| e | [e] | manje | [ə]/muet FAUX | **é** (manjé) |
| è | [ɛ] | fèt | [ɛ] correct | inchangé |
| i | [i] | lavi | [i] correct | inchangé |
| o | [o] | zo | [o] correct | inchangé |
| ò | [ɔ] | fò | accent inconnu, lecture aléatoire | **o** (fo) |
| ou | [u] | moun | [u] correct | inchangé |

### Voyelles nasales

| IPN | API | Exemple | Le français lit | Réécriture sûre |
|---|---|---|---|---|
| an | [ã] | anpil | [ã] correct | inchangé |
| en | [ɛ̃] | mwen | [ɑ̃] FAUX | **in** (mwin) |
| on | [ɔ̃] | bon | [ɔ̃] correct | inchangé |
| oun | [ũ] | youn | [un] approximatif | inchangé (limitation connue) |

**Règle de contexte cruciale** : an/en/on sont nasales devant une consonne ou
en fin de mot, mais redeviennent voyelle orale + n devant une voyelle
(« ménaj » = [menaʒ]). Le doublement « ann/enn/onn » force aussi la lecture
orale + n (« venn » = [vɛn]), et l'accent grave « àn/èn/òn » sépare la voyelle
du n (« Antwàn » = Antoine). Les règles de réécriture doivent respecter cet
ordre : traiter « enn » AVANT « en », et ne convertir « e » en « é » que s'il
ne forme pas un « en » nasal.

### Consonnes et semi-voyelles

| IPN | API | Piège | Réécriture sûre |
|---|---|---|---|
| g | [g] toujours dur | français : mou devant e/i (gide → [ʒid]) | **gu** devant i/e/é/è (guid) |
| s | [s] toujours sourd | français : [z] entre voyelles (prese → [prəze]) | **ss** entre voyelles (préssé) |
| j | [ʒ] | correct en français | inchangé |
| ch | [ʃ] | correct | inchangé |
| r | [ɣ]~[w] (jamais devant o/ò/on/ou, où le créole écrit w) | le r français [ʁ] est proche, acceptable | inchangé |
| w | [w] | correct (oui, ouate) | inchangé |
| y | [j] | correct devant voyelle | inchangé |
| ui | [ɥi] | correct (huit) | inchangé |
| ng | [ŋ] final (rare) | français : [ŋg] | inchangé (limitation) |
| k, b, d, f, l, m, n, p, t, v, z | comme en français | aucun | inchangé |

### Ordre d'application des règles (IMPORTANT, elles interagissent)

1. `enn` → `èn` (oral + n, avant la règle nasale)
2. `e` → `é` SAUF si le e forme un « en » nasal (n suivi de consonne ou fin de mot)
3. `en` nasal restant → `in`
4. `g` devant i/e/é/è → `gu` (après les transformations de voyelles)
5. `s` simple entre voyelles → `ss` (les classes de voyelles incluent é/è)
6. `ò` → `o`

Vérifications croisées qui doivent rester vraies : repoze → répozé,
manje → manjé, mwen → mwin, kenbe → kinbé, genyen → guinyin, menaj → ménaj,
venn → vèn, prese → préssé, fò → fo, fatige → fatigué (vrai mot français MAIS
prononcé identiquement : inoffensif).

## Le dictionnaire d'exceptions (normalisation lexicale)

Les mots que le LLM francise sont remplacés AVANT les règles de graphème, mot
à mot (découpage sur les espaces, ponctuation préservée, majuscule initiale
reportée). Les valeurs sont FINALES : les règles de graphème ne les
retraitent pas.

Dictionnaire constaté en production (à étendre au fil des signalements) :

```ts
const WORD_OVERRIDES: Record<string, string> = {
  bib: 'bibe',          labib: 'la-bibe',
  bondye: 'bon-dyé',
  istwa: 'iss-toua',    listwa: 'liss-toua',
  kreyatè: 'kré-ya-tè', kreyate: 'kré-ya-té',
  gade: 'ga-dé',
  kwè: 'kouè',          kwe: 'kouè',
  jezi: 'jé-zi',
  lapriyè: 'la-pri-yè', lapriye: 'la-pri-yé',
  priyè: 'pri-yè',      priye: 'pri-yé',
  lidè: 'li-dè',        // disait « leader »
  premye: 'pré-myé',    // disait « premier »
  kanpe: 'kan-pé',      // disait « kanpeu »
  revolisyon: 'ré-vo-li-syon', // disait « révolution »
  kontinye: 'kon-ti-nyé',      // disait « continuer »
  // ... plus les classes préventives (r supprimé, u->i, verbes en -e) et la
  // troisième vague signalée (enfliyanse, pèp, sou, reyini, mizilman, pataje,
  // jidayis, fanmi, sensè, enpòtans, lanmou, cheche, sèvis, ini, plizyè,
  // valè, viv, komen). Liste complète et à jour dans scripts/adapt-creole.ts
  // et creole-tts.service.ts.
};
```

### Les classes de mots à risque (pour patcher PRÉVENTIVEMENT)

Les signalements suivent des patrons prévisibles. Quand un mot d'une de ces
classes apparaît dans un script, vérifiez-le avant l'utilisateur :

1. **r supprimé** : le créole écrit « w » ou rien là où le français a un r
   (pwoblèm/problème, libète/liberté, koulè/couleur, pawòl/parole,
   glwa/gloire, pati/partir). Le LLM restaure le mot français AVEC le r.
2. **u français [y] devenu i créole** (mizik/musique, jistis/justice,
   minit/minute, kilti/culture, plis/plus) : le LLM remet le [y].
3. **Verbes en -e proches d'un infinitif en -er** (gade/garder,
   mache/marcher, rete/rester, kanpe/camper, kontinye/continuer).
4. **Noms propres et lexique religieux** (Jezi, Bondye, Bib, levanjil,
   pastè) : les plus fortement normalisés.
5. **Mots courts devenant un mot français à la sortie des règles** :
   « pòt » devient « pot » (lu [po]) via la règle ò vers o ; forcer « potte ».

Les entrées préventives de ces classes sont déjà dans le dictionnaire du
code et du CLI. Cas inoffensifs à NE PAS ajouter : quand le mot français
cousin se prononce pareil (kite/quitter, ede/aider, montre/montré,
chante/chanté, vwayaj/voyage, liberasyon/libération), la normalisation ne
s'entend pas.

### Comment forger une bonne valeur de remplacement

1. Partir de la prononciation API du mot créole.
2. L'écrire avec des graphèmes français univoques : é [e], è [ɛ], in [ɛ̃],
   an [ã], on [ɔ̃], ou [u], oua [wa], gu+voyelle [g], ss [s].
3. Vérifier que le résultat N'EST PAS un mot français existant (sinon le
   moteur peut le re-normaliser). « fatigué » est l'exception acceptable :
   c'est un mot français qui se prononce exactement comme le créole.
4. Si le mot reste trop proche d'un lemme français (noms propres surtout :
   Jezi/Jésus), le découper avec des tirets aux frontières de syllabes :
   « Jé-zi », « Bon-dyé », « iss-toua ». Le tiret casse la reconnaissance
   sans hacher la lecture.
5. Tester à l'oreille (voir protocole plus bas).

## Détection : quand appliquer l'adaptation

Heuristique à deux niveaux sur le texte (insensible à la casse, frontières de
mots) :

- **Marqueurs forts** (n'existent ni en français ni en anglais) : mwen, anpil,
  kreyòl, poukisa, paske, tankou, konsa, kounye, jodi, ayiti, ayisyen, timoun,
  lakay, bondye, zanmi, bagay, kijan, eske/èske, avèk, kote, anvan, apre,
  pandan, fanmi, renmen, jezi, istwa, gade, sonje, kenbe, manje, lavi.
- **Marqueurs faibles** (fréquents mais ambigus) : nan, pou, ak, yo, li, nou,
  ki, sa, se, te, ap, pral, fè, gen, pa, yon, lè, byen, moun, fin.
- **Seuil** : créole si (≥1 fort ET forts+faibles ≥4) OU ≥3 forts. Calibré
  pour ne JAMAIS matcher du français ou de l'anglais.

**Piège vécu en production** : si la narration est synthétisée scène par
scène, ne JAMAIS détecter ligne par ligne. Une ligne courte (« Mwen
fatige. ») n'a pas assez de marqueurs et partirait sans adaptation pendant
que ses voisines sont adaptées : prononciation incohérente entre scènes.
**Décider une seule fois sur le script complet** (toutes les narrations
jointes), puis appliquer la décision à chaque ligne.

## Règles d'architecture (invariantes, quel que soit le projet)

1. **L'adaptation s'applique au point d'appel TTS, jamais en amont.** Le texte
   adapté ne doit JAMAIS fuiter vers : les sous-titres (SRT/ASS), le script
   affiché à l'utilisateur, la base de données, les logs métier. L'utilisateur
   voit toujours son orthographe IPN authentique.
2. **Tous les moteurs reçoivent le texte adapté** (Gemini, ElevenLabs,
   fal.ai). Ne faire d'exception que pour un modèle de voix NATIVEMENT créole,
   et seulement après l'avoir vérifié à l'oreille.
3. **Le texte utilisateur n'est jamais « corrigé » orthographiquement** : on
   adapte la prononciation de ce qui est écrit, fautes comprises. La fidélité
   au texte fourni prime.
4. **Logger l'application** (texte original tronqué → texte adapté tronqué) :
   c'est la seule preuve, dans les logs d'une génération, de ce que le moteur
   a réellement reçu.
5. **Timeout dur sur chaque appel TTS** (120 s) : un appel suspendu ne doit
   jamais geler une génération, surtout en synthèse scène par scène.

## Conversion directe : un texte entre, la sortie par moteur sort

Le skill embarque un CLI autonome (aucune dépendance, fonctionne dans
n'importe quel projet avec bun) : `scripts/adapt-creole.ts`.

```bash
bun scripts/adapt-creole.ts "Mwen fatige anpil, annale lakay nou."
echo "Bondye bon" | bun scripts/adapt-creole.ts
bun scripts/adapt-creole.ts --force "Mwen fatige."   # texte court : forcer
bun scripts/adapt-creole.ts --json "..."             # sortie programmatique
```

Sortie : le texte exact à envoyer à chaque moteur.

| Destination | Quoi envoyer |
|---|---|
| Gemini TTS | texte adapté |
| ElevenLabs | texte adapté |
| fal.ai (modèles voix) | texte adapté |
| Suno, paroles CHANTÉES (mode chanson) | texte adapté |
| Suno, champ `style` (description d'ambiance) | texte ORIGINAL (ne pas adapter) |
| Sous-titres, SRT/ASS, affichage utilisateur | texte ORIGINAL (jamais adapté) |

Quand Claude reçoit un texte créole avec la question « comment la voix va le
lire ? » ou « donne-moi la sortie pour le moteur X », exécuter ce script et
présenter le tableau. Pour un texte court non détecté mais manifestement
créole, relancer avec `--force`.

Le CLI est un instantané autonome des règles : la source de vérité du
pipeline reste `creole-tts.service.ts` ; toute modification doit être
répercutée des deux côtés (les deux ont des tests).

## Implémentation de référence dans CE dépôt

| Quoi | Où |
|---|---|
| Détecteur + règles + dictionnaire | `backend/src/services/generation/creole-tts.service.ts` |
| Tests unitaires (15+, mots réels signalés) | `backend/src/services/generation/creole-tts.test.ts` |
| Point d'appel principal (narration par scène + bloc unique, décision plein-script) | `backend/src/services/generation/structured-generation.service.ts` (synthesizeVoiceBuffer) |
| Régénération d'un audio (playground) | `backend/src/services/generation/scene-ops.service.ts` |
| Ancien pipeline | `backend/src/services/generation/ai-pipeline.service.ts` |
| Génération du texte créole authentique (LLM écrit mal le créole : traduire avec NLLB) | `backend/src/services/nllb-translate.service.ts` (fra_Latn → hat_Latn, gated par NLLB_MODEL_DIR) |
| Transcription d'audio créole (Whisper standard massacre le créole) | `backend/src/services/whisper.service.ts` (fine-tune « oswald », gated par WHISPER_CREOLE_MODEL_DIR) |

API du module :

- `looksLikeHaitianCreole(text)` : détecteur (à appeler sur le script COMPLET).
- `adaptCreoleTextForTts(text)` : transformation inconditionnelle.
- `adaptVoiceTextForTts(text)` : détecte puis transforme (pour un texte isolé).

## Workflow : corriger un mot signalé par un utilisateur

Format de signalement à demander : **mot écrit, ce que la voix dit, ce
qu'elle devrait dire** (ex. « gade, elle dit garder, attendu ga-dé »).

1. Reproduire : `bun -e "import { adaptVoiceTextForTts } from './src/services/generation/creole-tts.service.ts'; console.log(adaptVoiceTextForTts('<phrase contenant le mot>'))"`
2. Si le mot sort déjà transformé mais que la voix le francise quand même :
   c'est de la normalisation lexicale → ajouter une entrée au
   `WORD_OVERRIDES` (méthode de forge ci-dessus). Penser aux variantes
   (avec/sans accent : kwè/kwe, formes agglutinées : lapriyè/priyè).
3. Si le mot sort non transformé : vérifier la détection (script complet ?),
   puis les règles de graphème.
4. Ajouter le cas dans `creole-tts.test.ts` (il y a un bloc dédié aux mots
   signalés) et lancer `bunx vitest run src/services/generation/creole-tts.test.ts`.
5. Vérifier qu'aucun test existant ne casse (les phrases de référence du
   bloc « full sentence » sont le filet de sécurité).
6. Déployer, faire réécouter, itérer. Chaque mot corrigé l'est pour toutes
   les vidéos futures.

## Limitations connues (assumées, à documenter, pas à « réparer » à l'aveugle)

- **« in » oral vs nasal** : « machin » [maʃin] (oral) et le « in » issu de la
  réécriture du nasal « en » sont indistinguables sans dictionnaire ; une voix
  française lit les deux nasalisés. Corrigeable mot par mot via le
  dictionnaire si un cas gêne.
- **« oun »** [ũ] lu [un] : nasalisation perdue, peu audible en pratique.
- **« ng »** final [ŋ] lu [ŋg] : rare (anglicismes).
- **« r »** créole [ɣ] rendu [ʁ] français : accepté, proche.
- **Mots anglais dans un texte créole** (djòb, etc.) : non gérés par les
  règles ; passer par le dictionnaire si besoin.
- **Texte trop court isolé** (hors pipeline plein-script) : le détecteur peut
  ne pas déclencher ; utiliser `adaptCreoleTextForTts` directement si le
  contexte garantit que c'est du créole.
- L'accélération/le timing de la voix sont un problème distinct (durée de la
  vidéo), traité ailleurs (atempo, plafond 1,35x).

## Protocole de test

1. **Unitaires** : chaque règle a ses exemples canoniques ; chaque mot du
   dictionnaire a son assertion ; une phrase complète verrouille l'ensemble.
2. **Écoute réelle** : générer une vidéo courte (1 scène) avec une narration
   qui concentre les mots à risque, écouter, consigner au format
   mot → entendu → attendu.
3. **Non-régression linguistique** : après tout changement de règle, repasser
   la table « Vérifications croisées » ci-dessus.

## Sources

- [Prononciation du créole haïtien — Wikipédia](https://fr.wikipedia.org/wiki/Prononciation_du_cr%C3%A9ole_ha%C3%AFtien) (table graphème/API complète)
- [Comment lire et écrire correctement le créole haïtien — creole101.com](https://creole101.com/blog/how-to-properly-read-write-haitian-creole/) (règles pratiques, accents, articles, erreurs fréquentes)
- [Créole haïtien : phonologie — CNRS LGIDF](https://lgidf.cnrs.fr/creole-haitien-phonologie) (inventaire phonologique)
- [Le créole haïtien : histoire de son orthographe — haitiinter.com](https://www.haitiinter.com/le-creole-haitien-histoire-de-son-orthographe/) (orthographes Pressoir → IPN 1979)
- Signalements utilisateurs en production OtomatikEdit (juin 2026) : la table
  de normalisation lexicale de ce document vient de cas réels constatés.
