/**
 * *******************************************************
 * Nom ......... : vite.config.js
 * Rôle ........ : Configuration ViteJS du frontend React
 * Auteur ...... : Maxim Khomenko
 * Version ..... : 1.0.0 du 14/07/2025
 * Licence ..... : Réalisé dans le cadre du cours de Réseaux
 * Description . : Définition des plugins, port local, proxies API & WebSocket,
 *                 et des alias d’imports pour un développement fluide.
 * Technologies  : ViteJS, React, WebSocket, Proxy HTTP
 * Dépendances . : @vitejs/plugin-react
 * Usage ....... : Utilisé automatiquement par Vite au démarrage du dev server
 * *******************************************************
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Port du backend (API + WebSocket) pour le proxy
const BACKEND_PORT = 8000;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Port local pour le serveur Vite (frontend)
    open: true, // Ouvre automatiquement le navigateur au démarrage
    proxy: {
      // Proxy pour les API HTTP (ex: http://localhost:8000/api/...)
      '/api': {
        target: `http://localhost:${BACKEND_PORT}`,
        changeOrigin: true,
        secure: false,
      },
      // Proxy WebSocket (ex: ws://localhost:8000/ws/...)
      '/ws': {
        target: `ws://127.0.0.1:${BACKEND_PORT}`,
        ws: true // Active le support WebSocket
      }
    }
  },
  resolve: {
    alias: {
      // Permet d’écrire : import ... from '@/components/MonComposant'
      '@': '/src',
    }
  }
});