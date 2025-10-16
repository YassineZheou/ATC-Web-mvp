# ATC-Web-MVP

Projet de simulation Air Traffic Control (ATC) sur une interface web interactive.

## Description
ATC-Web-MVP est un simulateur de contrôle aérien qui permet de visualiser et gérer le trafic aérien sur une carte de la Tunisie. Le projet combine **backend Node.js** pour la simulation et **frontend HTML/CSS/JS** pour l’affichage en temps réel.  

Le simulateur gère jusqu’à 20 avions avec des routes entre différents aéroports tunisiens, détecte les conflits et affiche les alertes en temps réel.

## Fonctionnalités principales
- **Simulation d’avions** : Chaque avion a un aéroport de départ et d’arrivée, et suit un chemin direct.
- **Mouvement réaliste** : Calcul de distance et cap réel, gestion simple d’altitude et phases de vol (taxiing, takeoff, climb, cruise, descent, landing).
- **Détection de conflits** : Alertes lorsque deux avions se rapprochent trop (configurable, 15 km horizontal et 500 m vertical).  
- **Interface web interactive** : Carte avec avions visibles, sidebar affichant infos en temps réel, popups sur les avions avec détails de vol.
- **Gestion des alertes** : Les conflits ne sont signalés qu’une fois pour éviter le spam.
- **Connexion utilisateur** : Base utilisateur simple avec rôles (Controller, Supervisor).

## Technologies utilisées
- Backend : Node.js, Express, WebSocket (ws)
- Frontend : HTML5, CSS3, JavaScript, Leaflet pour la carte
- Gestion des données : Fichiers JS simulant la base utilisateur

## Installation et exécution
1. Cloner le dépôt :  
```bashgit
clone https://github.com/YassineZheou/ATC-Web-MVP.git
cd ATC-Web-MVP
git clone https://github.com/YassineZheou/ATC-Web-MVP.git
cd ATC-Web-MVP
