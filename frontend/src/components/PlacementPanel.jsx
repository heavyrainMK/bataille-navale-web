/**
 * *******************************************************
 * Nom ......... : PlacementPanel.jsx
 * Rôle ........ : Composant React de gestion du placement des navires
 * Auteur ...... : Maxim Khomenko
 * Version ..... : 1.0.0 du 14/07/2025
 * Licence ..... : Réalisé dans le cadre du cours de Réseaux
 * Description . : Affiche la grille interactive pour placer les navires,
 *                 propose des options de rotation, placement automatique,
 *                 et permet la validation du placement initial.
 *
 * Technologies  : JavaScript (React)
 * Dépendances . : React, lucide-react
 * Usage ....... : Utilisé dans App.jsx pendant la phase de préparation du jeu
 * *******************************************************
 */

import React, { useState, useEffect } from "react";
import { Check, RefreshCw, Wand2, Sailboat } from "lucide-react";

// Définition des décalages pour chaque orientation de navire
const ORIENTATION_DELTAS = {
  HR: [0, 1],   // horizontal droite
  HL: [0, -1],  // horizontal gauche
  VD: [1, 0],   // vertical bas
  VU: [-1, 0],  // vertical haut
};

export default function PlacementPanel({
  grilleJoueur,
  size = 10,
  naviresAPlacer,
  naviresPlaces,
  selectedNavire,
  onSelectNavire,
  orientation,
  onOrientationChange,
  onAutoPlacement,
  onValidate,
  onReset,
  canValidate,
  placing = false,
  onCellClick,
}) {
  const [hoverCell, setHoverCell] = useState(null);
  const [hintShown, setHintShown] = useState(false);

  // Permet de pivoter l’orientation du navire avec la touche T
  useEffect(() => {
    if (!selectedNavire || !onOrientationChange) return;
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === "t") {
        e.preventDefault();
        const order = ["HR", "VD", "HL", "VU"];
        const idx = order.indexOf(orientation);
        onOrientationChange(order[(idx + 1) % order.length]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNavire, orientation, onOrientationChange]);

  /**
   * Calcule la liste des cases (coordonnées) pour la prévisualisation du navire à placer.
   */
  function getPreviewCells(i, j) {
    if (!selectedNavire) return [];
    const [dx, dy] = ORIENTATION_DELTAS[orientation] || [0, 1];
    const cells = [];
    for (let k = 0; k < selectedNavire.taille; k++) {
      const x = i + dx * k;
      const y = j + dy * k;
      if (x < 0 || x >= size || y < 0 || y >= size) return [];
      cells.push([x, y]);
    }
    return cells;
  }

  /**
   * Vérifie si toutes les cases de l’aperçu de placement sont libres.
   */
  function canPlacePreview(cells) {
    return cells.length > 0 && cells.every(([x, y]) => {
      const val = grilleJoueur?.[x]?.[y];
      return val === "~";
    });
  }

  // Gère le clic sur une cellule de la grille lors du placement manuel
  function handleCellClick(i, j) {
    if (!hintShown && selectedNavire && onCellClick) {
      setHintShown(true);
    }
    if (onCellClick) onCellClick(i, j);
  }

  /**
   * Génère la grille de placement du joueur (affichage + interactions preview).
   */
  function renderGrid() {
    let previewCells = [];
    if (selectedNavire && hoverCell) {
      previewCells = getPreviewCells(hoverCell[0], hoverCell[1]);
    }
    const previewValid = canPlacePreview(previewCells);

    return (
      <div className="grid-container">
        {Array(size)
          .fill()
          .map((_, i) =>
            Array(size)
              .fill()
              .map((_, j) => {
                const cell = grilleJoueur?.[i]?.[j];
                const isShip = Array.isArray(cell);
                const isPreview =
                  selectedNavire &&
                  previewCells.some(([x, y]) => x === i && y === j);

                let className = "grid-cell";
                if (isShip) className += " ship";
                if (isPreview) {
                  className += " preview-cell";
                  if (!previewValid) className += " preview-invalid";
                }

                return (
                  <div
                    key={i + "-" + j}
                    className={className}
                    tabIndex={0}
                    onClick={() =>
                      isPreview && previewValid && handleCellClick(i, j)
                    }
                    onMouseEnter={() => setHoverCell([i, j])}
                    onMouseLeave={() => setHoverCell(null)}
                  >
                    {/* Preview : lettre du navire sélectionné */}
                    {isPreview && selectedNavire ? (
                      <span style={{ opacity: 0.7, fontWeight: 700, color: "#2563eb" }}>
                        {selectedNavire.nom[0]}
                      </span>
                    ) : isShip ? (
                      cell[2] ? cell[2][0] : ""
                    ) : (
                      ""
                    )}
                  </div>
                );
              })
          )}
      </div>
    );
  }

  /**
   * Affiche le message d’aide contextuel (apparaît une seule fois avant le 1er clic).
   */
  function renderPlacementHint() {
    if (hintShown) return null;
    if (!selectedNavire) {
      return (
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
          Sélectionnez un navire à placer<br />
          <span style={{ fontWeight: 500, color: "#ffe564", fontSize: "0.98em" }}>
            ou utilisez le bouton “Placement automatique”
          </span>
        </div>
      );
    }
    return (
      <div
        style={{
          background: "rgba(21,42,85,0.23)",
          color: "#fff",
          padding: "8px 20px",
          borderRadius: "8px",
          fontWeight: 500,
          fontSize: "1.09em",
          margin: "16px auto 6px auto",
          boxShadow: "0 1px 10px #2262ee19",
          textAlign: "center",
          maxWidth: 410,
          textShadow: "0 2px 7px #1592d633"
        }}
      >
        <span style={{ color: "#ffe564", fontWeight: 700 }}>
          {selectedNavire.nom}
        </span>
        {" "}({selectedNavire.taille} cases) : cliquez sur la grille pour placer, appuyez sur <b>T</b> pour pivoter.
      </div>
    );
  }

  return (
    <div className="placement-panel" style={{ position: "relative", flexDirection: "column" }}>
      <div className="placement-flex">
        {/* Titre avec icône bateau */}
        <div className="placement-header-center horizontal-header">
          <Sailboat size={44} color="#31dfff" strokeWidth={2.3} className="panel-title-icon" />
          <h2 className="panel-title" style={{ margin: 0, marginLeft: 14, display: "inline-block", verticalAlign: "middle" }}>
            Placement des navires
          </h2>
        </div>
        <div className="placement-board-part">
          {renderGrid()}
          {renderPlacementHint()} {/* Message d’aide affiché sous la grille */}
          {/* Boutons d’actions sous la grille */}
          <div className="placement-actions-under-grid">
            <div className="actions-row">
              <button className="btn-main btn-secondary"
                onClick={() => {
                  setHintShown(true); // Cache le hint après auto-placement
                  onAutoPlacement();
                }}
                disabled={placing}
              >
                <Wand2 size={18} style={{ marginRight: 8, verticalAlign: -3 }} />
                Placement automatique
              </button>
              <button className="btn-main btn-reset"
                onClick={onReset}
                disabled={placing}
              >
                <RefreshCw size={18} style={{ marginRight: 8, verticalAlign: -3 }} />
                Réinitialiser
              </button>
            </div>
            <button className="btn-main btn-validate"
              onClick={onValidate}
              disabled={!canValidate || placing}
            >
              {placing ? (
                <span>
                  <span className="loader" style={{
                    width: 16, height: 16, border: "2.5px solid #fff",
                    borderRadius: "50%", borderRightColor: "transparent", display: "inline-block", marginRight: 8, animation: "spin 1s linear infinite"
                  }} />{" "}
                  Validation...
                </span>
              ) : (
                <>
                  <Check size={22} color="#fff" style={{ marginRight: 10, verticalAlign: -3 }} />
                  Valider
                </>
              )}
            </button>
          </div>
        </div>
        <div className="placement-actions-part">
          {/* Liste des navires à placer */}
          <div className="navires-list">
            {naviresAPlacer.map((nav) => (
              <button
                key={nav.nom}
                className={`navire-btn${selectedNavire?.nom === nav.nom ? " selected" : ""}`}
                onClick={() => onSelectNavire(nav.nom)}
                disabled={naviresPlaces.includes(nav.nom)}
                tabIndex={0}
              >
                {nav.nom}
                <span style={{
                  display: "inline-block",
                  background: "#1592d6",
                  color: "#e7fcff",
                  fontWeight: 800,
                  fontSize: "0.96em",
                  borderRadius: "8px",
                  padding: "2px 8px",
                  marginLeft: 8,
                  letterSpacing: "0.05em"
                }}>{nav.taille}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Animation loader pour bouton valider */}
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}