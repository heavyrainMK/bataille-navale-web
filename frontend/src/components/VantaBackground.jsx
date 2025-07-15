/**
 * *******************************************************
 * Nom ......... : VantaBackground.jsx
 * Rôle ........ : Composant React pour l’arrière-plan animé à base de VANTA.WAVES
 * Auteur ...... : Maxim Khomenko
 * Version ..... : 1.0.0 du 14/07/2025
 * Licence ..... : Réalisé dans le cadre du cours de Réseaux
 * Description . : Applique une animation de vagues fluide sur tout l’écran
 *                 sans interférer avec les interactions utilisateur.
 *                 S’appuie sur la librairie externe VANTA.js.
 *
 * Technologies  : JavaScript (React, VANTA)
 * Dépendances . : React, VANTA.WAVES (injection globale dans window)
 * Usage ....... : Utilisé dans App.jsx pour enrichir visuellement l’arrière-plan
 * *******************************************************
 */

import React, { useRef, useEffect } from "react";

export default function VantaBackground() {
  // Référence vers le div cible pour l’effet VANTA
  const vantaRef = useRef(null);
  // Référence vers l’instance de l’effet, pour nettoyage
  const effectRef = useRef(null);

  useEffect(() => {
    // On vérifie que VANTA.WAVES est bien chargé dans window (lib JS externe)
    if (window.VANTA && window.VANTA.WAVES) {
      effectRef.current = window.VANTA.WAVES({
        el: vantaRef.current,
        mouseControls: true,
        touchControls: true,
        minHeight: 600.0,
        minWidth: 600.0,
        color: 0x2262ee,            // Couleur des vagues
        shininess: 45.0,            // Brillance
        waveHeight: 18.0,           // Hauteur des vagues
        waveSpeed: 1.2,             // Vitesse d’animation
        zoom: 0.95,                 // Zoom sur le motif
        backgroundColor: 0x1e346d,  // Couleur de fond
      });
    }
    // Nettoyage de l’effet lors du démontage du composant
    return () => {
      if (effectRef.current) {
        effectRef.current.destroy();
        effectRef.current = null;
      }
    };
  }, []);

  // Affiche le conteneur plein écran pour l’animation
  return (
    <div
      ref={vantaRef}
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        width: "100vw",
        height: "100vh",
        zIndex: -1,
        pointerEvents: "none" // Les clics/passages souris sont transmis aux éléments au-dessus
      }}
    />
  );
}