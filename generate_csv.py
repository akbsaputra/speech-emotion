import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer, util
import torch
import json
import re
import os
import warnings

# Try to import NLTK for better sentence splitting
try:
    import nltk
    # Newer NLTK versions require 'punkt_tab' specifically
    nltk.download('punkt', quiet=True)
    nltk.download('punkt_tab', quiet=True)
    from nltk.tokenize import sent_tokenize
    HAS_NLTK = True
except ImportError:
    HAS_NLTK = False
    print("NLTK not found. Using simple regex for sentence splitting.")
except Exception as e:
    HAS_NLTK = False
    print(f"NLTK error: {e}. Using simple regex for sentence splitting.")

warnings.filterwarnings('ignore')

# ============================================================================
# CONFIGURATION
# ============================================================================

INPUT_CSV = "assets/data/inaugural_speeches.csv"
OUTPUT_SUMMARY_CSV = "assets/data/inaugural_summary.csv" 
JSON_OUTPUT_DIR = "assets/data/timelines"
MODEL_NAME = "all-mpnet-base-v2"

os.makedirs(JSON_OUTPUT_DIR, exist_ok=True)

# ============================================================================
# EMOTION ANCHORS
# ============================================================================

EMOTION_ANCHORS = {
    "pride": [
        "We honor the enduring greatness of our country.",
        "This nation has led the world with unmatched courage.",
        "Ours is a legacy of freedom and strength.",
        "America stands tall, proud, and unafraid.",
        "The American story is one of triumph and resilience.",
        "We celebrate the extraordinary achievements of our people.",
    ],
    "unity": [
        "We are not red states or blue states, we are the United States.",
        "Let us put aside our differences and walk forward together.",
        "We must come together as one people, with one destiny.",
        "In unity there is strength; divided, we falter.",
        "Now is the time to heal and reconcile.",
    ],
    "hope": [
        "A new era of opportunity lies ahead.",
        "Let the dawn of this day be one of renewal and promise.",
        "We look to tomorrow with courage and conviction.",
        "The future is bright if we dare to dream.",
        "Together, we will build a better future for our children.",
    ],
    "resolve": [
        "We will not waver in the face of adversity.",
        "Our enemies will not defeat our purpose.",
        "Let no one doubt our commitment to justice and liberty.",
        "The challenges before us are great, but our determination is greater.",
        "We are prepared to meet every obstacle with unwavering resolve.",
    ],
    "anger": [
        "We will not tolerate injustice any longer.",
        "The time for silence and compromise is over.",
        "Our people have suffered long enough under corruption and lies.",
        "This moment demands our righteous anger and swift action.",
        "We denounce those who undermine the values of our democracy.",
    ],
    "neutral": [
        "I take this oath of office.",
        "Thank you, Mr. Speaker, and members of Congress.",
        "The ceremony is concluded.",
    ]
}

# ============================================================================
# HELPERS
# ============================================================================

def split_text_into_sentences(text):
    if HAS_NLTK:
        try:
            return sent_tokenize(text)
        except LookupError:
            # Fallback if download failed but import succeeded
            return [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if s.strip()]
    return [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if s.strip()]

def get_filename_for_speech(president, date_str):
    try: year = date_str.split(",")[-1].strip()
    except: year = "unknown"
    name_parts = president.lower().replace(".", "").split()
    last_name = name_parts[-1]
    return f"{last_name}_{year}.json"

def classify_sentence(sentence, model, anchor_embeddings):
    sent_emb = model.encode(sentence, convert_to_tensor=True)
    scores = {}
    for emotion, anchor_vecs in anchor_embeddings.items():
        sims = util.cos_sim(sent_emb, anchor_vecs)
        scores[emotion] = float(torch.mean(sims))
    
    total_score = sum(scores.values())
    normalized_scores = {k: (v / total_score) if total_score > 0 else 0 for k, v in scores.items()}
    dominant_emotion = max(normalized_scores, key=normalized_scores.get)
    return normalized_scores, dominant_emotion

# ============================================================================
# MAIN
# ============================================================================

def main():
    print("=" * 60)
    print(" THE MOODS OF US DEMOCRACY - Analysis Pipeline")
    print("=" * 60)

    # 1. Setup
    try:
        df = pd.read_csv(INPUT_CSV).dropna(subset=['text'])
    except FileNotFoundError:
        print(f"Error: Could not find {INPUT_CSV}")
        return

    print("Loading Model...")
    model = SentenceTransformer(MODEL_NAME)
    anchor_embeddings = {k: model.encode(v, convert_to_tensor=True) for k, v in EMOTION_ANCHORS.items()}
    
    summary_rows = []

    # 2. Process
    for idx, row in df.iterrows():
        president = row['president']
        date = row['date']
        sentences = split_text_into_sentences(row['text'])
        
        timeline_data = []
        # Counts for this specific speech
        counts = {k: 0 for k in EMOTION_ANCHORS.keys()}
        
        for i, sent in enumerate(sentences):
            if len(sent) < 15: continue 
            
            scores, mood = classify_sentence(sent, model, anchor_embeddings)
            
            timeline_data.append({
                "chunk_index": i,
                "text": sent,
                "emotion": mood.capitalize(),
                "scores": scores
            })
            counts[mood] += 1
            
        # --- Create Summary Row for CSV ---
        total = len(timeline_data)
        if total > 0:
            # Extract Year from Date
            try: year = int(date.split(",")[-1].strip())
            except: year = 0

            row_data = {
                "President": president,
                "Date": date,
                "Year": year,
                "Total_Sentences": total,
                "Dominant_Mood": max(counts, key=counts.get).capitalize()
            }
            
            # Add percentages
            for emo in EMOTION_ANCHORS.keys():
                pct = (counts[emo] / total) * 100
                row_data[f"{emo.capitalize()}_Pct"] = round(pct, 1)
                
            summary_rows.append(row_data)

        # Save JSON for timeline viz
        fname = get_filename_for_speech(president, date)
        with open(os.path.join(JSON_OUTPUT_DIR, fname), 'w') as f:
            json.dump(timeline_data, f, indent=2)
            
        print(f"Processed: {president} ({date})")

    # 3. Export Summary CSV
    if summary_rows:
        summary_df = pd.DataFrame(summary_rows)
        # Sort by Year
        summary_df = summary_df.sort_values("Year")
        
        print(f"\nSaving summary to: {OUTPUT_SUMMARY_CSV}")
        summary_df.to_csv(OUTPUT_SUMMARY_CSV, index=False)
        
        # 4. Print Aggregate Stats (Optional Check)
        print("\n--- AGGREGATE STATS BY PRESIDENT (Top 5 Rows) ---")
        agg = summary_df.groupby("President")[["Pride_Pct", "Unity_Pct", "Hope_Pct", "Resolve_Pct", "Anger_Pct"]].mean()
        print(agg.head())
    else:
        print("\nNo data processed.")

if __name__ == "__main__":
    main()