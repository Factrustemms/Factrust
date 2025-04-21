from flask import Flask, render_template, request, jsonify, send_file, send_from_directory
import fitz  # PyMuPDF
import requests
import json
import os

app = Flask(__name__, static_folder='static', static_url_path='/static')

API_KEY = os.getenv("OPENROUTER_API_KEY")
print(f"[DEBUG] Clé API reçue : {API_KEY}")

def extract_text_from_pdf(file):
    doc = fitz.open(stream=file.read(), filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    return text

# === ROUTES FRONTEND ===
@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/connexion')
def login():
    return render_template('connexion.html')

@app.route('/inscription')
def register():
    return render_template('inscription.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/analyse')
def analyze_page():
    return render_template('analyse.html')

# Pour éviter l'erreur 500 sur des pages manquantes
@app.errorhandler(500)
def internal_error(error):
    # Vous pouvez aussi logger l'erreur ici : app.logger.error(f"Erreur interne: {error}")
    return "Erreur interne du serveur :("

# === ROUTE D’ANALYSE IA ===
@app.route('/analyze', methods=['POST'])
def analyze():
    if 'pdfA' not in request.files or 'pdfB' not in request.files:
        return jsonify({"error": "Fichiers PDF manquants"}), 400

    pdf_a = request.files['pdfA']
    pdf_b = request.files['pdfB']

    # Vérifier si les fichiers ont un nom (simple vérification s'ils ont été uploadés)
    if pdf_a.filename == '' or pdf_b.filename == '':
       return jsonify({"error": "Un ou plusieurs fichiers PDF n'ont pas été sélectionnés"}), 400

    try:
        text_a = extract_text_from_pdf(pdf_a)
        text_b = extract_text_from_pdf(pdf_b)
    except Exception as e:
        # Logger l'erreur réelle pourrait être utile ici
        # app.logger.error(f"Erreur extraction PDF: {e}")
        print(f"Erreur extraction PDF: {e}")
        return jsonify({"error": f"Erreur lors de la lecture d'un fichier PDF: {e}"}), 400


    prompt = f"""
Tu es un juriste assistant spécialisé en droit français.
Voici deux extraits de conclusions adverses :
--- Partie A ---
{text_a}
--- Partie B ---
{text_b}
Ta mission : comparer ces textes pour établir un tableau en 3 colonnes :
1. Faits reconnus par les deux parties
2. Points divergents entre les parties
3. Hypothèses sur la réalité factuelle
Appuie-toi sur le Code civil, Légifrance, le Code pénal, la jurisprudence majoritaire, les principes issus de Légifrance, Doctrine.fr ou Dalloz.
Présente ta réponse au format JSON strict, avec cette structure exacte :

{{
  "comparaison": {{
    "faits_reconnus": [...],
    "points_divergents": [
      {{
        "fait": "...",
        "partie_a": "...",
        "partie_b": "..."
      }}
    ],
    "hypotheses_sur_la_realite_factuelle": [
      {{
        "hypothese": "...",
        "fondement": "..."
      }}
    ]
  }}
}}
⚠️ Ne produis aucun texte hors du bloc JSON.
La réponse doit commencer directement par le symbole '{{' et finir par '}}' sans explication, commentaire ou introduction.
"""

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "meta-llama/llama-4-maverick:free", # ou un autre modèle si nécessaire
        "messages": [
            {"role": "system", "content": "Tu es une IA juridique spécialisée dans l'analyse factuelle."},
            {"role": "user", "content": prompt}
        ]
    }

    # --- Appel API et gestion initiale des erreurs ---
    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            data=json.dumps(payload),
            timeout=90 # Augmenter le timeout si l'IA prend du temps
        )
        # Lève une exception pour les erreurs HTTP (4xx ou 5xx)
        response.raise_for_status()
    except requests.exceptions.Timeout:
        print("Erreur: Timeout lors de l'appel API OpenRouter.")
        return jsonify({"error": "L'API a mis trop de temps à répondre."}), 504 # Gateway Timeout
    except requests.exceptions.RequestException as e:
        print(f"Erreur lors de l'appel API OpenRouter : {e}")
        # Tenter d'afficher le texte de la réponse même en cas d'erreur HTTP
        error_text = response.text if 'response' in locals() and hasattr(response, 'text') else "Pas de réponse textuelle de l'API."
        status_code = response.status_code if 'response' in locals() else 503 # Service Unavailable par défaut
        print(f"Code statut: {status_code}, Réponse API: {error_text}")
        return jsonify({"error": f"Erreur de communication avec l'API: {e}"}), status_code

    # --- Extraction et Parsing du contenu avec débogage détaillé ---
    try:
        # 1. Parse la réponse globale de l'API (qui est en JSON)
        api_response_data = response.json()

        # 2. Extraire le contenu spécifique (la chaîne qui devrait être du JSON)
        # Vérifier la structure avant d'accéder aux clés
        if not isinstance(api_response_data, dict) or \
           "choices" not in api_response_data or \
           not isinstance(api_response_data["choices"], list) or \
           len(api_response_data["choices"]) == 0 or \
           not isinstance(api_response_data["choices"][0], dict) or \
           "message" not in api_response_data["choices"][0] or \
           not isinstance(api_response_data["choices"][0]["message"], dict) or \
           "content" not in api_response_data["choices"][0]["message"]:
            print("Erreur: Structure de réponse API inattendue.")
            print("Réponse reçue:", api_response_data)
            return jsonify({"error": "Structure de réponse API invalide"}), 500

        result_content = api_response_data["choices"][0]["message"]["content"]

        # Vérifier si le contenu est bien une chaîne
        if not isinstance(result_content, str):
             print(f"Erreur: Le champ 'content' n'est pas une chaîne de caractères. Type reçu: {type(result_content)}")
             print("Contenu reçu:", result_content)
             return jsonify({"error": "Format du contenu de la réponse IA invalide"}), 500

    except json.JSONDecodeError as e:
        # Erreur si la réponse globale n'est pas du JSON valide
        print(f"Erreur: Impossible de parser la réponse globale de l'API en JSON: {e}")
        print("Réponse brute de l'API:", response.text)
        return jsonify({"error": "Réponse API globale non-JSON"}), 500
    except Exception as e: # Capture d'autres erreurs potentielles (ex: structure inattendue)
        print(f"Erreur inattendue lors de l'extraction du contenu: {e}")
        print("Réponse brute de l'API:", response.text)
        return jsonify({"error": f"Erreur interne lors du traitement de la réponse API: {e}"}), 500


    # 3. Nettoyer la chaîne extraite
    print("\n--- Contenu original extrait ('result_content') ---")
    # Utiliser repr() pour voir les caractères spéciaux comme \n, \t, \u00A0 etc.
    print(repr(result_content))
    print("--- Fin Contenu original ---\n")

    # Appliquer les nettoyages connus
    cleaned_result_content = result_content.replace('\u00A0', ' ') # Nettoyer les espaces insécables
    cleaned_result_content = cleaned_result_content.strip() # Enlever les espaces/newlines au début/fin

    # Tentative de nettoyage supplémentaire : supprimer les ```json ... ``` si présents
    if cleaned_result_content.startswith("```json"):
        cleaned_result_content = cleaned_result_content[len("```json"):].strip()
    if cleaned_result_content.endswith("```"):
         cleaned_result_content = cleaned_result_content[:-len("```")].strip()

    print("--- Contenu nettoyé ('cleaned_result_content') ---")
    print(repr(cleaned_result_content)) # Voir la version nettoyée
    print("--- Fin Contenu nettoyé ---\n")

    # 4. Tenter de parser la chaîne nettoyée et déboguer en détail si ça échoue
    try:
        parsed_result = json.loads(cleaned_result_content)
        print("--- Parsing JSON du contenu réussi ! ---")

    except json.JSONDecodeError as e:
        # --- C'EST ICI QUE LE DÉBOGAGE DÉTAILLÉ A LIEU ---
        print("="*20 + " ÉCHEC DU PARSING JSON DU CONTENU " + "="*20)

        # Message d'erreur précis du parseur
        print(f"Message d'erreur: {e.msg}")

        # Position exacte de l'erreur
        print(f"Ligne: {e.lineno}, Colonne: {e.colno}")
        print(f"Position (index du caractère): {e.pos}")

        # Afficher à nouveau la chaîne qui a échoué (très important)
        print("\n--- Chaîne qui a provoqué l'erreur ---")
        print(repr(cleaned_result_content)) # Utiliser repr() est crucial ici
        print("--- Fin de la chaîne ---")

        # Mettre en évidence la zone de l'erreur dans la chaîne
        context = 30 # Nombre de caractères avant/après
        start_index = max(0, e.pos - context)
        end_index = min(len(cleaned_result_content), e.pos + context)

        print("\n--- Contexte de l'erreur (autour de la position {e.pos}) ---")
        # Afficher la partie avant l'erreur
        print(f"...{cleaned_result_content[start_index:e.pos]}", end='')
        # Marquer l'endroit exact
        print("<-- ICI L'ERREUR -->", end='')
        # Afficher la partie après l'erreur
        print(f"{cleaned_result_content[e.pos:end_index]}...")

        print("\n" + "="*20 + " FIN DES DÉTAILS DE L'ERREUR " + "="*20)

        return jsonify({"error": "Réponse IA invalide (JSON malformé détecté dans 'content')"}), 500
        # ---------------------------------------------------------

    # Si tout a réussi, retourner le résultat parsé
    return jsonify({"analyse": parsed_result})


if __name__ == '__main__':
    # Activer le debug mode de Flask pour voir les erreurs et recharger automatiquement
    # Ne pas utiliser debug=True en production !
    app.run(debug=True)
