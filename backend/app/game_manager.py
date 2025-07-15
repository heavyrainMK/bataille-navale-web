# *******************************************************
# Nom ......... : game_manager.py
# Rôle ........ : Gestion des salles et des joueurs pour les parties de bataille navale
# Auteur ...... : Maxim Khomenko
# Version ..... : 1.0.0 du 14/07/2025
# Licence ..... : Réalisé dans le cadre du cours de Réseaux
# Description . : Contient les classes permettant de créer et suivre les salles de jeu,
#                 d’y ajouter ou retirer les joueurs, de gérer leurs statuts (prêt, websocket),
#                 et de réinitialiser les parties si besoin.
#
# Technologies  : Python
# Dépendances . : uuid, typing
# Usage ....... : Importé par le backend pour gérer dynamiquement les parties multijoueurs
# *******************************************************

import uuid
from typing import Dict, Optional
from .game_logic import LogiqueJeu

class SalleDeJeu:
    """
    Représente une salle de jeu avec sa logique de jeu et ses joueurs.
    Gère les connexions, les statuts de préparation et la communication par websocket.
    """

    def __init__(self):
        self.id = str(uuid.uuid4())
        self.logique = LogiqueJeu()  # Logique de jeu spécifique à cette salle
        self.joueurs = {}  # player_id -> index (0 ou 1)
        self.ws = {}       # player_id -> websocket (ou None)
        self.pret = {}     # player_id -> bool (prêt à jouer)
        self.rejouer_pret = {}  # player_id -> bool (prêt pour rejouer)

    def ajouter_joueur(self, id_joueur, ws=None):
        """
        Ajoute un joueur à la salle.  
        Retourne l’index du joueur (0 ou 1), ou False si la salle est pleine.
        """
        if len(self.joueurs) >= 2:
            return False
        idx = 0 if 0 not in self.joueurs.values() else 1
        self.joueurs[id_joueur] = idx
        self.ws[id_joueur] = ws
        self.pret[id_joueur] = False
        return idx

    def retirer_joueur(self, id_joueur):
        """
        Retire un joueur de la salle.
        Retourne l’index retiré, ou None si le joueur n’était pas dans la salle.
        """
        if id_joueur in self.joueurs:
            idx = self.joueurs[id_joueur]
            del self.joueurs[id_joueur]
            if id_joueur in self.ws: del self.ws[id_joueur]
            if id_joueur in self.pret: del self.pret[id_joueur]
            return idx
        return None

    def id_adversaire(self, id_joueur):
        """
        Renvoie l'identifiant de l'adversaire dans la salle (ou None).
        """
        for pid in self.joueurs:
            if pid != id_joueur:
                return pid
        return None

    def tous_prets(self):
        """
        Retourne True si les deux joueurs sont prêts à jouer.
        """
        return all(self.pret.values()) and len(self.pret) == 2

    def definir_pret(self, id_joueur, est_pret=True):
        """
        Définit le statut de préparation d'un joueur.
        """
        self.pret[id_joueur] = est_pret

    def reinitialiser(self):
        """
        Réinitialise la logique de jeu et remet tous les statuts à "non prêt".
        """
        self.logique = LogiqueJeu()
        for pid in self.pret:
            self.pret[pid] = False

class GestionnaireParties:
    """
    Singleton : Gestionnaire central de toutes les salles/parties sur le serveur.
    Permet de créer, rejoindre, quitter et retrouver une salle.
    """

    def __init__(self):
        self.salles: Dict[str, SalleDeJeu] = {}  # id_salle -> SalleDeJeu
        self.joueur_vers_salle: Dict[str, str] = {}  # id_joueur -> id_salle

    def creer_salle(self, id_salle: Optional[str] = None) -> SalleDeJeu:
        """
        Crée une nouvelle salle (avec identifiant optionnel).
        """
        salle = SalleDeJeu()
        if id_salle:
            salle.id = id_salle
        self.salles[salle.id] = salle
        return salle

    def rejoindre_salle(self, id_joueur, ws=None, id_salle: Optional[str]=None) -> SalleDeJeu:
        """
        Permet à un joueur de rejoindre une salle existante (ou en crée une nouvelle si besoin).
        Retourne la salle rejointe.
        Lève une Exception si la salle est pleine.
        """
        if id_salle:
            if id_salle in self.salles:
                salle = self.salles[id_salle]
            else:
                salle = self.creer_salle(id_salle)
        else:
            salle = next((r for r in self.salles.values() if len(r.joueurs) < 2), None)
            if not salle:
                salle = self.creer_salle()
        idx = salle.ajouter_joueur(id_joueur, ws)
        if idx is False:
            raise Exception("Salle pleine")
        self.joueur_vers_salle[id_joueur] = salle.id
        return salle

    def quitter_salle(self, id_joueur):
        """
        Permet à un joueur de quitter sa salle.  
        Supprime la salle si elle devient vide.
        Retourne l’index du joueur retiré.
        """
        id_salle = self.joueur_vers_salle.get(id_joueur)
        if not id_salle or id_salle not in self.salles:
            return
        salle = self.salles[id_salle]
        idx = salle.retirer_joueur(id_joueur)
        del self.joueur_vers_salle[id_joueur]
        # Supprimer la salle si plus de joueurs
        if not salle.joueurs:
            del self.salles[id_salle]
        return idx

    def salle_par_joueur(self, id_joueur) -> Optional[SalleDeJeu]:
        """
        Retourne la salle associée à un joueur donné.
        """
        id_salle = self.joueur_vers_salle.get(id_joueur)
        return self.salles.get(id_salle) if id_salle else None

    def salle_par_id(self, id_salle) -> Optional[SalleDeJeu]:
        """
        Retourne la salle à partir de son identifiant.
        """
        return self.salles.get(id_salle)

# Pour un accès global dans le projet :
gestionnaire_parties = GestionnaireParties()