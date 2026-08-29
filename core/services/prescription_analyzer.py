import os
import json

from google import genai


def analyze_prescription(extracted_text):
    client = genai.Client(
        api_key=os.getenv("GEMINI_API_KEY")
    )

    prompt = f"""
You are analyzing OCR text extracted from a medical prescription.

Extract the medications and organize them into structured information.

OCR TEXT:
{extracted_text}

Return ONLY valid JSON in exactly this format:

{{
    "medications": [
        {{
            "name": "",
            "strength": "",
            "dosage": "",
            "frequency": "",
            "timing": "",
            "instructions": ""
        }}
    ]
}}

Important rules:
- "name" must contain ONLY the medication name. Do not include "Tab", "Tablet", "Cap", etc.
- "strength" is the medication strength, such as 500 mg, 650 mg, 10 mg, or 5 mL.
- "dosage" describes how much is taken per dose, such as 1 tablet or 5 mL.
- "frequency" describes how often it is taken, such as once daily, twice daily, three times daily, or as needed.
- "timing" describes when it should be taken, such as before food, after food, morning, or night.
- "instructions" contains additional directions that don't belong in the other fields.
"""

    interaction = client.interactions.create(
        model="gemini-3.5-flash-lite",
        input=prompt
    )

    response_text = interaction.output_text.strip()

    if response_text.startswith("```"):
        response_text = response_text.replace("```json", "")
        response_text = response_text.replace("```", "")
        response_text = response_text.strip()

    return json.loads(response_text)