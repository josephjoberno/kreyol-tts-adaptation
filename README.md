# Kreyòl TTS Adaptation

Faire prononcer correctement le créole haïtien (Kreyòl ayisyen) par les moteurs de synthèse vocale grand public : Gemini TTS, ElevenLabs, fal.ai, Suno. Un skill Claude Code complet, un CLI autonome, et la connaissance linguistique pour l'étendre.

In English: a Claude Code skill and a standalone CLI that respell Haitian Creole (IPN orthography) so mainstream TTS engines, which only know French and English, pronounce it the way a Creole speaker would. Built from real production cases. The full documentation is in French in [SKILL.md](SKILL.md).

## Pourquoi ce projet existe

Je construis [OtomatikEdit](https://otomatikedit.com), une plateforme de génération de vidéos pour les créateurs de contenu, dont beaucoup publient en créole haïtien pour des audiences sur TikTok, YouTube et Facebook. Aucun moteur de synthèse vocale grand public ne parle le kreyòl. Quand on leur donne un texte en orthographe IPN, deux choses se produisent :

1. **Ils lisent avec les règles du français.** « Repoze » sort « reupozeu » au lieu de « répozé », « mwen » sort « mouan » au lieu de « mwin », « genyen » sort « jenyen » au lieu de « guinyin ». Les voyelles sont massacrées.

2. **Les moteurs à base de LLM vont plus loin : ils remplacent les mots.** Gemini TTS ne lit pas les lettres, il reconnaît un mot proche du français et prononce LE MOT FRANÇAIS. Constaté en production : « istwa » devient « histoire », « Jezi » devient « Jésus », « Bib » devient « Bible », « Bondye » devient « Bon Dieu », « gade » devient « garder », « kwè » devient « croire », « lapriyè » devient « la prière ». Aucune règle d'orthographe ne gagne contre ça tant que le mot reste reconnaissable.

Chaque mot mal prononcé casse l'immersion d'une narration et décrédibilise la vidéo. Pour une langue parlée par plus de douze millions de personnes et quasi absente des moteurs vocaux, il fallait une solution systématique, documentée et partageable. C'est ce dépôt.

## La solution en deux étages

**Des règles de réécriture phonétique** : le texte est réécrit, juste avant l'appel au moteur, dans une orthographe que le français lit comme du kreyòl. Le « e » devient « é », le « en » nasal devient « in », le « g » se durcit en « gu » devant e/i, le « s » intervocalique se double. Six règles, dont l'ordre compte, dérivées de la table graphème-phonème officielle de l'orthographe IPN.

**Un dictionnaire d'exceptions** : les mots que les moteurs LLM francisent sont remplacés par des non-mots français portant les mêmes sons. « Bib » devient « Bibe », « Bondye » devient « Bon-dyé », « istwa » devient « iss-toua », « Jezi » devient « Jé-zi ». Le moteur n'a plus rien à normaliser et lit ce qui est écrit. Le tiret casse la reconnaissance lexicale sans hacher la lecture.

Règle d'or : le texte adapté ne sert QUE pour l'appel au moteur. Les sous-titres, le script affiché à l'utilisateur, la base de données gardent toujours l'orthographe IPN authentique.

## À qui ça s'adresse

- **Développeurs d'applications vidéo, audio ou e-learning** qui veulent offrir des voix off en créole haïtien avec les moteurs TTS existants, sans attendre qu'un fournisseur supporte la langue.
- **Utilisateurs de Claude Code** : installez le skill et Claude saura corriger un mot signalé, étendre le dictionnaire, ou vous donner la sortie moteur d'un texte.
- **La communauté tech haïtienne et créolophone** : la connaissance accumulée ici (table phonétique, mots à risque constatés, méthode de forge des remplacements) est réutilisable pour n'importe quel système vocal, y compris d'autres créoles à base lexicale française.

## Contenu du dépôt

| Fichier | Rôle |
|---|---|
| `SKILL.md` | Le skill complet : les deux modes de défaillance, la table graphème IPN vers API vers réécriture sûre, l'ordre des règles, la méthode du dictionnaire, la détection, les invariants d'architecture, le workflow de correction d'un mot, les limitations connues, le protocole de test. |
| `scripts/adapt-creole.ts` | CLI autonome (zéro dépendance) : un texte entre, la sortie par moteur sort. |

## Installation comme skill Claude Code

Pour un projet (partagé avec l'équipe via git) :

```bash
mkdir -p .claude/skills/creole-tts-adaptation
cp -r SKILL.md scripts .claude/skills/creole-tts-adaptation/
```

Pour tous vos projets :

```bash
mkdir -p ~/.claude/skills/creole-tts-adaptation
cp -r SKILL.md scripts ~/.claude/skills/creole-tts-adaptation/
```

Claude Code détecte le skill automatiquement. Dites-lui « la voix dit garder au lieu de ga-dé » ou « donne-moi la sortie Gemini de ce texte créole » et il appliquera la méthode.

## Utilisation du CLI

Nécessite [bun](https://bun.sh) (ou tsx/ts-node).

```bash
bun scripts/adapt-creole.ts "Mwen fatige anpil, annale lakay nou."
echo "Bondye bon" | bun scripts/adapt-creole.ts
bun scripts/adapt-creole.ts --force "Mwen fatige."   # texte court : forcer l'adaptation
bun scripts/adapt-creole.ts --json "..."             # sortie JSON programmatique
```

Exemple de sortie :

```
Texte original          : Bondye renmen nou, Jezi ap gade istwa nou.
Détecté créole          : true

Gemini TTS              : Bon-dyé rinmin nou, Jé-zi ap ga-dé iss-toua nou.
ElevenLabs              : Bon-dyé rinmin nou, Jé-zi ap ga-dé iss-toua nou.
fal.ai (voix)           : Bon-dyé rinmin nou, Jé-zi ap ga-dé iss-toua nou.
Suno (paroles chantées) : Bon-dyé rinmin nou, Jé-zi ap ga-dé iss-toua nou.
Sous-titres / affichage : Bondye renmen nou, Jezi ap gade istwa nou.
```

Toutes les voix parlées et les paroles chantées (Suno en mode chanson) reçoivent la même réécriture. Le champ `style` de Suno (description d'ambiance) et tout ce qui est affiché à l'utilisateur restent intacts.

## Quelques transformations de référence

| Kreyòl (IPN) | Le moteur disait | Il reçoit | Il dit |
|---|---|---|---|
| repoze | reupozeu | répozé | répozé |
| mwen | mouan | mwin | mwin |
| genyen | jenyen | guinyin | guinyin |
| prese | prézé | préssé | préssé |
| Bib | Bible | Bibe | bib |
| istwa | histoire | iss-toua | iss-twa |
| Jezi | Jésus | Jé-zi | jé-zi |
| Bondye | Bon Dieu | Bon-dyé | bon-dyé |

## Contribuer

Le dictionnaire d'exceptions grandit avec les signalements de terrain. Ouvrez une issue ou une PR au format :

```
mot écrit : gade
la voix dit : garder
attendu : ga-dé
moteur : Gemini TTS
```

Pour une PR : ajoutez l'entrée dans `WORD_OVERRIDES` (dans `scripts/adapt-creole.ts`) en suivant la méthode de forge documentée dans `SKILL.md` (non-mot français, mêmes sons, tirets aux syllabes pour les noms propres), avec le cas dans la section des transformations de référence.

## Sources

- [Prononciation du créole haïtien, Wikipédia](https://fr.wikipedia.org/wiki/Prononciation_du_cr%C3%A9ole_ha%C3%AFtien) : table graphème-phonème complète de l'orthographe IPN.
- [Comment lire et écrire correctement le créole haïtien, creole101.com](https://creole101.com/blog/how-to-properly-read-write-haitian-creole/) : règles pratiques, accents, articles, erreurs fréquentes.
- [Créole haïtien : phonologie, CNRS LGIDF](https://lgidf.cnrs.fr/creole-haitien-phonologie) : inventaire phonologique.
- [Le créole haïtien : histoire de son orthographe, haitiinter.com](https://www.haitiinter.com/le-creole-haitien-histoire-de-son-orthographe/) : des orthographes Pressoir à l'IPN (1979).
- Cas de production OtomatikEdit (juin 2026) : toutes les erreurs de la table de normalisation lexicale ont été constatées et corrigées en conditions réelles.

## Licence

MIT. Utilisez, copiez, adaptez, y compris commercialement. Si ce travail vous sert, un lien vers ce dépôt aide la communauté à le trouver.
