import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer, util
import torch
import json
import re
import os
import random
import warnings

# Try to import NLTK for better sentence splitting
try:
    import nltk
    nltk.download('punkt', quiet=True)
    from nltk.tokenize import sent_tokenize
    HAS_NLTK = True
except ImportError:
    HAS_NLTK = False
    print("NLTK not found. Using simple regex for sentence splitting.")

warnings.filterwarnings('ignore')

# ============================================================================
# CONFIGURATION
# ============================================================================

INPUT_CSV = "assets/data/inaugural_speeches.csv"
OUTPUT_CSV = "assets/data/inaugural_emotions_v2.csv"
JSON_OUTPUT_DIR = "assets/data/timelines"  # Folder for individual speech JSONs
MODEL_NAME = "all-mpnet-base-v2"

# Ensure output directory exists
os.makedirs(JSON_OUTPUT_DIR, exist_ok=True)

# ============================================================================
# EMOTION ANCHORS (UPDATED WITH NEUTRAL)
# ============================================================================

EMOTION_ANCHORS = {
    "pride": [
        "We honor the enduring greatness of our country.",
        "This nation has led the world with unmatched courage.",
        "Ours is a legacy of freedom and strength.",
        "America stands tall, proud, and unafraid.",
        "The American story is one of triumph and resilience.",
        "We celebrate the extraordinary achievements of our people.",
        "Our nation's glory shines as a beacon to the world.",
        "We are the heirs to a magnificent inheritance.",
        "The record of our country's success inspires awe.",
        "No nation has risen to such heights of greatness.",
        "We take pride in the exceptional character of Americans.",
        "Our heritage is a source of profound national pride.",
    ],
    "unity": [
        "We are not red states or blue states, we are the United States.",
        "Let us put aside our differences and walk forward together.",
        "We must come together as one people, with one destiny.",
        "In unity there is strength; divided, we falter.",
        "Now is the time to heal and reconcile.",
        "Let us join hands across all divides and move as one.",
        "We are strongest when we stand united.",
        "Our common purpose binds us together as a nation.",
        "Division weakens us; unity makes us invincible.",
        "We call upon all Americans to set aside partisan conflict.",
        "The bonds that unite us are far stronger than those that divide.",
    ],
    "hope": [
        "A new era of opportunity lies ahead.",
        "Let the dawn of this day be one of renewal and promise.",
        "We look to tomorrow with courage and conviction.",
        "The future is bright if we dare to dream.",
        "Together, we will build a better future for our children.",
        "New horizons beckon, full of possibility.",
        "We face the future with optimism and confidence.",
        "Tomorrow holds boundless promise for those who believe.",
        "Let us embrace the potential that awaits us.",
        "The best days of America are yet to come.",
        "We step forward into a dawn of renewed hope.",
    ],
    "resolve": [
        "We will not waver in the face of adversity.",
        "Our enemies will not defeat our purpose.",
        "Let no one doubt our commitment to justice and liberty.",
        "The challenges before us are great, but our determination is greater.",
        "We are prepared to meet every obstacle with unwavering resolve.",
        "We will stand firm against all threats to our freedom.",
        "No challenge is too great for the American spirit.",
        "We face the future with steely determination.",
        "Our commitment to these principles will not falter.",
        "We possess the will to overcome any adversity.",
        "We are resolved to defend what we hold most dear.",
    ],
    "anger": [
        "We will not tolerate injustice any longer.",
        "The time for silence and compromise is over.",
        "Our people have suffered long enough under corruption and lies.",
        "This moment demands our righteous anger and swift action.",
        "We denounce those who undermine the values of our democracy.",
        "We reject the broken promises that have failed us.",
        "The betrayal of our trust will not go unanswered.",
        "We are outraged by the injustices inflicted upon our people.",
        "No longer will we accept being diminished or deceived.",
        "We condemn the systematic corruption that has plagued us.",
        "The hour has come to hold accountable those who have wronged us.",
    ],
    "neutral": [
        "I take this oath of office.",
        "Thank you, Mr. Speaker, and members of Congress.",
        "The ceremony is concluded.",
        "I address you today as your President.",
        "We observe this day in accordance with tradition.",
        "I stand before you to deliver this address.",
        "My fellow citizens, ladies and gentlemen.",
        "The Constitution prescribes this oath.",
        "We are gathered here today.",
        "I accept this office with humility.",
        "Vice President, Chief Justice, and fellow Americans.",
    ]
}

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def split_text_into_sentences(text):
    """
    Robust sentence splitting using NLTK or Regex fallback.
    """
    if HAS_NLTK:
        return sent_tokenize(text)
    else:
        # Fallback: Split by [.!?] followed by a space or end of line
        return [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if s.strip()]

def get_filename_for_speech(president, date_str):
    """Creates a safe filename like 'obama_2009.json'"""
    # Extract year from date string (e.g., "January 20, 2009")
    try:
        year = date_str.split(",")[-1].strip()
    except:
        year = "unknown"
    
    # Get last name
    name_parts = president.lower().replace(".", "").split()
    last_name = name_parts[-1]
    
    # Handle duplicates (like Bush 2001 vs Bush 2005)
    return f"{last_name}_{year}.json"

def classify_sentence(sentence, model, anchor_embeddings):
    """
    Scores a single sentence against all emotion anchors.
    Returns: (scores_dict, dominant_emotion_label)
    """
    sent_emb = model.encode(sentence, convert_to_tensor=True)
    
    scores = {}
    for emotion, anchor_vecs in anchor_embeddings.items():
        # Compute cosine similarity to all anchors for this emotion
        sims = util.cos_sim(sent_emb, anchor_vecs)
        # Take the mean similarity
        scores[emotion] = float(torch.mean(sims))
    
    # Normalize scores to sum to 1.0 (Softmax-ish interpretation)
    # Using simple linear normalization here for interpretability
    total_score = sum(scores.values())
    normalized_scores = {k: (v / total_score) if total_score > 0 else 0 for k, v in scores.items()}
    
    # Determine winner
    dominant_emotion = max(normalized_scores, key=normalized_scores.get)
    
    return normalized_scores, dominant_emotion

# ============================================================================
# MAIN PIPELINE
# ============================================================================

def main():
    print("=" * 60)
    print(" THE MOODS OF US DEMOCRACY v2 (Sentence Level Analysis)")
    print("=" * 60)

    # 1. Load Data
    print(f"Loading speeches from {INPUT_CSV}...")
    df = pd.read_csv(INPUT_CSV)
    df = df.dropna(subset=['text'])
    
    # 2. Load Model & Precompute Anchors
    print(f"Loading model: {MODEL_NAME}...")
    model = SentenceTransformer(MODEL_NAME)
    
    print("Pre-computing anchor embeddings...")
    anchor_embeddings = {
        k: model.encode(v, convert_to_tensor=True) 
        for k, v in EMOTION_ANCHORS.items()
    }

    # Data structure for Validation Report
    # Stores: { "anger": ["sentence 1", "sentence 2"], "pride": ... }
    validation_bucket = {k: [] for k in EMOTION_ANCHORS.keys()}

    # 3. Process Speeches
    print(f"\nProcessing {len(df)} speeches sentence-by-sentence...")
    
    speech_summaries = [] # List to store row data for the main CSV

    for idx, row in df.iterrows():
        president = row['president']
        date = row['date']
        text = row['text']
        
        sentences = split_text_into_sentences(text)
        
        # Timeline data for this specific speech
        timeline_data = []
        speech_emotion_counts = {k: 0.0 for k in EMOTION_ANCHORS.keys()}
        
        for i, sent in enumerate(sentences):
            if len(sent) < 10: continue # Skip tiny fragments
            
            scores, mood = classify_sentence(sent, model, anchor_embeddings)
            
            # Add to timeline
            timeline_data.append({
                "chunk_index": i,
                "text": sent,
                "emotion": mood.capitalize(), # Capitalize for frontend (Pride, Unity)
                "scores": scores
            })
            
            # Add to totals for speech-level summary
            speech_emotion_counts[mood] += 1
            
            # Add to validation bucket
            validation_bucket[mood].append(sent)

        # Calculate percentages for the whole speech (Speech DNA)
        total_sents = len(timeline_data)
        if total_sents > 0:
            speech_summary = {
                "president": president,
                "date": date,
                "total_sentences": total_sents,
                "dominant_mood": max(speech_emotion_counts, key=speech_emotion_counts.get)
            }
            # Add pct for each emotion
            for emo, count in speech_emotion_counts.items():
                speech_summary[f"{emo}_pct"] = count / total_sents
            
            speech_summaries.append(speech_summary)

        # 4. Save Timeline JSON
        filename = get_filename_for_speech(president, date)
        output_path = os.path.join(JSON_OUTPUT_DIR, filename)
        
        with open(output_path, 'w') as f:
            json.dump(timeline_data, f, indent=2)
            
        print(f"   Done: {president} ({date}) -> {filename}")

    # 5. Save Summary CSV
    print(f"\nSaving summary CSV to {OUTPUT_CSV}...")
    pd.DataFrame(speech_summaries).to_csv(OUTPUT_CSV, index=False)

    # ========================================================================
    # VALIDATION REPORT (Option B)
    # ========================================================================
    print("\n" + "="*60)
    print("VALIDATION REPORT: Random Samples per Mood")
    print("="*60)
    
    for mood, sentences in validation_bucket.items():
        print(f"\n--- {mood.upper()} ---")
        if not sentences:
            print("(No sentences found)")
            continue
            
        # Pick 3 random sentences
        sample_size = min(3, len(sentences))
        samples = random.sample(sentences, sample_size)
        
        for s in samples:
            print(f"  • \"{s}\"")

    print("\nDone!")

if __name__ == "__main__":
    main()