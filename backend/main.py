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

import os
import uuid

# Ensure the uploads directory exists
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/detect")
async def detect_plant(file: UploadFile = File(...)):
    """
    Simulates an AI model detecting a plant from an uploaded image.
    Accepts an image file, saves it to disk, and returns a single word
    (plant common name) from the demo data list.
    """
    
    # 1. Generate a unique filename and absolute path for the uploaded image
    file_ext = file.filename.split(".")[-1] if file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    # 2. Save the uploaded file to the local disk
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)
        
    print(f"\n--- IMAGE SAVED TO DISK ---")
    print(f"File Path ready for ML Model: {file_path}")
    print(f"---------------------------\n")
    
    # Simulate processing time (1.5 seconds) - e.g., feeding file_path to your ML model
    time.sleep(1.5)
    
    # 3. Pick a random plant from our demo set to simulate the model's highest confidence classification
    detected_plant = random.choice(DEMO_PLANTS)
    
    # 4. Return the exact single word/phrase output
    return {"detected_plant": detected_plant}
