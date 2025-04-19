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
    return "Erreur interne du serveur :("

# === ROUTE D’ANALYSE IA ===
@app.route('/analyze', methods=['POST'])
def analyze():
    pdf_a = request.files['pdfA']
    pdf_b = request.files['pdfB']

    text_a = extract_text_from_pdf(pdf_a)
    text_b = extract_text_from_pdf(pdf_b)

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
"""

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "meta-llama/llama-4-maverick:free",
        "messages": [
            {"role": "system", "content": "Tu es une IA juridique spécialisée dans l'analyse factuelle."},
            {"role": "user", "content": prompt}
        ]
    }

    response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, data=json.dumps(payload))

    if response.status_code != 200:
        print("Erreur OpenRouter :", response.text)
        return jsonify({"error": "Erreur API"}), 500

    result = response.json()["choices"][0]["message"]["content"]
    try:
        parsed_result = json.loads(result)
    except json.JSONDecodeError:
        print("Erreur de parsing JSON :", result)
        return jsonify({"error": "Réponse IA invalide"}), 500

    return jsonify({"analyse": parsed_result})

if __name__ == '__main__':
    app.run(debug=True)
