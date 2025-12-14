# obama_emotion_extraction_v2.py

import pandas as pd
import json
import torch
from sentence_transformers import SentenceTransformer, util

# 1. Load Obama's speech
df = pd.read_csv('assets/data/inaugural_speeches.csv')
obama_speech = df[(df['president'] == 'Barack Obama') & (df['date'] == "January 20, 2009")].iloc[0]['text']

# 2. Load anchors
with open('assets/data/anchors.json', 'r', encoding='utf-8') as f:
    anchors = json.load(f)

# 3. Load model
model = SentenceTransformer('sentence-transformers/all-mpnet-base-v2')

# 4. Precompute embeddings for all anchors
anchor_embeddings = {}
for emotion, examples in anchors.items():
    anchor_embeddings[emotion] = [model.encode(ex, convert_to_tensor=True) for ex in examples]

# 5. Split speech into paragraphs
paragraphs = [p.strip() for p in obama_speech.split('\n') if p.strip()]

# (Optional fallback)
if len(paragraphs) < 10:
    print("Warning: Few paragraphs detected. Fallback to sentence splitting.")
    sentences = obama_speech.split('.')
    sentences = [s.strip() for s in sentences if s.strip()]
    chunk_size = 5
    paragraphs = ['. '.join(sentences[i:i+chunk_size]) for i in range(0, len(sentences), chunk_size)]

# 6. Analyze each chunk
results = []

for idx, chunk in enumerate(paragraphs):
    chunk_embedding = model.encode(chunk, convert_to_tensor=True)
    
    # Calculate similarity for each emotion (aggregate over all anchor examples)
    similarities = {}
    for emotion, embeds in anchor_embeddings.items():
        sims = [util.cos_sim(chunk_embedding, anchor_emb).item() for anchor_emb in embeds]
        similarities[emotion] = max(sims)  # Use the maximum similarity

    best_emotion = max(similarities, key=similarities.get)

    results.append({
        "chunk": idx,
        "emotion": best_emotion
    })

# 7. Save
with open('obama_2009.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2)

print(f"Saved {len(results)} chunks with assigned emotions.")
