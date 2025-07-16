# 🛳️ Battleship Web Game — React & FastAPI

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

**Auteur :** Maxim Khomenko  
**Version :** 1.0.0 — 14/07/2025  
**Licence :** MIT — Open-source (voir fichier LICENSE)

---

## 📌 Présentation
Ce projet propose une **application web multijoueur** du jeu de **bataille navale**, reposant sur une architecture moderne fullstack : **React (frontend)** et **FastAPI (backend)**, avec des **WebSockets** pour la communication en temps réel.

Le jeu se distingue par une interface interactive et animée (Vanta.js), une logique réseau robuste, et un code bien modulaire, documenté et maintenable.

---

## 🚀 Déploiement rapide

### ⚙️ Prérequis
- Node.js (v18+ recommandé)
- Python 3.10+
- `uvicorn`, `fastapi`, `pydantic` (via `pip install -r requirements.txt`)

### ▶️ Lancement en local

**Backend** (FastAPI)
```bash
cd backend
uvicorn app.main:app --reload
```

**Frontend** (React via Vite)
```bash
cd frontend
npm install
npm run dev
```

L'application est alors disponible sur : [http://localhost:5173](http://localhost:5173)

---

## 🧱 Arborescence du projet

```
BATAILLE-NAVALE-WEB/
├── backend/
│   ├── app/
│   │   ├── main.py               # Entrée FastAPI + WebSocket
│   │   ├── config.py             # Constantes (grille, navires, ports...)
│   │   ├── game_logic.py         # Logique du jeu (placements, attaques...)
│   │   ├── game_manager.py       # Gestion des salles et connexions
│   │   ├── models.py             # Modèles Pydantic pour les échanges
│   │   └── utils.py              # Fonctions auxiliaires (grilles, positions...)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Composant principal React
│   │   ├── index.jsx            # Point d'entrée React 18
│   │   ├── utils/ws.js          # Gestion WebSocket côté client
│   │   ├── components/
│   │   │   ├── GameBoard.jsx         # Double grille joueur/adversaire
│   │   │   ├── PlacementPanel.jsx    # Interface de placement
│   │   │   └── VantaBackground.jsx   # Animation de fond VANTA.WAVES
│   │   └── styles/main.css      # Thème visuel complet du jeu
│   ├── vite.config.js           # Configuration Vite + proxy WebSocket
│   ├── index.html               # Template HTML principal
│   └── package.json
└── README.md
```

---

## ✨ Fonctionnalités principales

- 🎮 Placement manuel ou automatique des navires
- 🔁 Jeu tour par tour avec logique de tour serveur
- 📡 Communication WebSocket temps réel
- 🎨 UI moderne et réactive avec animations Vanta.js
- ✅ Détection de victoire, rejouabilité, messages d'état
- 🧠 Anti-spam côté serveur (protection des actions)

---

## 🧪 Tests manuels effectués

- Placement des navires : succès, collisions, bords de grille
- Début de partie synchrone entre 2 clients
- Attaques successives avec détection de touche/coulé
- Affichage cohérent des deux grilles en temps réel
- Déconnexions WebSocket gérées (reconnexion auto)

---

## 🧩 Améliorations futures

- 🤖 IA locale pour partie solo
- 📊 Tableau de score et classements persistants
- 🎥 Historique des parties (replays)
- 📱 Optimisation mobile (responsive complet)
- 🧍 Spectateur ou mode 2v2

---

## 👨‍💻 Auteur

Ce projet a été développé par **Maxim Khomenko** dans un cadre pédagogique, combinant des compétences en développement web frontend/backend, en communication réseau (WebSocket) et en UI/UX design.

Il constitue un exemple complet de projet React + FastAPI modulaire, maintenable, prêt pour le déploiement ou l’extension collaborative.

---

## 📬 Contact

Pour toute question ou retour, contactez :  
📧 maxim.khomenko18@gmail.com  
📁 Projet réalisé dans le cadre universitaire, publié en open-source (MIT) à des fins pédagogiques.
