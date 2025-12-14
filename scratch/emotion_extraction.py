import openai
import pandas as pd
import time
import json

openai.api_key = "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"  # Make sure you have the correct key

# Load speeches
df = pd.read_csv("inaugural_speeches.csv")

# The final 5 emotions you want to classify
emotions = ["pride", "unity", "hope", "resolve", "anger"]

# Create the prompt template
prompt_template = """
You are an expert political speech analyst.

Classify the following presidential inaugural speech into the following emotional tones:
- Pride
- Unity
- Hope
- Resolve
- Anger

For each emotion, give a score between 0 and 1 based on how strongly the speech conveys that emotion.

Speech:
"{speech}"

Respond ONLY in valid JSON format, no extra commentary or explanation.
Example format:
{{"pride": 0.81, "unity": 0.40, "hope": 0.69, "resolve": 0.50, "anger": 0.14}}
"""

# ==== FUNCTION TO CALL GPT-4 ====
def analyze_speech(text):
    try:
        # Prepare prompt
        prompt = prompt_template.format(speech=text[:4000])  # truncate to 4000 chars max
        
        response = openai.ChatCompletion.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt}
            ],
            temperature=0,  # deterministic
        )
        
        reply = response['choices'][0]['message']['content']
        print("✅ GPT-4 returned:", reply)

        # Parse JSON safely
        json_start = reply.find('{')
        json_end = reply.rfind('}') + 1
        json_text = reply[json_start:json_end]
        result = json.loads(json_text)

        # Ensure all emotions are present
        for emotion in emotions:
            result.setdefault(emotion, 0.0)

        return result
    
    except Exception as e:
        print(f"🚨 Error analyzing speech: {e}")
        # Return zeros if anything goes wrong
        return {emotion: 0.0 for emotion in emotions}

# ==== APPLY TO ALL SPEECHES ====

# Empty list to collect results
results = []

for idx, row in df.iterrows():
    print(f"Processing {idx+1}/{len(df)}: {row['title']} ({row['date']})")
    result = analyze_speech(row['text'])
    results.append(result)
    
    # Sleep between calls to avoid rate limit (safe)
    time.sleep(21)  # adjust if needed

# Convert results to DataFrame
emotion_df = pd.DataFrame(results)

# Merge
df_final = pd.concat([df, emotion_df], axis=1)

# Save
df_final.to_csv("inaugural_emotions_gpt4.csv", index=False)

print("🎉 All speeches processed! Saved as 'inaugural_emotions_gpt4.csv'")