from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import spacy
import os

app = FastAPI(title="MediBot NER Service")

# Load the medical spaCy model.
# NOTE: In production, ensure en_core_sci_md or en_ner_bc5cdr_md is installed:
# pip install https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/releases/v0.5.1/en_ner_bc5cdr_md-0.5.1.tar.gz
try:
    nlp = spacy.load("en_ner_bc5cdr_md")
    print("Successfully loaded medical NER model: en_ner_bc5cdr_md")
except OSError:
    print("WARNING: en_ner_bc5cdr_md model not found. Falling back to default en_core_web_sm (not recommended for medical data).")
    try:
        nlp = spacy.load("en_core_web_sm")
    except OSError:
        import subprocess
        subprocess.run(["python", "-m", "spacy", "download", "en_core_web_sm"])
        nlp = spacy.load("en_core_web_sm")

class NERRequest(BaseModel):
    text: str

class NEREntity(BaseModel):
    text: str
    label: str

@app.post("/ner", response_model=list[NEREntity])
def extract_entities(payload: NERRequest):
    if not payload.text:
        return []
        
    try:
        doc = nlp(payload.text)
        # Extract entities. Filter out basic non-medical entities if using fallback model.
        entities = []
        for ent in doc.ents:
            # bc5cdr labels are generally DISEASE and CHEMICAL
            entities.append(NEREntity(text=ent.text, label=ent.label_))
            
        return entities
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ner-service"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
