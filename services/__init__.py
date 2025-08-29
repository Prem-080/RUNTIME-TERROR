from flask import Flask, request, jsonify
import os
from dotenv import load_dotenv
import fitz  # PyMuPDF
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from huggingface_hub import InferenceClient
from werkzeug.utils import secure_filename
from flask_cors import CORS

app = Flask(__name__)
load_dotenv(".env.local")

CORS(app)  # allow all origins (for dev)


# Local embedding model
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

# Hugging Face InferenceClient
client = InferenceClient(token=os.getenv("HF_TOKEN"))

faiss_index = None
chunks = None


stored_sessions = {}  # key: session_id, value: {faiss_index, chunks, file_names}

# --------------------
# PDF Processing Utils
# --------------------
def extract_text(path):
    text = ""
    with fitz.open(path) as doc:   # this will fail if file is not a valid PDF
        for page in doc:
            text += page.get_text()
    return text

def chunk_text(text, size=500, overlap=100):
    chunks = []
    i = 0
    while i < len(text):
        chunks.append(text[i : i + size])
        i += size - overlap
    return chunks

# --------------------
# Routes
# --------------------
@app.route("/upload_pdfs", methods=["POST"])
def upload_pdf():
    global stored_sessions
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        return jsonify({"error": "No session ID provided"}), 400

    files = request.files.getlist("files")
    if not files:
        return jsonify({"error": "No files uploaded"}), 400

    combined_text = ""
    file_names = []

    for file in files:
        filename = secure_filename(file.filename)
        path = os.path.join(".", filename)
        file.save(path)
        text = extract_text(path)
        file_names.append(filename)
        combined_text += text + "\n\n---\n\n"
        os.remove(path)

    chunks = chunk_text(combined_text)
    embeddings = embedding_model.encode(chunks, convert_to_numpy=True)
    faiss_index = faiss.IndexFlatL2(embeddings.shape[1])
    faiss_index.add(embeddings)

    # store in session
    print(session_id)
    stored_sessions[session_id] = {
        "faiss_index": faiss_index,
        "chunks": chunks,
        "file_names": file_names
    }

    return jsonify({
        "combined_text": combined_text,
        "file_names": file_names
    })


@app.route("/ask", methods=["POST"])
def ask():
    global stored_sessions
    session_id = request.headers.get("X-Session-ID")
    print(session_id)
    if not session_id or session_id not in stored_sessions:
        print("no session_id")
        return jsonify({"error": "No PDF uploaded for this session"}), 400

    data = request.get_json()
    query = data.get("query")

    session = stored_sessions[session_id]
    faiss_index = session["faiss_index"]
    chunks = session["chunks"]

    q_emb = embedding_model.encode([query], convert_to_numpy=True)
    D, I = faiss_index.search(q_emb, k=3)
    context = " ".join(chunks[i] for i in I[0])

    prompt = f"Context: {context}\n\nQuestion: {query}\nAnswer:"
    resp = client.text_generation(model="google/flan-t5-base", prompt=prompt, max_new_tokens=100)
    print("resp.generated_text")
    return jsonify({"answer": resp.generated_text})


if __name__ == "__main__":
    app.run(debug=True)
