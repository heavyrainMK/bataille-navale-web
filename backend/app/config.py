# *******************************************************
# Nom ......... : config.py
# Rôle ........ : Configuration globale du backend du jeu de bataille navale
# Auteur ..... : Maxim Khomenko
# Version ..... : V1.0.0 du 14/07/2025
# Licence ..... : Réalisé dans le cadre du cours de Réseaux
# Description . : Définit les constantes du serveur, les paramètres de jeu (taille de grille,
#                 types de navires), les couleurs pour l'affichage, les réglages de sécurité
#                 et les options de debug, avec possibilité de surcharger via les variables d’environnement.
#
# Technologies  : Python
# Dépendances . : os
# Usage ....... : Importé par les modules du backend pour un accès centralisé aux constantes
# *******************************************************

import os

# === Paramètres réseau ===
HÔTE = os.environ.get("BATTLESHIP_HOST", "0.0.0.0")
PORT = int(os.environ.get("BATTLESHIP_PORT", 8000))

# === Paramètres du jeu ===
TAILLE_GRILLE = 10  # Taille de la grille (par défaut 10x10)

# Liste des navires disponibles avec leur taille
NAVIRES = [
    {"nom": "Porte-avions", "taille": 5},
    {"nom": "Croiseur", "taille": 4},
    {"nom": "Contre-torpilleur", "taille": 3},
    {"nom": "Sous-marin", "taille": 3},
    {"nom": "Torpilleur", "taille": 2},
]

# Couleurs attribuées à chaque type de navire (utilisées côté interface ou logs)
COULEURS_NAVIRES = {
    "Porte-avions": "vert",
    "Croiseur": "bleu",
    "Contre-torpilleur": "violet",
    "Sous-marin": "orange",
    "Torpilleur": "marron",
}

# === Clé secrète pour la sécurité des sessions WebSocket ===
CLÉ_SECRÈTE = os.environ.get("BATTLESHIP_SECRET", "clé-dev-À-CHANGER")