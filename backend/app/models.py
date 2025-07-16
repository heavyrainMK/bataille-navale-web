# *******************************************************
# Nom ......... : models.py
# Rôle ........ : Définition des modèles Pydantic pour les actions du jeu et la validation des messages
# Auteur ...... : Maxim Khomenko
# Version ..... : 1.0.0 du 14/07/2025
# Licence ..... : Réalisé dans le cadre du cours de Réseaux
# Description . : Fournit l'ensemble des schémas utilisés pour échanger les données entre
#                 le frontend React et le backend FastAPI (WebSocket/REST),
#                 incluant les actions de jeu, les grilles, et les réponses standard.
#
# Technologies  : Python, Pydantic
# Dépendances . : typing, pydantic
# Usage ....... : Importé dans main.py pour la validation des messages côté serveur
# *******************************************************

from typing import List, Tuple, Optional, Literal, Union
from pydantic import BaseModel

# ------------------------------------------------------------
#  Modèle générique simple pour toutes les actions ne nécessitant que "action"
# ------------------------------------------------------------
class SimpleActionPayload(BaseModel):
    """
    Représente une action simple n'ayant que le champ "action".
    """
    action: str

# ------------------------------------------------------------
#  Types utilitaires de base
# ------------------------------------------------------------

Coordonnee = Tuple[int, int]  # ex : (3, 5)
EtatCellule = Union[str, List[Union[str, int]]]  # '~', 'O', 'X', ou [id, état, nom_navire]

# ------------------------------------------------------------
#  Modèles pour le jeu de bataille navale
# ------------------------------------------------------------

class ModeleNavire(BaseModel):
    """
    Décrit un navire placé sur la grille.
    """
    nom: str
    taille: int
    orientation: Literal["HR", "HL", "VD", "VU"]
    coordonnees: Coordonnee

class ModeleGrille(BaseModel):
    """
    Représente l'état d'une grille de jeu.
    """
    grille: List[List[EtatCellule]]

class PlacementNavirePayload(BaseModel):
    """
    Données pour l'action de placement d'un navire.
    """
    action: Literal["placer_navire"]
    taille_navire: int
    coordonnees: Coordonnee
    orientation: Literal["HR", "HL", "VD", "VU"]
    nom_navire: str

class ConfirmationPlacementPayload(BaseModel):
    """
    Données pour l'action de confirmation du placement des navires.
    """
    action: Literal["confirmation_placement"]

class ReinitialisationPlacementPayload(BaseModel):
    """
    Données pour l'action de réinitialisation du placement des navires.
    """
    action: Literal["reinitialisation_placement"]

class AttaquePayload(BaseModel):
    """
    Données pour l'action d'attaque sur la grille adverse.
    """
    action: Literal["attaque"]
    coordonnees: Coordonnee

class ResultatAttaquePayload(BaseModel):
    """
    Réponse de résultat d'une attaque (touche, coulé, etc.).
    """
    action: Literal["resultat_attaque"]
    resultat: Literal["touche", "manque", "coule", "gagne", "deja_attaque"]
    coordonnees: Coordonnee
    type_joueur: Literal["attaquant", "defenseur"]
    peut_rejouer: bool
    taille_navire: Optional[int] = None
    nom_navire: Optional[str] = None
    positions_coule: Optional[List[Coordonnee]] = None
    symbole_cle: Optional[str] = None

class FinPartiePayload(BaseModel):
    """
    Données envoyées à la fin de la partie.
    """
    action: Literal["fin_partie"]
    gagnant: int
    grille_joueur: List[List[EtatCellule]]
    grille_adversaire: List[List[EtatCellule]]

class MessageGeneriquePayload(BaseModel):
    """
    Message générique avec texte (utilisé pour info/erreur).
    """
    action: str
    message: str

# ------------------------------------------------------------
#  Union générale de tous les payloads pour validation automatique
# ------------------------------------------------------------
TousPayloads = Union[
    PlacementNavirePayload,
    ConfirmationPlacementPayload,
    ReinitialisationPlacementPayload,
    AttaquePayload,
    ResultatAttaquePayload,
    FinPartiePayload,
    MessageGeneriquePayload,
    SimpleActionPayload,
]

# ------------------------------
#  Réponses du serveur
# ------------------------------

class ReponseJoueurConnecte(BaseModel):
    """
    Réponse envoyée lors de la connexion d'un joueur.
    """
    action: Literal["player_joined"]
    player_index: int
    player_id: str

class ReponsePret(BaseModel):
    """
    Réponse pour signaler que la partie peut commencer.
    """
    action: Literal["ready"]
    message: str

class ReponseErreur(BaseModel):
    """
    Réponse standard d'erreur côté serveur.
    """
    action: Literal["erreur"]
    message: str

class ReponseTousNaviresPrets(BaseModel):
    """
    Réponse indiquant que tous les navires sont placés et que la bataille commence.
    """
    action: Literal["tous_navires_prets"]
    message: str