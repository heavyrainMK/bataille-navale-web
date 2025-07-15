/**
 * *******************************************************
 * Nom ......... : App.jsx
 * Rôle ........ : Composant principal de l’application React
 * Auteur ...... : Maxim Khomenko
 * Version ..... : 1.0.0 du 14/07/2025
 * Licence ..... : Réalisé dans le cadre du cours de Réseaux
 * Description . : Gère l’interface principale du jeu, les différentes phases
 *                 (menu, placement, bataille, fin), les états internes,
 *                 les événements, les logs et la communication WebSocket.
 *
 * Technologies  : React.js, WebSockets, Lucide React, CSS personnalisé
 * Dépendances . : ws.js, GameBoard.jsx, PlacementPanel.jsx, VantaBackground.jsx
 * Usage ....... : Point d’entrée visuel du frontend
 * *******************************************************
 */

import React, { useState, useRef } from "react";
import PlacementPanel from "./components/PlacementPanel";
import GameBoard from "./components/GameBoard";
import VantaBackground from "./components/VantaBackground";
import { connectWebSocket, sendWS, closeWebSocket } from "./utils/ws";
import "./styles/main.css";
import {
  Loader2, Check, Repeat2, ThumbsUp, Menu as MenuIcon, FileText,
  LayoutList, Crosshair, Trophy, Ship, Waves, Hourglass, Play,
  Skull, Bomb, X, Anchor, RefreshCw
} from "lucide-react";

// ---------------------
// BARRE DE PROGRESSION WOW
// ---------------------
const STEP_ICONS = [MenuIcon, LayoutList, Crosshair, Trophy];
const STEP_COLORS = ["#3486ff", "#29b6f6", "#16c653", "#ffd76e"];

function PhaseProgress({ phase }) {
  const steps = [
    { label: "Menu", key: "MENU" },
    { label: "Placement", key: "PLACEMENT" },
    { label: "Bataille", key: "BATTLE" },
    { label: "Fin", key: "FIN" },
  ];
  let idx = steps.findIndex(s => phase.toUpperCase().includes(s.key));
  if (phase === "LOBBY" || phase === "WAITING") idx = 0;
  if (phase === "WAIT_REPLAY" || phase === "CONFIRM_REPLAY") idx = 3;

  const circleCount = steps.length;
  const circleSpacing = 100 / (circleCount - 1);
  const trackLeft = 22, trackRight = 22;
  const progress = idx / (circleCount - 1);

  return (
    <div className="wow-phase-bar-pro">
      <div
        className="wow-phase-bar-bg-pro"
        style={{
          left: trackLeft,
          right: trackRight,
        }}
      />
      <div
        className="wow-phase-bar-fg-pro"
        style={{
          left: trackLeft,
          width: `calc(${progress * 100}% - ${progress * (trackLeft + trackRight)}px)`,
        }}
      />
      {steps.map((step, i) => {
        const Icon = STEP_ICONS[i];
        const isDone = i < idx;
        const isActive = i === idx;
        return (
          <div
            key={step.key}
            className="wow-step-pro"
            style={{
              left: `calc(${i * circleSpacing}% - 22px)`,
            }}
          >
            <div
              className={`wow-step-circle${isActive ? " active" : ""}${isDone ? " done" : ""}`}
              style={{
                borderColor: isActive || isDone ? STEP_COLORS[i] : "#dbe7fa",
                boxShadow: isActive
                  ? `0 0 20px 3px ${STEP_COLORS[i]}77, 0 0 5px 1px ${STEP_COLORS[i]}33`
                  : isDone
                  ? `0 0 6px 1px ${STEP_COLORS[i]}44`
                  : "none",
                background: isDone
                  ? `linear-gradient(145deg, #eafaf0 60%, ${STEP_COLORS[i]}22 100%)`
                  : isActive
                  ? "#f3f9ff"
                  : "#ecf3fe"
              }}
            >
              <Icon
                size={isActive ? 28 : 22}
                color={isActive ? STEP_COLORS[i] : isDone ? STEP_COLORS[i] : "#7ca2e6"}
                className={isActive ? "wow-bounce" : ""}
                strokeWidth={isActive ? 2.7 : 2}
                style={{
                  filter: isActive ? `drop-shadow(0 0 6px ${STEP_COLORS[i]}bb)` : "none",
                  transition: "all .24s"
                }}
              />
              {isDone && (
                <span className="wow-step-check" style={{ background: "var(--accent-green)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Check size={16} color="#fff" strokeWidth={3} />
                </span>
              )}
              {isActive && <span className="wow-step-glow" style={{ background: STEP_COLORS[i] }} />}
            </div>
            <div className={`wow-step-label${isActive ? " active" : ""}`}>
              {step.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const NAVIRES = [
  { nom: "Porte-avions", taille: 5 },
  { nom: "Croiseur", taille: 4 },
  { nom: "Contre-torpilleur", taille: 3 },
  { nom: "Sous-marin", taille: 3 },
  { nom: "Torpilleur", taille: 2 },
];

const PHASES = {
  LOBBY: "LOBBY",
  MENU: "MENU",
  PLACEMENT: "PLACEMENT",
  BATTLE: "BATTLE",
  FIN: "FIN",
  WAITING: "WAITING",
  WAIT_REPLAY: "WAIT_REPLAY",
  CONFIRM_REPLAY: "CONFIRM_REPLAY",
};

const iconGlowStyle = {
  marginRight: 14,
  verticalAlign: "-0.18em",
  filter: "drop-shadow(0 2px 8px #31eaff88)",
  animation: "float-boat 3.8s ease-in-out infinite"
};

function addGroupedEventLog(logs, newEvent) {
  // Types à regrouper
  const mergeTypes = ["touche", "coule", "manque"];
  const touchReg = /([A-J][0-9])/i;

  // Fonction d'intitulé dynamique selon type et joueur/adversaire
  function formatMsg(type, isAdv, coords) {
    const prefix =
      type === "touche"
        ? (isAdv ? "L'adversaire a touché" : "Touché")
        : type === "coule"
        ? (isAdv ? "L'adversaire a coulé" : "Coulé")
        : type === "manque"
        ? (isAdv ? "L'adversaire a manqué" : "Manqué")
        : "";
    return coords.length
      ? `${prefix} en ${coords.join(", ")}`
      : prefix;
  }

  if (
    logs.length > 0 &&
    mergeTypes.includes(newEvent.type) &&
    logs[logs.length - 1].type === newEvent.type
  ) {
    const last = logs[logs.length - 1];
    // Détecte si c'est l'adversaire (pour que joueur & adv ne soient pas regroupés ensemble)
    const lastIsAdv = last.isAdv !== undefined ? last.isAdv : last.msg.includes("L'adversaire");
    const thisIsAdv = newEvent.msg.includes("L’adversaire") || newEvent.msg.includes("L'adversaire");
    if (lastIsAdv !== thisIsAdv) return [...logs, prepareEventObj(newEvent)]; // on ne regroupe pas joueur/adv

    // Regroupe les coordonnées sans doublons
    const lastCoords = last.coords ? [...last.coords] : [];
    const coord = newEvent.msg.match(touchReg)?.[1];
    if (coord && !lastCoords.includes(coord)) lastCoords.push(coord);

    const msg = formatMsg(newEvent.type, thisIsAdv, lastCoords);

    return [
      ...logs.slice(0, -1),
      {
        ...last,
        msg,
        coords: lastCoords,
        isAdv: thisIsAdv,
        time: newEvent.time,
      },
    ];
  }

  // Premier log du type
  return [...logs, prepareEventObj(newEvent)];
}

// Fonction utilitaire pour préparer l’objet d’event au bon format
function prepareEventObj(event) {
  const touchReg = /([A-J][0-9])/i;
  const coord = event.msg.match(touchReg)?.[1];
  const isAdv = event.msg.includes("L’adversaire") || event.msg.includes("L'adversaire");
  const coords = coord ? [coord] : [];
  const type = event.type;

  function formatMsg(type, isAdv, coords) {
    const prefix =
      type === "touche"
        ? (isAdv ? "L'adversaire a touché" : "Touché")
        : type === "coule"
        ? (isAdv ? "L'adversaire a coulé" : "Coulé")
        : type === "manque"
        ? (isAdv ? "L'adversaire a manqué" : "Manqué")
        : "";
    return coords.length
      ? `${prefix} en ${coords.join(", ")}`
      : prefix;
  }

  let msg = event.msg;
  if (["touche", "coule", "manque"].includes(type)) {
    msg = formatMsg(type, isAdv, coords);
  }
  return { ...event, msg, coords, isAdv };
}

export default function App() {
  const [eventLog, setEventLog] = useState([]);
  const [phase, setPhase] = useState(PHASES.LOBBY);
  const [roomId, setRoomId] = useState("default-room");
  const [playerId, setPlayerId] = useState(null);
  const [playerIndex, setPlayerIndex] = useState(null);
  const [grilleJoueur, setGrilleJoueur] = useState(Array(10).fill().map(() => Array(10).fill("~")));
  const [grilleAdversaire, setGrilleAdversaire] = useState(Array(10).fill().map(() => Array(10).fill("~")));
  const [statusMessage, setStatusMessage] = useState(""); // message contextuel ou erreur
  const [monTour, setMonTour] = useState(false);
  const [finInfo, setFinInfo] = useState({ victoire: null, details: null });
  const [selectedNavire, setSelectedNavire] = useState(null);
  const [orientation, setOrientation] = useState("HR");
  const [naviresPlaces, setNaviresPlaces] = useState([]);
  const [waitingReplay, setWaitingReplay] = useState(false);
  const [canConfirmReplay, setCanConfirmReplay] = useState(false);
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const [waitingType, setWaitingType] = useState("searching");
  const [wsStatus, setWsStatus] = useState("disconnected");
  const isConnected = wsStatus === "connected";
  const isConnecting = wsStatus === "connecting";

  function pivotOrientation(current) {
    const order = ["HR", "VD", "HL", "VU"];
    const idx = order.indexOf(current);
    return order[(idx + 1) % order.length];
  }

  // --- WebSocket logic ---
  function handleLobbyJoin() {
    setWsStatus("connecting");
    connectWebSocket({
      url: `/ws/game/${roomId || "default-room"}`,
      onMessage: handleWSMessage,
      onOpen: () => {
        setWsStatus("connected");
        send("join");
        setPhase(PHASES.WAITING);
        setStatusMessage("Recherche d’un adversaire…");
      },
      onClose: () => {
        setWsStatus("disconnected");
        setEventLog([]);
        setPhase(PHASES.LOBBY);
        setStatusMessage("Déconnecté du serveur. Cliquez sur 'Jouer' pour réessayer.");
      },
      onError: () => setStatusMessage("Erreur WebSocket"),
      autoReconnect: true,
    });
  }
  function send(action, payload = {}) {
    sendWS({ action, ...payload });
  }

  function detectNaviresPlaces(grille) {
    const naviresTrouves = [];
    for (const nav of NAVIRES) {
      let trouve = false;
      outer: for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          const cell = grille?.[i]?.[j];
          if (Array.isArray(cell) && cell[2] === nav.nom) {
            trouve = true;
            break outer;
          }
        }
      }
      if (trouve) naviresTrouves.push(nav.nom);
    }
    return naviresTrouves;
  }
  function resetAllStates({ full = false, toLobby = false } = {}) {
    setGrilleJoueur(Array(10).fill().map(() => Array(10).fill("~")));
    setGrilleAdversaire(Array(10).fill().map(() => Array(10).fill("~")));
    setNaviresPlaces([]);
    setSelectedNavire(null);
    setFinInfo({ victoire: null, details: null });
    setMonTour(false);
    setWaitingReplay(false);
    setCanConfirmReplay(false);
    setOrientation("HR");
    setStatusMessage("");
    if (full) {
      setPlayerId(null);
      setPlayerIndex(null);
    }
    if (toLobby) {
      setPhase(PHASES.LOBBY);
      closeWebSocket();
    }
  }

  // --------------------------------------
  //         GESTION WEBSOCKET MESSAGES
  // --------------------------------------
  function handleWSMessage(data) {
    let eventMessage = null; // Pour l'event log

    switch (data.action) {
      case "player_joined":
        setPlayerId(data.player_id);
        setPlayerIndex(data.player_index);
        setPhase(PHASES.WAITING);
        setWaitingType("searching");
        setStatusMessage("");
        break;

      case "ready":
        setPhase(PHASES.MENU);
        setStatusMessage("");
        break;

      case "attente_adversaire":
        setPhase(PHASES.WAITING);
        setWaitingType("waiting_ready_btn");
        setStatusMessage(data.message || "");
        break;

      case "debut_placement":
        setPhase(PHASES.PLACEMENT);
        setNaviresPlaces([]);
        setSelectedNavire(null);
        setOrientation("HR");
        setStatusMessage("Place tes navires !");
        break;

      case "mise_a_jour_grille":
        setGrilleJoueur(data.grille || []);
        setNaviresPlaces(detectNaviresPlaces(data.grille || []));
        setSelectedNavire(null);
        setStatusMessage("Navire placé !");
        break;

      case "erreur_placement":
        setStatusMessage(data.message || "Placement invalide.");
        break;

      case "placement_confirme":
        setStatusMessage("En attente que l’adversaire termine le placement de ses navires…");
        setWaitingType("waiting_placement");
        setPhase(PHASES.WAITING);
        break;

      case "tous_navires_prets":
        setPhase(PHASES.BATTLE);
        setStatusMessage("La bataille commence !");
        break;

      case "debut_tour":
      case "changement_tour":
        setMonTour(data.tour_joueur === data.player_index);
        setStatusMessage(data.tour_joueur === data.player_index ? "À vous de jouer !" : "Tour de l’adversaire…");
        break;

      case "resultat_attaque": {
        const { type_joueur, coordonnees, resultat, positions_coule, nom_navire } = data;
        const [x, y] = coordonnees;
        const coord = `${String.fromCharCode(65 + y)}${x + 1}`;

        const isCoule = (resultat === "coule") ||
          (
            (!["manque", "touche"].includes(resultat)) &&
            Array.isArray(positions_coule) &&
            positions_coule.length > 0
          );

        if (type_joueur === "attaquant") {
          let type =
            resultat === "manque" ? "manque" :
            resultat === "touche" ? "touche" :
            isCoule               ? "coule"  :
                                    "attack-player";
          let msg =
            resultat === "manque" ? `En ${coord} : manqué`
          : resultat === "touche" ? `En ${coord} : touché !`
          : isCoule               ? `En ${coord} : coulé !`
          :                        `En ${coord}`;
          eventMessage = { type, msg };
        } else if (type_joueur === "defenseur") {
          let type =
            resultat === "manque" ? "manque" :
            resultat === "touche" ? "touche" :
            isCoule               ? "coule"  :
                                    "attack-adversaire";
          let msg =
            resultat === "manque" ? `L’adversaire en ${coord} : manqué`
          : resultat === "touche" ? `L’adversaire en ${coord} : touché !`
          : isCoule               ? `L’adversaire en ${coord} : coulé !`
          :                        `L’adversaire en ${coord}`;
          eventMessage = { type, msg };
        }

        // Mise à jour des grilles
        if (type_joueur === "attaquant") {
          setGrilleAdversaire((prev) => {
            const newGrid = prev.map((row) => [...row]);
            if (resultat === "manque") newGrid[x][y] = "O";
            else if (resultat === "touche") newGrid[x][y] = "X";
            else if (resultat === "coule" || isCoule) {
              positions_coule.forEach(([i, j]) => {
                newGrid[i][j] = ["sunk", "C", nom_navire[0]];
              });
            }
            return newGrid;
          });
        }
        if (type_joueur === "defenseur") {
          setGrilleJoueur((prev) => {
            const newGrid = prev.map((row) => row.map((cell) => (Array.isArray(cell) ? [...cell] : cell)));
            if (resultat === "manque") newGrid[x][y] = "O";
            else if (resultat === "touche") {
              if (Array.isArray(newGrid[x][y]) && newGrid[x][y][1] === "S") {
                newGrid[x][y][1] = "X";
              }
            } else if (resultat === "coule" || isCoule) {
              const [i, j] = positions_coule[0];
              const id_navire = newGrid[i][j][0];
              for (let a = 0; a < 10; a++) {
                for (let b = 0; b < 10; b++) {
                  if (Array.isArray(newGrid[a][b]) && newGrid[a][b][0] === id_navire) {
                    newGrid[a][b][1] = "C";
                  }
                }
              }
            }
            return newGrid;
          });
        }
        // Pas de setStatusMessage ici pour ce type de message
        break;
      }

      case "fin_partie":
        setPhase(PHASES.FIN);
        setFinInfo({ victoire: data.victoire, details: data });
        setWaitingReplay(false);
        setCanConfirmReplay(false);
        setStatusMessage(data.victoire ? "Victoire !" : "Défaite.");
        eventMessage = data.victoire ? { type: "victoire", msg: "Victoire !" } : { type: "defaite", msg: "Défaite !" };
        break;

      case "attente_rejouer":
        if (data.message?.includes("accepte le redémarrage")) {
          setPhase(PHASES.WAIT_REPLAY);
          setWaitingReplay(true);
          setCanConfirmReplay(false);
          setStatusMessage(data.message || "Attente d'une revanche...");
        } else {
          setPhase(PHASES.CONFIRM_REPLAY);
          setCanConfirmReplay(true);
          setWaitingReplay(false);
          setStatusMessage(data.message || "L'adversaire veut rejouer, voulez-vous aussi ?");
        }
        break;

      case "restart":
        resetAllStates();
        setEventLog([]);
        setPhase(PHASES.MENU);
        setStatusMessage("");
        setTimeout(() => {
          const now = new Date();
          const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setEventLog([{ type: "nouvelle", msg: "Nouvelle partie !", time: formattedTime }]);
        }, 0);
        break;

      case "adversaire_deconnecte":
        resetAllStates({ toLobby: true });
        setStatusMessage("L'adversaire s'est déconnecté. Cliquez sur Jouer pour une nouvelle partie.");
        eventMessage = { type: "defaite", msg: "L'adversaire s'est déconnecté." };
        break;

      case "erreur":
        setStatusMessage(data.message || "Erreur inconnue");
        eventMessage = { type: "defaite", msg: data.message || "Erreur inconnue" };
        break;

      default:
        setStatusMessage(data.message || "Message inconnu du serveur.");
        eventMessage = { type: "defaite", msg: data.message || "Message inconnu du serveur." };
        break;
    }

    // Ajout au log seulement si ce n'est pas un message "central"
    if (
      eventMessage &&
      (!eventMessage.msg || !getCentralStatus(eventMessage.msg))
    ) {
      // Ajoute l'heure courante au log
      const now = new Date();
      const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const logWithTime = { ...eventMessage, time: formattedTime };
      setEventLog(log => addGroupedEventLog(log, logWithTime));
    }
  }

  function handleQuitter() {
    send("deconnexion");
    resetAllStates({ toLobby: true });
    setEventLog([]);
    setStatusMessage("Vous avez quitté la partie. Prêt à en rejoindre une autre ?");
  }
  function handleRestart() {
    setFinInfo({ ...finInfo, waitingReplay: true });
    setWaitingReplay(true);
    setCanConfirmReplay(false);
    send("rejouer");
    setStatusMessage("Demande de revanche envoyée !");
  }
  function handleConfirmReplay() {
    setFinInfo({ ...finInfo, waitingReplay: true });
    setWaitingReplay(true);
    setCanConfirmReplay(false);
    send("rejouer");
    setStatusMessage("Vous avez accepté la revanche !");
  }
  function handlePlacement(i, j) {
    if (!selectedNavire || naviresPlaces.includes(selectedNavire.nom)) {
      setStatusMessage("Sélectionnez un navire à placer !");
      return;
    }
    send("placer_navire", {
      taille_navire: selectedNavire.taille,
      coordonnees: [i, j],
      orientation,
      nom_navire: selectedNavire.nom,
    });
  }
  const canValidate = naviresPlaces.length === NAVIRES.length;

  function getCentralStatus(status) {
    if (!status) return "";
    if (
      status.includes("À vous de jouer") ||
      status.includes("Tour de l’adversaire") ||
      status.includes("La bataille commence")
    ) return status;
    return "";
  }

  function LogIcon({ type }) {
    const size = 18;
    switch (type) {
      case "attack-player":
        return <Bomb size={size} color="#25e7f5" style={{marginRight: 6, verticalAlign: "-0.2em"}} />;
      case "attack-adversaire":
        return <Crosshair size={size} color="#fa77b5" style={{marginRight: 6, verticalAlign: "-0.2em"}} />;
      case "touche":
        return <Crosshair size={size} color="#22ccee" style={{marginRight: 6, verticalAlign: "-0.2em"}} />;
      case "manque":
        return <X size={size} color="#e15e67" style={{marginRight: 6, verticalAlign: "-0.2em"}} />;
      case "coule":
        return <Anchor size={size} color="#31eaff" style={{marginRight: 6, verticalAlign: "-0.2em"}} />;
      case "victoire":
        return <Trophy size={size} color="#ffd76e" style={{marginRight: 6, verticalAlign: "-0.2em"}} />;
      case "defaite":
        return <Skull size={size} color="#ea5b81" style={{marginRight: 7, verticalAlign: "-0.1em"}} />;
      case "nouvelle":
        return <RefreshCw size={size} color="#25e7f5" style={{marginRight: 6, verticalAlign: "-0.1em"}} />;
      default:
        return null;
    }
  }

  // ==================== RENDU =====================
  return (
    <>
      <VantaBackground />
      <div className="app-container">

        {/* --- HEADER --- */}
        <header className="main-header">
          <div className="main-header-left">
            {phase !== PHASES.LOBBY && (
              <button
                className="btn-alt menu-header-btn"
                onClick={() => setShowPauseMenu(true)}
                title="Ouvrir le menu"
              >
                <MenuIcon size={18} style={{ marginRight: 5, verticalAlign: -3 }} /> Menu
              </button>
            )}
          </div>
          <div className="main-header-title">
            <Ship
              size={44}
              color="#31dfff"
              className="lucide-title-icon"
              style={iconGlowStyle}
            />
            <span>Bataille Navale</span>
          </div>
        </header>
        <PhaseProgress phase={phase} />

        {/* ---------- PANELS CENTRAUX ----------- */}
        {(phase === PHASES.LOBBY ||
          phase === PHASES.MENU ||
          phase === PHASES.WAITING ||
          phase === PHASES.FIN ||
          phase === PHASES.WAIT_REPLAY ||
          phase === PHASES.CONFIRM_REPLAY
        ) && (
          <div className="center-panel-wrapper">
            {phase === PHASES.LOBBY && (
              <div className="card menu-panel fadein-phase">
                <Waves
                  size={44}
                  color="#31dfff"
                  strokeWidth={2.3}
                  className="panel-title-icon waves-animate"
                  aria-label="menu"
                />
                <h2 className="panel-title">
                  Menu principal
                </h2>

                <p>
                  Défiez un adversaire, placez vos navires… et coulez sa flotte !
                </p>
                <div style={{ marginBottom: 20 }}>
                  <input
                    type="text"
                    value={roomId}
                    onChange={e => setRoomId(e.target.value)}
                    placeholder="Code de salle (ex: ami123, party42)"
                    autoComplete="off"
                  />
                  <div className="footer-tip">
                    Entrez un code pour jouer avec un <strong>ami</strong>, ou laissez par défaut.
                  </div>
                </div>
                <button
                  className="btn-main"
                  onClick={() => { resetAllStates(); setEventLog([]); handleLobbyJoin(); }}
                  disabled={isConnecting}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  {isConnecting
                    ? (<><Loader2 className="animate-spin" size={22} style={{ marginRight: 9 }} />Connexion...</>)
                    : (<><Play size={20} style={{ marginRight: 8 }} />Jouer</>)
                  }
                </button>
                <div className="footer-tip" style={{ marginTop: 12, minHeight: 30 }}>
                  {statusMessage}
                </div>
              </div>
            )}

            {phase === PHASES.MENU && (
              <div className="card menu-panel waiting-card fadein-phase">
                <Hourglass
                  size={44}
                  color="#31dfff"
                  strokeWidth={2.3}
                  className="panel-title-icon"
                  aria-label="attente"
                />
                <h3 className="panel-title">
                  Salle d’attente
                </h3>

                <p>
                  Cliquez sur <strong>“Prêt”</strong> quand vous êtes prêt à jouer.
                </p>
                <button
                  className="btn-main"
                  onClick={() => { send("joueur_pret"); setStatusMessage("Attente de validation du serveur..."); }}
                  style={{ marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <Check size={20} style={{ marginRight: 8 }} /> Prêt
                </button>
                {statusMessage && (
                  <div className="status-message" style={{ marginTop: 10 }}>
                    {statusMessage}
                  </div>
                )}
              </div>
            )}

            {phase === PHASES.WAITING && (
              <div className="card waiting-card menu-panel fadein-phase">
                <Loader2
                  size={56}
                  color="#31dfff"
                  strokeWidth={2.3}
                  className="panel-title-icon animate-spin"
                  aria-label="chargement"
                />
                <h3 className="panel-title">
                  {waitingType === "searching"
                    ? "Recherche d’un adversaire…"
                    : waitingType === "waiting_ready_btn"
                      ? "En attente que l’adversaire soit prêt…"
                      : "En attente que l’adversaire termine le placement de ses navires…"}
                </h3>

              </div>
            )}

            {phase === PHASES.FIN && (
              <div className="card fin-panel fadein-phase">
                <h2 className={`fin-label ${finInfo.victoire ? "victoire" : "defaite"}`}>
                  {finInfo.victoire ? (
                    <span className="trophy-wrapper">
                      <span className="trophy-glow-halo" />
                      <span className="trophy-center">
                        <Trophy size={40} color="#ffd76e" strokeWidth={2.3} />
                      </span>
                    </span>
                  ) : (
                    <span className="skull-wrapper">
                      <span className="skull-glow-halo" />
                      <span className="skull-center">
                        <Skull size={38} color="#ea5b81" strokeWidth={2.3} />
                      </span>
                    </span>
                  )}
                  <span style={{ position: "relative", zIndex: 2 }}>
                    {finInfo.victoire ? "Victoire !" : "Défaite"}
                  </span>
                </h2>
                {!waitingReplay && !canConfirmReplay && (
                  <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
                    <button
                      className="btn-main"
                      onClick={handleRestart}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                    > 
                      <Repeat2 size={20} style={{ marginRight: 8 }} />
                      Rejouer
                    </button>
                  </div>
                )}
                {waitingReplay && <div style={{ marginTop: 20, fontSize: "1.1em" }}><Loader2 className="animate-spin" size={18} style={{ marginRight: 8 }} />En attente de l'adversaire pour rejouer...</div>}
                {canConfirmReplay && (
                  <>
                    <button
                      className="btn-main"
                      onClick={handleConfirmReplay}
                      style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <ThumbsUp size={20} style={{ marginRight: 8 }} />
                      Accepter la revanche
                    </button>
                  </>
                )}
              </div>
            )}

            {phase === PHASES.WAIT_REPLAY && (
              <div className="card menu-panel waiting-card fadein-phase">
                <Hourglass
                  size={44}
                  color="#31dfff"
                  strokeWidth={2.3}
                  className="panel-title-icon"
                  aria-label="attente"
                />
                <div className="panel-title" style={{ marginTop: 18, marginBottom: 0 }}>
                  En attente de l'adversaire pour rejouer...
                </div>
              </div>
            )}

            {phase === PHASES.CONFIRM_REPLAY && (
              <div className="card fin-panel fadein-phase">
                <p>
                  L'adversaire veut rejouer, voulez-vous aussi ?
                </p>
                <button
                  className="btn-main"
                  onClick={handleConfirmReplay}
                  style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <ThumbsUp size={20} style={{ marginRight: 8 }} />
                  Accepter la revanche
                </button>
              </div>
            )}
          </div>
        )}

        {/* ---------- PHASE PLACEMENT ----------- */}
        {phase === PHASES.PLACEMENT && (
          <div className="game-section fadein-phase" style={{ display: "flex", gap: 32 }}>
            <PlacementPanel
              grilleJoueur={grilleJoueur}
              naviresAPlacer={NAVIRES}
              naviresPlaces={naviresPlaces}
              selectedNavire={selectedNavire}
              onSelectNavire={nom => setSelectedNavire(NAVIRES.find(n => n.nom === nom))}
              orientation={orientation}
              onOrientationChange={() => setOrientation(pivotOrientation(orientation))}
              onAutoPlacement={() => send("demande_placement_auto")}
              onValidate={() => send("confirmation_placement")}
              onReset={() => {
                setNaviresPlaces([]);
                setSelectedNavire(null);
                setOrientation("HR");
                send("reinitialisation_placement");
                setStatusMessage("Placement réinitialisé !");
              }}
              canValidate={canValidate}
              message={statusMessage}
              onCellClick={handlePlacement}
            />
          </div>
        )}

        {/* ---------- PHASE BATAILLE ----------- */}
        {phase === PHASES.BATTLE && (
          <div className="game-section fadein-phase">
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <span className="tour-label">
                {getCentralStatus(statusMessage)}
              </span>
            </div>
            <GameBoard
              grilleJoueur={grilleJoueur}
              grilleAdversaire={grilleAdversaire}
              monTour={monTour}
              onAttack={(i, j) => send("attaque", { coordonnees: [i, j] })}
            />
          </div>
        )}

        {showPauseMenu && (
        <div className="pause-modal">
          <div className="pause-modal-content">
            <h2 className="panel-title" style={{ marginBottom: 24 }}>
              Menu
            </h2>
            <button
              className="btn-main"
              onClick={() => setShowPauseMenu(false)}
              style={{ marginBottom: 14 }}
            >
              Reprendre la partie
            </button>
            <button
              className="btn-main btn-reset"
              onClick={() => {
                if (window.confirm("Voulez-vous vraiment abandonner la partie ?")) {
                  setShowPauseMenu(false);
                  handleQuitter();
                }
              }}
              style={{ marginBottom: 8 }}
            >
              Abandonner la partie
            </button>
            {/* Ajout d’autres options plus tard */}
          </div>
          <div
            className="pause-modal-bg"
            onClick={() => setShowPauseMenu(false)}
            tabIndex={-1}
          />
        </div>
      )}

      <div className="event-log-container">
        <div className="event-log-label event-log-label-center">
          <FileText size={18} style={{marginRight: 8, verticalAlign: "-0.18em"}} strokeWidth={2.3} />
          Journal des événements
        </div>
        <div className="event-log-divider" />
        {eventLog.length === 0 ? (
          <div className="event-log-empty">
            <span className="empty-log-icon">
              <FileText size={22} strokeWidth={2.3} />
            </span>
            <span className="empty-log-text">Aucun événement pour l’instant…</span>
          </div>
        ) : (
          eventLog.slice(-7).map((ev, i, arr) => (
            <React.Fragment key={i}>
              <div className="event-log-entry">
                <span className="event-log-time">{ev.time}</span>
                <span className="log-icon"><LogIcon type={ev.type} /></span>
                {ev.msg}
              </div>
            </React.Fragment>
          ))
        )}
      </div>

        <footer>
          <small>© {new Date().getFullYear()} Bataille Navale Web</small>
        </footer>
      </div>
      <style>{`
        .animate-spin { animation: spin 1.1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .wow-bounce {
          animation: wow-bounce 0.55s cubic-bezier(.23,1.4,.48,.95);
        }
        @keyframes wow-bounce {
          0% { transform: scale(1);}
          45% { transform: scale(1.38);}
          65% { transform: scale(0.91);}
          100% { transform: scale(1);}
        }
      `}</style>
    </>
  );
}