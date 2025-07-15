/**
 * *******************************************************
 * Nom ......... : GameBoard.jsx
 * Rôle ........ : Composant React d'affichage des grilles (joueur + adversaire)
 * Auteur ...... : Maxim Khomenko
 * Version ..... : 1.0.0 du 14/07/2025
 * Licence ..... : Réalisé dans le cadre du cours de Réseaux
 * Description . : Affiche les deux grilles du jeu avec labels, interactions clavier/souris,
 *                 retour visuel des attaques, accessibilité, et gestion du tour actif.
 *
 * Technologies  : JavaScript (React)
 * Dépendances . : React
 * Usage ....... : Importé dans App.jsx pour afficher l'état de la partie et permettre les attaques
 * *******************************************************
 */

import React, { useState } from "react";

// Constantes pour les labels de colonnes et lignes
const COL_LABELS = "ABCDEFGHIJ".split("");
const ROW_LABELS = Array.from({ length: 10 }, (_, i) => (i + 1).toString());

export default function GameBoard({
  grilleJoueur,
  grilleAdversaire = [],
  monTour = false,
  onAttack,
}) {
  const size = grilleJoueur.length || 10;

  // État : l’indice n’affiche le message d’aide qu’une fois par partie
  const [hintShown, setHintShown] = useState(false);

  /**
   * Génère la grille avec les labels ligne et colonne.
   * @param {Array} grid - Grille à afficher
   * @param {boolean} isOpponent - Vrai si c’est la grille adverse
   */
  const renderLabeledGrid = (grid, isOpponent) => (
    <div
      className="labeled-grid"
      style={{
        display: "grid",
        gridTemplateColumns: `32px repeat(${size}, 1fr)`,
        gridTemplateRows: `32px repeat(${size}, 1fr)`,
        gap: 0,
      }}
    >
      {/* Coin vide */}
      <div style={{ gridRow: 1, gridColumn: 1 }} />
      {/* Labels des colonnes */}
      {COL_LABELS.map((col, j) => (
        <div
          key={"col-label-" + col}
          style={{
            gridRow: 1,
            gridColumn: j + 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "1.05em",
            color: "#1b3149",
            letterSpacing: ".04em",
            userSelect: "none",
            pointerEvents: "none",
            opacity: 0.94,
            height: "100%",
            textShadow: "0 1px 3px #f3f8ff77",
          }}
        >
          {col}
        </div>
      ))}
      {/* Labels des lignes + cellules */}
      {Array(size)
        .fill()
        .map((_, i) =>
          [
            // Label de la ligne à gauche
            <div
              key={"row-label-" + i}
              style={{
                gridRow: i + 2,
                gridColumn: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "1.05em",
                color: "#1b3149",
                letterSpacing: ".03em",
                userSelect: "none",
                pointerEvents: "none",
                opacity: 0.94,
                height: "100%",
                textShadow: "0 1px 3px #f3f8ff77",
              }}
            >
              {ROW_LABELS[i]}
            </div>,
            // Cellules de la ligne
            ...Array(size)
              .fill()
              .map((_, j) => {
                // Détecte si la cellule peut être cliquée
                const canClick = isOpponent
                  ? monTour && grid[i]?.[j] === "~"
                  : false; // pas de clic sur la grille du joueur
                let className = getClass(grid[i]?.[j], isOpponent);

                return (
                  <div
                    key={(isOpponent ? "a" : "j") + i + "-" + j}
                    className={className}
                    tabIndex={canClick ? 0 : -1}
                    role={canClick ? "button" : undefined}
                    aria-pressed={canClick ? false : undefined}
                    aria-label={
                      isOpponent
                        ? `Cellule adverse ${COL_LABELS[j]}${ROW_LABELS[i]}`
                        : `Cellule ${COL_LABELS[j]}${ROW_LABELS[i]}`
                    }
                    style={{
                      cursor: canClick ? "pointer" : "default",
                      outline: "none",
                      userSelect: "none",
                    }}
                    // Gestion du clic sur une cellule adverse (attaque)
                    onClick={
                      isOpponent && canClick
                        ? () => {
                            if (!hintShown) setHintShown(true);
                            onAttack(i, j);
                          }
                        : undefined
                    }
                    // Gestion du clavier (accessibilité)
                    onKeyDown={
                      canClick
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              if (!hintShown) setHintShown(true);
                              onAttack(i, j);
                            }
                          }
                        : undefined
                    }
                  >
                    {getContent(grid[i]?.[j], isOpponent)}
                  </div>
                );
              }),
          ]
        )}
    </div>
  );

  /**
   * Détermine la classe CSS de la cellule selon son contenu.
   */
  function getClass(cell, isOpponent) {
    if (cell === "~") return "grid-cell";
    if (cell === "O") return "grid-cell miss";
    if (cell === "X") return "grid-cell hit";
    if (Array.isArray(cell)) {
      if (isOpponent) return "grid-cell sunk";
      const [, etat] = cell;
      if (etat === "S") return "grid-cell ship";
      if (etat === "X") return "grid-cell hit";
      if (etat === "C") return "grid-cell sunk";
    }
    return "grid-cell";
  }

  /**
   * Contenu (symbole ou texte) à afficher dans la cellule.
   */
  function getContent(cell, isOpponent) {
    if (cell === "O") return "•";      // Case manquée
    if (cell === "X") return "✖";      // Case touchée
    if (Array.isArray(cell)) {
      if (isOpponent) return "⚓";     // Navire coulé sur la grille adverse
      const [, etat, nom] = cell;
      if (etat === "S") return nom ? nom[0] : ""; // Première lettre du nom du navire
      if (etat === "C") return "⚓";   // Navire coulé
      if (etat === "X") return "✖";   // Navire touché
    }
    return "";
  }

  return (
    <div className="gameboards">
      <div className="card board-section">
        <h3 className="title-glass">Votre grille</h3>
        <div className="grid-container-wrapper">{renderLabeledGrid(grilleJoueur, false)}</div>
      </div>
      {grilleAdversaire && grilleAdversaire.length > 0 && (
        <div className="card board-section">
          <h3 className="title-glass">Grille adverse</h3>
          <div className="grid-container-wrapper">{renderLabeledGrid(grilleAdversaire, true)}</div>
          {monTour && !hintShown && (
            <div
              style={{
                background: "rgba(21,42,85,0.41)",
                color: "#ffe564",
                padding: "8px 20px",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "1.09em",
                margin: "16px auto 6px auto",
                boxShadow: "0 1px 10px #2262ee22",
                textAlign: "center",
                maxWidth: 410,
                textShadow: "0 2px 8px #224be955"
              }}
            >
              C’est votre tour : cliquez sur la grille adverse.
            </div>
          )}
        </div>
      )}
    </div>
  );
}