# barre-etat

Bandeau d'état pour l'onglet Code de Claude Desktop, affiché au-dessus de la zone de saisie,
comme la statusline du terminal :

```
claude-opus-5-5 │ ctx ▰▰▰▰▱▱▱▱▱▱ 39% │ 5h ▰▰▰▰▱▱▱▱▱▱ 37% → 14:20 (dans 2 h 13) │ 7j ▰▰▰▰▰▱▱▱▱▱ 54% │ $13.49 │ ERP_Unifie
```

- modèle utilisé ;
- remplissage du contexte ;
- quota de 5 h : pourcentage, heure de remise à zéro et temps restant (mis à jour chaque minute) ;
- quota de 7 jours ;
- coût de la session ;
- dossier de travail.

Le nombre est en vert, orange à partir de 50 %, rouge à partir de 80 %. Le contexte et les
quotas apparaissent après la première réponse de Claude.

## Choisir le style et les couleurs

Chaque utilisateur choisit l'apparence des barres ; le choix est gardé d'une session à l'autre.

`/barre-style` liste les 10 styles, `/barre-style 3` (ou `/barre-style ligne`) en choisit un :

| N° | Style | Aperçu |
|---|---|---|
| 1 | Segments (par défaut) | `▰▰▰▰▰▰▰▱▱▱` |
| 2 | Blocs pleins | `███████░░░` |
| 3 | Ligne fine | `━━━━━━━───` |
| 4 | Points | `●●●●●●●○○○` |
| 5 | Carrés | `■■■■■■■□□□` |
| 6 | Précise au 1/8 | `███████▎░░` |
| 7 | Escalier | `▁▂▃▄▅▆▇███` |
| 8 | Losanges | `◆◆◆◆◆◆◆◇◇◇` |
| 9 | Classique | `[======>   ]` |
| 10 | Batterie | `▕███████   ▏` |

`/barre-couleur` liste les 9 palettes, `/barre-couleur 3` (ou `/barre-couleur ocean`) en choisit une :
1. Vert → rouge (par défaut), 2. Selon le seuil (vert, orange, rouge), 3. Océan, 4. Violet,
5. Coucher de soleil, 6. Arc-en-ciel, 7. Menthe, 8. Feu, 9. Claude (orange uni).

## Installation

Dans une session Claude Code (terminal, ou onglet Code de Claude Desktop), tapez :

```
/plugin install barre-etat --marketplace skisofrene2001/claude-barre-etat
```

Répondez `y` pour ajouter la place de marché, puis choisissez la portée (utilisateur : toutes
vos sessions).
