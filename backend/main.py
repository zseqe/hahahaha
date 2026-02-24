import random
import time
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Enable CORS for the frontend app (Next.js typically runs on 3000, Web Expo on 8082, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEMO_PLANTS = [
    "sweet basil",
    "meidical neem",
    "aloe vera",
    "tulsi"
]

@app.post("/detect")
async def detect_plant(file: UploadFile = File(...)):
    """
    Simulates an AI model detecting a plant from an uploaded image.
    Accepts an image file and returns a single word (plant common name)
    from the demo data list.
    """
    
    # 1. Read file bytes (Simulates reading the image into an AI inference engine)
    contents = await file.read()
    
    # Simulate processing time (1.5 seconds)
    time.sleep(1.5)
    
    # 2. Pick a random plant from our demo set to simulate the model's highest confidence classification
    detected_plant = random.choice(DEMO_PLANTS)
    
    # 3. Return the exact single word/phrase output
    return {"detected_plant": detected_plant}
