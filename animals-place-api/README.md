# ArchiOWeb-AnimalsPlace
Animals Place est une application de rencontres pour animaux. Ce reposistory contient l'API qui permet à l'application Animals Place (https://github.com/JoraneMembrez/archiOWeb-animalsPlace) de fonctionner.

Déploiement sur Render : https://archioweb-animalsplace.onrender.com/

## Projet développé par :
- Jorane Membrez
- Lucie Hadjian
- Kenza ElMaliki

## Fonctionnalités
L'objectif principal de cette application est de créer des opportunités pour les animaux de compagnie de socialiser et de s'amuser ensemble. Les utilisateurs auront la possibilité de liker d'autres utilisateurs, ce qui leur permettra d'initier un contact en dehors de l'application. Cela facilitera les rencontres entre les propriétaires d'animaux, leur permettant ainsi d'organiser des rencontres où leurs animaux pourront interagir et se familiariser les uns avec les autres. L'application vise à créer une communauté autour du bien-être et du divertissement des animaux de compagnie, favorisant ainsi des interactions entre les propriétaires d'animaux.

## Installation
Prérequis:
- Node.js
- Postman
- MongoDB

1. Cloner et pull le repository
```
git pull
```

2. Installer les packages
```
npm install
```

3. Créer un fichier `.env` si vous souhatez modifier les données présentes dans le fichier `config.js`

4. Exécuter l'application
```
npm run dev OU npm run start
```

## Documentation
La documentation de l'API est disponible ici : https://archioweb-animalsplace.onrender.com/api-docs/

## Websocket
L'API utilise des WebSockets pour 2 choses :

1. Notifier les utilisateurs quand un nouvel utilisateur a été créé sur l'application
2. Notifier les utilisateurs quand ceux-ci ont reçu un like ou un match

## Test
Pour lest tests :
```
npm test
```

## Amélioration
- Création d'un chat en WS (malheureusement nous avons pas réussi à l'implémenter), cela donnerait une suite plus logique à l'application
- Eviter le Franglish
- Gestion des erreurs plus approfondies
