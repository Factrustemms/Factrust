from flask import Flask, render_template, request, jsonify, send_file, send_from_directory
from openai import OpenAI
import fitz  # PyMuPDF
import os

app = Flask(__name__, static_folder='static', static_url_path='/static')

client = OpenAI(
    api_key="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",
    base_url="https://openrouter.ai/api/v1"
)

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

    prompt = f'''
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
Présente ta réponse en format JSON structuré.
'''

    response = client.chat.completions.create(
        model="meta-llama/llama-4-maverick:free",
        messages=[
            {"role": "system", "content": "Tu es une IA juridique spécialisée dans l'analyse factuelle."},
            {"role": "user", "content": prompt}
        ]
    )

    result = response.choices[0].message.content
    return jsonify({"result": result})

if __name__ == '__main__':
    app.run(debug=True)
