from flask import Flask, request, jsonify, send_file
import edge_tts
import asyncio
import os
import uuid

app = Flask(__name__)
AUDIO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tts_audio")
os.makedirs(AUDIO_DIR, exist_ok=True)

VOICES = {
    "ml-IN (Malayalam Female)": "ml-IN-SobhanaNeural",
    "ml-IN (Malayalam Male)": "ml-IN-MidhunNeural",
    "ta-IN (Tamil Female)": "ta-IN-PallaviNeural",
    "ta-IN (Tamil Male)": "ta-IN-ValluvarNeural",
}

@app.route("/voices", methods=["GET"])
def voices():
    return jsonify(VOICES)

@app.route("/synthesize", methods=["POST"])
def synthesize():
    data = request.get_json()
    text = data.get("text", "").strip()
    voice_key = data.get("voice", "ml-IN-SobhanaNeural")
    if not text:
        return jsonify({"error": "No text"}), 400
    voice = VOICES.get(voice_key, voice_key)
    filename = f"{uuid.uuid4().hex}.mp3"
    path = os.path.join(AUDIO_DIR, filename)
    try:
        asyncio.run(edge_tts.Communicate(text, voice).save(path))
        return jsonify({"file": filename, "path": path})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/audio/<filename>", methods=["GET"])
def get_audio(filename):
    path = os.path.join(AUDIO_DIR, filename)
    if not os.path.exists(path):
        return jsonify({"error": "Not found"}), 404
    return send_file(path, mimetype="audio/mpeg")

if __name__ == "__main__":
    app.run(port=8765, debug=False)
