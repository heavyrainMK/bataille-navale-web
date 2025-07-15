/**
 * *******************************************************
 * Nom ......... : ws.js
 * Rôle ........ : Gestion de la connexion WebSocket côté frontend (connexion, reconnexion, envoi)
 * Auteur ...... : Maxim Khomenko
 * Version ..... : 1.0.0 du 14/07/2025
 * Licence ..... : Réalisé dans le cadre du cours de Réseaux
 * Description . : Fournit un wrapper simple autour des WebSockets avec :
 *                 reconnexion automatique, file d’attente de messages offline,
 *                 nettoyage sécurisé et callbacks personnalisables.
 *
 * Technologies  : JavaScript (Web API)
 * Dépendances . : Aucune (standard JS natif)
 * Usage ....... : Importé dans App.jsx pour interagir avec le backend en temps réel
 * *******************************************************
 */

let socket = null;                  // Instance WebSocket globale
let connected = false;              // Statut de connexion
let sendQueue = [];                 // File d’attente des messages (quand offline)
let reconnectTries = 0;             // Nombre de tentatives de reconnexion
const MAX_RECONNECT_TRIES = 5;      // Limite des tentatives de reconnexion auto
let reconnectTimeout = null;        // ID du timeout de reconnexion

/**
 * Nettoie proprement les listeners et ferme la socket courante si présente.
 * À appeler avant toute nouvelle connexion ou lors d'une fermeture.
 */
function cleanupSocket() {
  if (socket) {
    socket.onopen = null;
    socket.onmessage = null;
    socket.onclose = null;
    socket.onerror = null;
    try { socket.close(); } catch {}
    socket = null;
    connected = false;
  }
}

/**
 * Ouvre une nouvelle connexion WebSocket.
 * Gère automatiquement la reconnexion, la file d'attente de messages et les callbacks personnalisés.
 *
 * @param {Object} params
 * @param {string} params.url - L’URL WebSocket à utiliser
 * @param {function} [params.onMessage] - Callback pour chaque message reçu
 * @param {function} [params.onOpen] - Callback à l’ouverture de la connexion
 * @param {function} [params.onClose] - Callback à la fermeture
 * @param {function} [params.onError] - Callback en cas d’erreur
 * @param {boolean} [params.autoReconnect=true] - Active/désactive la reconnexion automatique
 */
export function connectWebSocket({
  url,
  onMessage,
  onOpen,
  onClose,
  onError,
  autoReconnect = true,
}) {
  // Toujours fermer l’ancienne connexion avant d’en ouvrir une nouvelle
  cleanupSocket();

  console.log("Tentative de connexion WebSocket :", url);
  socket = new WebSocket(url);

  socket.onopen = (event) => {
    connected = true;
    reconnectTries = 0;
    console.log("WebSocket connecté.");

    // On envoie d’emblée le message “join”
    try {
      socket.send(JSON.stringify({ action: "join" }));
    } catch (e) {
      console.error("[WS] Erreur lors de l'envoi du message 'join':", e);
    }

    // Vide la file d'attente des messages non envoyés
    while (sendQueue.length && socket.readyState === WebSocket.OPEN) {
      socket.send(sendQueue.shift());
    }

    if (onOpen) onOpen(event);
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (onMessage) onMessage(data, event);
    } catch (e) {
      console.error("[WS] Erreur JSON :", event.data, e);
    }
  };

  socket.onclose = (event) => {
    connected = false;
    console.warn("WebSocket fermé :", event.code, event.reason || "(aucune raison)");
    if (onClose) onClose(event);

    // Gestion reconnexion automatique
    if (autoReconnect && reconnectTries < MAX_RECONNECT_TRIES) {
      const delay = Math.min(2000, Math.pow(2, reconnectTries) * 350);
      console.log(`[WS] Tentative de reconnexion dans ${delay}ms...`);
      reconnectTimeout = setTimeout(() => {
        reconnectTries++;
        connectWebSocket({ url, onMessage, onOpen, onClose, onError, autoReconnect });
      }, delay);
    }
  };

  socket.onerror = (event) => {
    console.error("WebSocket error:", event);
    if (onError) onError(event);
    // onclose sera appelé ensuite automatiquement
  };

  // Nettoyage lors de la fermeture ou navigation hors page (une seule fois)
  if (typeof window !== "undefined" && !window.__wsCleanupSet) {
    window.addEventListener("beforeunload", closeWebSocket);
    window.__wsCleanupSet = true;
  }
}

/**
 * Envoie un message via WebSocket.
 * Si la connexion n’est pas encore ouverte, stocke le message dans la file d’attente.
 * @param {object} message - Objet à envoyer (sera JSON.stringifié)
 */
export function sendWS(message) {
  const msgString = JSON.stringify(message);
  if (socket && connected && socket.readyState === WebSocket.OPEN) {
    socket.send(msgString);
  } else {
    sendQueue.push(msgString);
    console.warn("[WS] Message en file d’attente :", msgString);
  }
}

/**
 * Ferme proprement la connexion WebSocket, informe le serveur,
 * et annule toute tentative de reconnexion en attente.
 */
export function closeWebSocket() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  if (socket) {
    try {
      // Informe le serveur de la déconnexion volontaire
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: "deconnexion" }));
      }
    } catch (e) {}
    cleanupSocket();
  }

  connected = false;
  console.log("[WS] Connexion WebSocket fermée manuellement.");
}

/**
 * Indique si la connexion WebSocket est ouverte et utilisable.
 * @returns {boolean}
 */
export function isConnected() {
  return !!(socket && connected && socket.readyState === WebSocket.OPEN);
}