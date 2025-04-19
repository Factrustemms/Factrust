# Factrust – Backend Flask avec IA juridique

Ce dépôt contient le backend du projet Factrust : une application Flask intégrant une IA générative pour comparer des conclusions juridiques adverses en droit français.

## Fonctionnalités

- 📄 Upload de deux fichiers PDF
- 🧠 Analyse générative via OpenRouter (LLaMA/GPT)
- 📊 Génération d’un tableau structuré : 
    1. Faits reconnus
    2. Points divergents
    3. Hypothèses factuelles
- 🔐 Support des modèles juridiques français (Code civil, pénal, jurisprudence…)

## Démarrage local

```bash
pip install -r requirements.txt
python app.py
