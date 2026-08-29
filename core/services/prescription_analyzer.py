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
            "dosage": "",
            "frequency": "",
            "timing": "",
            "instructions": ""
        }}
    ]
}}

Important rules:
- Do not invent information.
- If a field is not present or cannot be determined, use an empty string.
- Preserve medication names as accurately as possible.
- Interpret common prescription abbreviations such as OD, BD, TDS, QID, and SOS when the meaning is clear.
- If the OCR text is unclear, do not guess.
"""

    interaction = client.interactions.create(
        model="gemini-3.5-flash-lite",
        input=prompt
    )

    print("GEMINI OUTPUT:")
    print(interaction.output_text)

    return interaction.output_text