# *******************************************************
# Nom ......... : utils.py
# Rôle ........ : Fonctions utilitaires pour la gestion des grilles et des positions de navires
# Auteur ...... : Maxim Khomenko
# Version ..... : 1.0.0 du 14/07/2025
# Licence ..... : Réalisé dans le cadre du cours de Réseaux
# Description . : Fournit les outils nécessaires à la création de grilles vides et au calcul
#                 des coordonnées occupées par les navires selon leur orientation.
#
# Technologies  : Python
# Dépendances . : app.config
# Usage ....... : Utilisé dans game_logic.py pour gérer les placements et l’état des grilles
# *******************************************************

from app.config import TAILLE_GRILLE

def positions_navire(x: int, y: int, taille: int, orientation: str):
    """
    Calcule toutes les coordonnées qu’occupera un navire sur la grille
    à partir de sa position de départ, de sa taille et de son orientation.

    Args:
        x (int): Ligne de départ (indice)
        y (int): Colonne de départ (indice)
        taille (int): Longueur du navire
        orientation (str): Orientation du navire ("HR", "HL", "VD", "VU")
            - "HR": Horizontal droite (vers la droite)
            - "HL": Horizontal gauche (vers la gauche)
            - "VD": Verticale descendante (vers le bas)
            - "VU": Verticale montante (vers le haut)

    Returns:
        List[Tuple[int, int]]: Liste des coordonnées (ligne, colonne) occupées par le navire.
    """
    if orientation == "HR":  # Horizontal droite
        return [(x, y + i) for i in range(taille)]
    elif orientation == "HL":  # Horizontal gauche
        return [(x, y - i) for i in range(taille)]
    elif orientation == "VD":  # Verticale descendante
        return [(x + i, y) for i in range(taille)]
    elif orientation == "VU":  # Verticale montante
        return [(x - i, y) for i in range(taille)]
    return []

def grille_vide():
    """
    Génère une grille vide de la taille définie dans la configuration.

    Returns:
        List[List[str]]: Grille carrée remplie de '~' représentant la mer.
    """
    return [['~' for _ in range(TAILLE_GRILLE)] for _ in range(TAILLE_GRILLE)]