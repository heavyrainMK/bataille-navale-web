/**
 * *******************************************************
 * Nom ......... : index.jsx
 * Rôle ........ : Point d’entrée principal de l’application React
 * Auteur ...... : Maxim Khomenko
 * Version ..... : 1.0.0 du 14/07/2025
 * Licence ..... : Réalisé dans le cadre du cours de Réseaux
 * Description . : Monte le composant racine <App /> dans le DOM via React 18.
 *                 Initialise les styles globaux et active React.StrictMode.
 *
 * Technologies  : React.js
 * Dépendances . : App.jsx, main.css
 * Usage ....... : Chargé automatiquement par Vite lors du démarrage du frontend
 * *******************************************************
 */

import React from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";
import "@/styles/main.css";

// Récupère la div racine dans le HTML
const root = createRoot(document.getElementById("root"));

// Rendu de l'application, encapsulée dans React.StrictMode pour de meilleures pratiques de développement
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);