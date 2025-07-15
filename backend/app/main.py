# *******************************************************
# Nom ......... : main.py
# Rôle ........ : Point d’entrée principal du backend FastAPI (WebSocket + API REST)
# Auteur ...... : Maxim Khomenko
# Version ..... : 1.0.0 du 14/07/2025
# Licence ..... : Réalisé dans le cadre du cours de Réseaux
# Description . : Initialise le serveur FastAPI, configure le CORS, gère la logique
#                 de connexion via WebSocket, le dispatch des actions de jeu (attaque,
#                 placement, etc.), la validation des messages et la protection anti-spam.
#
# Technologies  : Python, FastAPI, WebSocket
# Dépendances . : fastapi, pydantic, uuid, time, traceback
# Usage ....... : Lancer avec uvicorn pour démarrer le backend : uvicorn app.main:app --reload
# *******************************************************

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
import uuid
import traceback
import time

from .game_manager import gestionnaire_parties
from .utils import grille_vide
from .models import (
    SimpleActionPayload,
    PlacementNavirePayload,
    ConfirmationPlacementPayload,
    ReinitialisationPlacementPayload,
    AttaquePayload,
)
from pydantic import ValidationError

# --- Initialisation de l'application FastAPI ---
app = FastAPI()

# --- Configuration CORS (Cross-Origin Resource Sharing) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # À restreindre en production pour la sécurité !
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def racine():
    """
    Endpoint racine, permet de vérifier que le backend fonctionne.
    """
    return HTMLResponse("<h1>Le backend Bataille Navale fonctionne !</h1>")

# ---- Anti-spam : limitation d'actions trop fréquentes par joueur ----
INTERVALLES_ANTI_SPAM = {
    "attaque": 0.4,
    "placer_navire": 0.4,
    "confirmation_placement": 0.7,
    "rejouer": 1.2,
    "demande_placement_auto": 0.4,
    "reinitialisation_placement": 0.7,
    "joueur_pret": 0.8,
}

def est_spam(salle, id_joueur, action):
    """
    Détecte si un joueur tente une action trop rapidement (anti-spam).
    """
    maintenant = time.time()
    if not hasattr(salle, "dernieres_actions"):
        salle.dernieres_actions = {}
    if id_joueur not in salle.dernieres_actions:
        salle.dernieres_actions[id_joueur] = {}
    intervalle = INTERVALLES_ANTI_SPAM.get(action)
    dernier_temps = salle.dernieres_actions[id_joueur].get(action)
    if intervalle and dernier_temps and (maintenant - dernier_temps < intervalle):
        return True
    salle.dernieres_actions[id_joueur][action] = maintenant
    return False

# ---- Mapping : actions vers modèles Pydantic (validation entrée) ----
MODELES_ACTIONS = {
    "placer_navire": PlacementNavirePayload,
    "confirmation_placement": ConfirmationPlacementPayload,
    "reinitialisation_placement": ReinitialisationPlacementPayload,
    "attaque": AttaquePayload,
    "join": SimpleActionPayload,
    "joueur_pret": SimpleActionPayload,
    "demande_placement_auto": SimpleActionPayload,
    "deconnexion": SimpleActionPayload,
    "rejouer": SimpleActionPayload,
    # Ajouter ici d'autres actions si besoin...
}

# ---- Handlers pour chaque action de jeu (via WebSocket) ----

async def gerer_join(ws, salle, id_joueur, index_joueur, donnees, **ctx):
    """
    Gère l'action de connexion d'un joueur à la salle.
    """
    await ws.send_json({
        "action": "player_joined",
        "player_index": index_joueur,
        "player_id": id_joueur
    })
    # Notifie les 2 joueurs si prêts
    if len(salle.joueurs) == 2:
        for pid, ws2 in salle.ws.items():
            idx = salle.joueurs[pid]
            await ws2.send_json({
                "action": "ready",
                "message": f"Joueur {idx} connecté, la partie peut commencer !"
            })

async def gerer_joueur_pret(ws, salle, id_joueur, index_joueur, donnees, **ctx):
    """
    Gère l'action de déclaration "prêt" d'un joueur.
    """
    if est_spam(salle, id_joueur, "joueur_pret"):
        await ws.send_json({
            "action": "erreur",
            "message": "Action trop rapide : attendez avant de refaire prêt."
        })
        return
    salle.definir_pret(id_joueur, True)
    if salle.tous_prets():
        for pid, ws2 in salle.ws.items():
            await ws2.send_json({
                "action": "debut_placement",
                "message": "Tous les joueurs sont prêts ! Place tes navires."
            })
    else:
        await ws.send_json({
            "action": "attente_adversaire",
            "message": "En attente de l'adversaire..."
        })

async def gerer_placer_navire(ws, salle, id_joueur, index_joueur, donnees, **ctx):
    """
    Gère le placement manuel d'un navire sur la grille d'un joueur.
    """
    if est_spam(salle, id_joueur, "placer_navire"):
        await ws.send_json({
            "action": "erreur",
            "message": "Action trop rapide : merci d’attendre un peu avant de placer un autre navire."
        })
        return
    logique = salle.logique
    taille = donnees.taille_navire
    coords = tuple(donnees.coordonnees)
    orientation = donnees.orientation
    nom = donnees.nom_navire
    success = logique.placer_navire(index_joueur, taille, coords, orientation, nom)
    if success:
        await ws.send_json({"action": "mise_a_jour_grille", "grille": logique.grilles[index_joueur]})
    else:
        await ws.send_json({"action": "erreur_placement", "message": "Placement invalide."})

async def gerer_demande_placement_auto(ws, salle, id_joueur, index_joueur, donnees, **ctx):
    """
    Gère le placement automatique de tous les navires.
    """
    if est_spam(salle, id_joueur, "demande_placement_auto"):
        await ws.send_json({
            "action": "erreur",
            "message": "Action trop rapide : merci d’attendre un peu avant de demander un placement auto."
        })
        return
    logique = salle.logique
    logique.placement_automatique(index_joueur)
    await ws.send_json({"action": "mise_a_jour_grille", "grille": logique.grilles[index_joueur]})

async def gerer_reinitialisation_placement(ws, salle, id_joueur, index_joueur, donnees, **ctx):
    """
    Gère la réinitialisation de la grille de placement.
    """
    if est_spam(salle, id_joueur, "reinitialisation_placement"):
        await ws.send_json({
            "action": "erreur",
            "message": "Action trop rapide : merci d’attendre un peu avant de réinitialiser."
        })
        return
    logique = salle.logique
    logique.grilles[index_joueur] = grille_vide()
    logique.navires[index_joueur] = []
    logique.types_navires_places[index_joueur] = {}
    await ws.send_json({"action": "mise_a_jour_grille", "grille": logique.grilles[index_joueur]})

async def gerer_confirmation_placement(ws, salle, id_joueur, index_joueur, donnees, **ctx):
    """
    Gère la confirmation de placement des navires.
    """
    if est_spam(salle, id_joueur, "confirmation_placement"):
        await ws.send_json({
            "action": "erreur",
            "message": "Action trop rapide : merci d’attendre un peu avant de confirmer."
        })
        return
    logique = salle.logique
    logique.pret[index_joueur] = True
    await ws.send_json({"action": "placement_confirme", "message": "Placement confirmé."})
    if all(logique.pret):
        logique.tour_actuel = 0
        for pid, ws2 in salle.ws.items():
            idx = salle.joueurs[pid]
            await ws2.send_json({
                "action": "tous_navires_prets",
                "message": "La bataille commence !"
            })
            await ws2.send_json({
                "action": "debut_tour",
                "tour_joueur": logique.tour_actuel,
                "player_index": idx,
                "message": "C'est votre tour !" if idx == logique.tour_actuel else "Tour de l'adversaire."
            })

async def gerer_attaque(ws, salle, id_joueur, index_joueur, donnees, **ctx):
    """
    Gère une attaque sur la grille de l’adversaire.
    """
    if est_spam(salle, id_joueur, "attaque"):
        await ws.send_json({
            "action": "erreur",
            "message": "Action trop rapide : merci d’attendre un peu avant d’attaquer à nouveau."
        })
        return
    logique = salle.logique
    adversaire_id = salle.id_adversaire(id_joueur)
    adversaire_index = salle.joueurs[adversaire_id] if adversaire_id else None
    x, y = donnees.coordonnees
    resultat = logique.traiter_attaque(adversaire_index, x, y)
    for pid, ws2 in salle.ws.items():
        idx = salle.joueurs[pid]
        await ws2.send_json({
            "action": "resultat_attaque",
            "resultat": resultat["resultat"],
            "coordonnees": [x, y],
            "type_joueur": "attaquant" if idx == index_joueur else "defenseur",
            "peut_rejouer": resultat.get("peut_rejouer", False),
            "nom_navire": resultat.get("nom_navire", ""),
            "positions_coule": resultat.get("positions_coule", [])
        })
    if not resultat.get("peut_rejouer", False):
        logique.changer_tour()
        for pid, ws2 in salle.ws.items():
            idx = salle.joueurs[pid]
            await ws2.send_json({
                "action": "changement_tour",
                "tour_joueur": logique.tour_actuel,
                "player_index": idx,
                "message": "C'est votre tour !" if idx == logique.tour_actuel else "Tour de l'adversaire."
            })
    if resultat.get("partie_finie"):
        gagnant_id = id_joueur
        for pid, ws2 in salle.ws.items():
            victoire = (pid == gagnant_id)
            await ws2.send_json({
                "action": "fin_partie",
                "gagnant_id": gagnant_id,
                "victoire": victoire
            })

async def gerer_rejouer(ws, salle, id_joueur, index_joueur, donnees, **ctx):
    """
    Gère la demande de rejouer une partie.
    """
    if est_spam(salle, id_joueur, "rejouer"):
        await ws.send_json({
            "action": "erreur",
            "message": "Action trop rapide : merci d’attendre un peu avant de demander une revanche."
        })
        return
    if not hasattr(salle, "rejouer_pret"):
        salle.rejouer_pret = {}
    salle.rejouer_pret[id_joueur] = True

    for pid, ws2 in salle.ws.items():
        await ws2.send_json({
            "action": "attente_rejouer",
            "message": "En attente que l'adversaire accepte le redémarrage..." if pid == id_joueur else "L'adversaire veut rejouer. Voulez-vous aussi ?",
            "waiting_player": id_joueur,
        })
    if len(salle.rejouer_pret) == 2 and all(salle.rejouer_pret.get(pid, False) for pid in salle.joueurs):
        print("[WS] Redémarrage effectif de la partie !")
        logique = salle.logique
        logique.reinitialiser_partie()
        salle.pret = {pid: False for pid in salle.joueurs}
        salle.rejouer_pret = {}
        for pid, ws2 in salle.ws.items():
            await ws2.send_json({
                "action": "restart",
            })

async def gerer_deconnexion(ws, salle, id_joueur, index_joueur, donnees, **ctx):
    """
    Gère la déconnexion volontaire d'un joueur.
    """
    print(f"[WS] Déconnexion volontaire du client {id_joueur}")
    if hasattr(salle, "rejouer_pret") and id_joueur in salle.rejouer_pret:
        salle.rejouer_pret[id_joueur] = False

# ----- Dispatcher principal pour chaque action -----
GESTIONNAIRES_ACTIONS = {
    "join": gerer_join,
    "joueur_pret": gerer_joueur_pret,
    "placer_navire": gerer_placer_navire,
    "demande_placement_auto": gerer_demande_placement_auto,
    "reinitialisation_placement": gerer_reinitialisation_placement,
    "confirmation_placement": gerer_confirmation_placement,
    "attaque": gerer_attaque,
    "rejouer": gerer_rejouer,
    "deconnexion": gerer_deconnexion,
    # Ajouter toutes les autres actions ici !
}

@app.websocket("/ws/game/{id_salle}")
async def websocket_jeu(websocket: WebSocket, id_salle: str):
    """
    Endpoint WebSocket principal du jeu.
    Gère la session temps réel entre serveur et client.
    """
    await websocket.accept()
    id_joueur = str(uuid.uuid4())
    salle = None

    try:
        try:
            salle = gestionnaire_parties.rejoindre_salle(id_joueur, ws=websocket, id_salle=id_salle)
            index_joueur = salle.joueurs[id_joueur]
        except Exception as e:
            await websocket.send_json({"action": "erreur", "message": str(e)})
            await websocket.close()
            return

        if len(salle.joueurs) == 2:
            for pid, ws2 in salle.ws.items():
                idx = salle.joueurs[pid]
                await ws2.send_json({
                    "action": "ready",
                    "message": f"Joueur {idx} connecté, la partie peut commencer !"
                })

        while True:
            try:
                donnees = await websocket.receive_json()
                print(f"📨 Message reçu: {donnees}")
            except Exception as e:
                print(f"❌ Erreur pendant receive_json: {e}")
                traceback.print_exc()
                break

            # Vérifie que le joueur est toujours bien dans la salle
            if id_joueur not in salle.joueurs or salle.ws[id_joueur] != websocket:
                break

            action = donnees.get("action")
            if not action:
                await websocket.send_json({
                    "action": "erreur",
                    "message": "Champ 'action' manquant."
                })
                continue

            # -- Validation via Pydantic --
            Modele = MODELES_ACTIONS.get(action)
            if not Modele:
                await websocket.send_json({
                    "action": "erreur",
                    "message": f"Action inconnue : {action}"
                })
                continue
            try:
                payload = Modele(**donnees)
            except ValidationError as ve:
                await websocket.send_json({
                    "action": "erreur",
                    "message": f"Message invalide pour l'action {action} : {ve.errors()}"
                })
                continue

            # -- Dispatch automatique vers le bon gestionnaire --
            gestionnaire = GESTIONNAIRES_ACTIONS.get(action)
            if gestionnaire:
                await gestionnaire(websocket, salle, id_joueur, index_joueur, payload)
            else:
                await websocket.send_json({
                    "action": "erreur",
                    "message": f"Action non supportée côté serveur : {action}"
                })

    except WebSocketDisconnect:
        print(f"[WS] Déconnexion du client {id_joueur}")

    finally:
        if salle:
            try:
                adversaire_id = salle.id_adversaire(id_joueur)
                salle.retirer_joueur(id_joueur)
                gestionnaire_parties.quitter_salle(id_joueur)
                # Si l'adversaire est encore connecté, notifie-le
                if adversaire_id and adversaire_id in salle.ws:
                    try:
                        await salle.ws[adversaire_id].send_json({
                            "action": "adversaire_deconnecte",
                            "message": "L'adversaire s'est déconnecté."
                        })
                    except:
                        pass
            except Exception:
                pass  # La salle peut déjà être supprimée si vide