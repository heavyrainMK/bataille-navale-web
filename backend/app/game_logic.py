# *******************************************************
# Nom ......... : game_logic.py
# Rôle ........ : Logique métier du jeu de bataille navale (placement, attaque, victoire)
# Auteur ...... : Maxim Khomenko
# Version ..... : 1.0.0 du 14/07/2025
# Licence ..... : Réalisé dans le cadre du cours de Réseaux
# Description . : Gère les grilles des joueurs, le placement manuel et automatique des navires,
#                 la validation des positions, les attaques, la détection de fin de partie,
#                 ainsi que le contrôle du tour et la réinitialisation de la partie.
#
# Technologies  : Python
# Dépendances . : random, typing
# Usage ....... : Importé par le backend FastAPI pour orchestrer la logique de jeu
# *******************************************************

from typing import List, Tuple, Dict, Optional
import random
from .config import TAILLE_GRILLE, NAVIRES
from .utils import grille_vide, positions_navire

# Alias pour désigner une coordonnée sur la grille
Coordonnee = Tuple[int, int]

class LogiqueJeu:
    """
    Classe centrale de gestion du jeu de bataille navale.
    Gère les états des joueurs, le placement des navires, les attaques, et le déroulement d'une partie.
    """

    def __init__(self):
        """
        Initialise les états internes pour deux joueurs :
        - grilles, navires, statut de préparation, etc.
        """
        self.grilles: List[List[List]] = [grille_vide(), grille_vide()]
        self.navires: List[List[dict]] = [[], []]
        self.pret: List[bool] = [False, False]
        self.navires_places: List[bool] = [False, False]
        self.types_navires_places: List[Dict[str, bool]] = [{}, {}]
        self.tour_actuel: Optional[int] = None

    def changer_tour(self):
        """
        Change le tour actif vers l’autre joueur.
        """
        if self.tour_actuel is not None:
            self.tour_actuel = 1 - self.tour_actuel

    def _positions_sont_valides(self, grille, positions):
        """
        Vérifie que toutes les positions données sont valides pour placer un navire :
        - dans les limites de la grille,
        - libres,
        - sans contact direct avec un autre navire.
        """
        for xi, yi in positions:
            if not (0 <= xi < TAILLE_GRILLE and 0 <= yi < TAILLE_GRILLE):
                return False
            if grille[xi][yi] != "~":
                return False
            # Vérifie les cases adjacentes (pas de contact navires)
            for dx in [-1, 0, 1]:
                for dy in [-1, 0, 1]:
                    xj, yj = xi + dx, yi + dy
                    if 0 <= xj < TAILLE_GRILLE and 0 <= yj < TAILLE_GRILLE:
                        case = grille[xj][yj]
                        if case not in ("~", "O", "X"):
                            return False
        return True

    def est_placement_valide(self, grille, taille_navire, x, y, orientation):
        """
        Vérifie si un placement de navire est possible à la position (x, y) avec la taille et l’orientation données.
        """
        positions = positions_navire(x, y, taille_navire, orientation)
        return self._positions_sont_valides(grille, positions)

    def placer_navire(self, id_joueur, taille_navire, coordonnees, orientation, nom_navire):
        """
        Place un navire sur la grille d’un joueur.
        Retourne True si le placement a réussi, False sinon.
        """
        x, y = coordonnees
        positions = positions_navire(x, y, taille_navire, orientation)
        if not self._positions_sont_valides(self.grilles[id_joueur], positions):
            return False
        if nom_navire in self.types_navires_places[id_joueur]:
            return False  # Déjà placé
        id_navire = f"navire_{len(self.navires[id_joueur])}_{nom_navire}"
        for (xi, yi) in positions:
            self.grilles[id_joueur][xi][yi] = [id_navire, 'S', nom_navire]
        self.navires[id_joueur].append({
            'taille': taille_navire,
            'coordonnees': (x, y),
            'orientation': orientation,
            'id': id_navire,
            'nom': nom_navire
        })
        self.types_navires_places[id_joueur][nom_navire] = True
        return True

    def tous_navires_places(self, id_joueur):
        """
        Vérifie si tous les navires obligatoires ont bien été placés par un joueur.
        """
        noms_requis = [n['nom'] for n in NAVIRES]
        return all(n in self.types_navires_places[id_joueur] for n in noms_requis)

    def reset_etats_joueur(self, id_joueur):
        """
        Réinitialise la grille, la liste des navires et des types placés pour un joueur donné.
        """
        self.grilles[id_joueur] = grille_vide()
        self.navires[id_joueur] = []
        self.types_navires_places[id_joueur] = {}

    def placement_automatique(self, id_joueur):
        """
        Place automatiquement tous les navires pour un joueur de manière aléatoire.
        Soulève une exception si un navire ne peut être placé.
        """
        self.reset_etats_joueur(id_joueur)
        for navire in NAVIRES:
            trouve = False
            essais = 0
            while not trouve and essais < 100:
                x = random.randint(0, TAILLE_GRILLE - 1)
                y = random.randint(0, TAILLE_GRILLE - 1)
                orientation = random.choice(["HR", "HL", "VD", "VU"])
                if self.placer_navire(id_joueur, navire['taille'], (x, y), orientation, navire['nom']):
                    trouve = True
                essais += 1
            if not trouve:
                raise Exception(f"Impossible de placer le navire {navire['nom']}")
        return self.grilles[id_joueur]

    def _positions_navire_sur_grille(self, grille, id_navire):
        """
        Renvoie la liste de toutes les coordonnées occupées par un navire spécifique sur une grille.
        """
        return [
            (i, j)
            for i in range(TAILLE_GRILLE)
            for j in range(TAILLE_GRILLE)
            if isinstance(grille[i][j], list) and grille[i][j][0] == id_navire
        ]

    def traiter_attaque(self, id_cible, x, y):
        """
        Gère la logique d’une attaque :
        - Met à jour la grille cible
        - Détecte touche, coulé, gagné ou manqué
        - Retourne un dictionnaire de résultat pour l’UI/backend
        """
        if not (0 <= x < TAILLE_GRILLE and 0 <= y < TAILLE_GRILLE):
            return {"resultat": "invalide", "peut_rejouer": False}
        cellule = self.grilles[id_cible][x][y]
        if isinstance(cellule, list):
            id_navire, etat, nom_navire = cellule
            if etat == 'S':
                self.grilles[id_cible][x][y] = [id_navire, 'X', nom_navire]
                # Vérifie si le navire est coulé
                positions = self._positions_navire_sur_grille(self.grilles[id_cible], id_navire)
                navire_coule = all(self.grilles[id_cible][i][j][1] != 'S' for (i, j) in positions)
                if navire_coule:
                    for (i, j) in positions:
                        self.grilles[id_cible][i][j] = [id_navire, 'C', nom_navire]
                    nom_navire_reel = id_navire.split("_", 2)[2]
                    taille_navire = next(n['taille'] for n in NAVIRES if n['nom'] == nom_navire_reel)
                    tous_coules = not any(
                        isinstance(self.grilles[id_cible][i][j], list) and self.grilles[id_cible][i][j][1] == 'S'
                        for i in range(TAILLE_GRILLE) for j in range(TAILLE_GRILLE)
                    )
                    resultat = "gagne" if tous_coules else "coule"
                    return {
                        "resultat": resultat,
                        "peut_rejouer": (resultat == "coule"),
                        "taille_navire": taille_navire,
                        "nom_navire": nom_navire_reel,
                        "positions_coule": positions,
                        "partie_finie": (resultat == "gagne"),
                        "coordonnees": (x, y)
                    }
                else:
                    return {"resultat": "touche", "peut_rejouer": True, "coordonnees": (x, y)}
            else:
                return {"resultat": "deja_attaque", "peut_rejouer": False, "coordonnees": (x, y)}
        elif cellule == '~':
            self.grilles[id_cible][x][y] = 'O'
            return {"resultat": "manque", "peut_rejouer": False, "coordonnees": (x, y)}
        else:
            return {"resultat": "deja_attaque", "peut_rejouer": False, "coordonnees": (x, y)}

    def reinitialiser_partie(self):
        """
        Réinitialise l’état complet du jeu pour les deux joueurs (début d’une nouvelle partie).
        """
        for id_joueur in [0, 1]:
            self.reset_etats_joueur(id_joueur)
        self.pret = [False, False]
        self.tour_actuel = None