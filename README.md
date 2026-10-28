# barre-etat

Bandeau d'état pour l'onglet Code de Claude Desktop, affiché au-dessus de la zone de saisie,
comme la statusline du terminal :

```
claude-opus-5-5 │ ctx 39% │ 5h 37% → 14:20 (dans 2 h 13) │ 7j 54% │ $13.49 │ ERP_Unifie
```

- modèle utilisé ;
- remplissage du contexte ;
- quota de 5 h : pourcentage, heure de remise à zéro et temps restant (mis à jour chaque minute) ;
- quota de 7 jours ;
- coût de la session ;
- dossier de travail.

Pourcentages en vert, orange à partir de 50 %, rouge à partir de 80 %. Le contexte et les
quotas apparaissent après la première réponse de Claude.

## Installation

Dans une session Claude Code (terminal, ou onglet Code de Claude Desktop), tapez :

```
/plugin install barre-etat --marketplace skisofrene2001/claude-barre-etat
```

Répondez `y` pour ajouter la place de marché, puis choisissez la portée (utilisateur : toutes
vos sessions).
