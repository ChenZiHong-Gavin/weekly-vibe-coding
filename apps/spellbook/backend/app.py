import os
import shutil
from fastapi import FastAPI, UploadFile, Request
import argparse
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
try:
    from allosaurus.app import read_recognizer
    ALLOSAURUS_AVAILABLE = True
except ImportError:
    ALLOSAURUS_AVAILABLE = False
    print("Warning: allosaurus not found. Using mock recognizer.")

from Levenshtein import distance

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

model = read_recognizer() if ALLOSAURUS_AVAILABLE else None

SPELL_BOOK = {
    "alohomora": "ə l oʊ h oʊ m ɔ ɹ ə",
    "petrificus totalus": "p ɛ t ɹ ɪ f ɪ k ə s t oʊ t æ l ə s",
    "wingardium leviosa": "w ɪ ŋ ɡ ɑ ɹ d i ə m l ɛ v i oʊ s ə",
    "locomotor mortis": "l oʊ k oʊ m oʊ t ɚ m ɔ ɹ t ɪ s",
    "avada kedavra": "ə v ɑ d ə k ə d ɑ v r ə",
    "lumos": "l u m oʊ s",
    "reparo": "ɹ ɪ p ɑ ɹ oʊ",
    "expelliarmus": "ɛ k s p ɛ l i ɑ ɹ m ʊ s",
    "rictusempra": "ɹ ɪ k t u s ɛ m p ɹ ə",
    "tarantallegra": "t ə ɹ æ n t ə l ɛ ɡ ɹ ə",
    "finite incantatem": "f ɪ n i t e ɪ n k æ n t eɪ t ə m",
    "serpensortia": "s ɜ ɹ p ɛ n s ɔ ɹ t i ə",
    "aparecium": "ə p ə ɹ i s i ə m",
    "obliviate": "ə b l ɪ v i eɪ t",
    "waddiwasi": "w ɒ d i w ɑ s i",
    "riddikulus": "ɹ ɪ d ɪ k ʊ l ʊ s",
    "impervius": "ɪ m p ɜ ɹ v i ə s",
    "dissendium": "d ɪ s ɛ n d i ə m",
    "mobiliarbus": "m oʊ b i l i ɑ ɹ b ʊ s",
    "expecto patronum": "ɛ k s p ɛ k t oʊ p ə t ɹ oʊ n ə m",
    "nox": "n ɒ k s",
    "incendio": "ɪ n s ɛ n d i oʊ",
    "accio": "æ k i oʊ",
    "sonorus": "s oʊ n ɔ ɹ ʊ s",
    "quietus": "k w aɪ e t ə s",
    "morsmordre": "m ɔ ɹ z m ɔ d ɹ ɛ",
    "stupefy": "s t u p ə f aɪ",
    "enervate": "ɛ n ɜ v eɪ t",
    "prior incantato": "p ɹ aɪ ɔ ɹ ɪ n k æ n t ɑ t oʊ",
    "deletrius": "d ɪ l i t ɹ i ə s",
    "engorgio": "ɛ n ɡ ɔ ɹ dʒ i oʊ",
    "crucio": "k r u ʃ i oʊ",
    "furnunculus": "f ɜ n ʌ ŋ k j ʊ l ə s",
    "densaugeo": "d ɛ n s ɔ dʒ i oʊ",
    "orchideous": "ɔ ɹ k ɪ d i ə s",
    "avis": "eɪ v ɪ s",
    "diffindo": "d ɪ f ɪ n d oʊ",
    "relashio": "ɹ ɪ l æ ʃ i oʊ",
    "depulso": "d ɪ p ʊ l s oʊ",
    "point me": "p ɔɪ n t m i",
    "impedimenta": "ɪ m p ɛ d ɪ m ɛ n t ə",
    "reducio": "ɹ ɪ d u ʃ i oʊ",
    "reducto": "ɹ ɪ d ʌ k t oʊ",
    "portus": "p ɔ ɹ t ʊ s",
    "legilimens": "l ɛ dʒ ɪ l i m ɛ n z",
    "protego": "p ɹ oʊ t eɪ ɡ oʊ",
    "evanesco": "ɛ v ə n ɛ s k oʊ",
    "scourgify": "s k ɜ dʒ ɪ f aɪ",
    "flagrate": "f l æ ɡ ɹ eɪ t",
    "colloportus": "k ɒ l oʊ p ɔ ɹ t ʊ s",
    "silencio": "s ɪ l ɛ n s i oʊ",
    "levicorpus": "l ɛ v i k ɔ ɹ p ʊ s",
    "liberacorpus": "l i b ɛ ɹ ə k ɔ ɹ p ʊ s",
    "sectumsempra": "s ɛ k t ʊ m s ɛ m p ɹ ə",
    "aguamenti": "æ ɡ w ɑ m ɛ n t i",
    "tergeo": "t ɜ dʒ i oʊ",
    "descendo": "d ɛ s ɛ n d oʊ",
    "deprimo": "d ɛ p ɹ i m oʊ",
    "expulso": "ɛ k s p ʌ l s oʊ",
    "homenum revelio": "h oʊ m ɛ n ʊ m ɹ ɛ v ɛ l i oʊ",
    "piertotum locomotor": "p i ɜ ɹ t oʊ t ʊ m l oʊ k oʊ m oʊ t ɹ",
    "protego horribilis": "p ɹ oʊ t eɪ ɡ oʊ h ɒ ɹ ɪ b ɪ l ɪ s",
    "protego totalum": "p ɹ oʊ t eɪ ɡ oʊ t oʊ t æ l ʊ m",
    "repello muggletum": "ɹ ɛ p ɛ l oʊ m ʌ ɡ l ɛ t ʊ m",
    "salvio hexia": "s æ l v i oʊ h ɛ k s i ə"
}

def recognize_audio(path: str) -> str:
    if model is None:
        raise RuntimeError("recognizer unavailable: allosaurus not installed")
    return model.recognize(path, lang_id='eng')

def target_for_spell(name: str) -> str:
    return SPELL_BOOK.get(name.lower(), "")

def score_phonemes(u: str, t: str) -> float:
    if not u or not t:
        return 0.0
    u_clean = u.replace(" ", "")
    t_clean = t.replace(" ", "")
    if not u_clean or not t_clean:
        return 0.0
    dist = distance(u_clean, t_clean)
    m = max(len(u_clean), len(t_clean))
    if m == 0:
        return 0.0
    return (1 - dist / m) * 100

def evaluate_spell(spell_name: str, audio_path: str) -> dict:
    u = recognize_audio(audio_path)
    t = target_for_spell(spell_name)
    s = score_phonemes(u, t)
    print(f"咒语: {spell_name} | 用户音标: {u} | 得分: {s}")
    return {
        "spell": spell_name,
        "score": round(s, 1),
        "user_phonemes": u,
        "target_phonemes": t,
        "success": s > 10
    }

@app.post("/cast_spell")
async def cast_spell(request: Request):
    form = await request.form()
    spell_name = form.get("spell_name") or form.get("spell")
    file: UploadFile | None = form.get("file")
    if file is None or not spell_name:
        return {"error": "missing file or spell_name", "success": False}
    temp_filename = f"temp_{file.filename}"
    with open(temp_filename, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    ext = os.path.splitext(temp_filename)[1].lower()
    wav_path = os.path.splitext(temp_filename)[0] + ".wav"
    try:
        print(f"received: spell_name={spell_name}, file={file.filename}, content_type={file.content_type}")
        return evaluate_spell(spell_name, temp_filename)
    except Exception as e:
        return {"error": str(e), "success": False}
    finally:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
        if os.path.exists(wav_path):
            os.remove(wav_path)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()

    uvicorn.run("app:app", host=args.host, port=args.port)
