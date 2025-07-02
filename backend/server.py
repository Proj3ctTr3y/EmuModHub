from fastapi import FastAPI, APIRouter, HTTPException, File, UploadFile, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import aiofiles
import base64
import re
from urllib.parse import urlparse, parse_qs


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Create uploads directory if it doesn't exist
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

# Tutorial Models
class VideoSource(BaseModel):
    type: str  # "youtube", "hosted", "external"
    url: Optional[str] = None
    video_id: Optional[str] = None  # For YouTube videos
    file_path: Optional[str] = None  # For hosted videos
    attribution: Optional[Dict[str, Any]] = None

class Tutorial(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    console: str  # e.g., "NES", "PS2", "PC", "Nintendo Switch"
    emulator: str  # e.g., "RetroArch", "PCSX2", "Dolphin", "Yuzu"
    category: str  # e.g., "Setup", "Configuration", "Game-specific", "Modding"
    difficulty: str  # "Beginner", "Intermediate", "Advanced"
    content: str  # Main tutorial text content
    video_sources: List[VideoSource] = []
    tags: List[str] = []
    author: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_approved: bool = True  # For moderation
    views: int = 0

class TutorialCreate(BaseModel):
    title: str
    description: str
    console: str
    emulator: str
    category: str
    difficulty: str
    content: str
    video_sources: List[VideoSource] = []
    tags: List[str] = []
    author: str

class TutorialSubmission(BaseModel):
    title: str
    description: str
    console: str
    emulator: str
    category: str
    difficulty: str
    content: str
    youtube_urls: List[str] = []
    tags: List[str] = []
    author: str

# Utility functions
def extract_youtube_id(url: str) -> Optional[str]:
    """Extract YouTube video ID from URL"""
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)',
        r'youtube\.com\/v\/([^&\n?#]+)'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def get_youtube_attribution(video_id: str) -> Dict[str, Any]:
    """Get basic YouTube attribution info"""
    return {
        "platform": "YouTube",
        "video_id": video_id,
        "embed_url": f"https://www.youtube.com/embed/{video_id}",
        "watch_url": f"https://www.youtube.com/watch?v={video_id}",
        "attribution_required": True
    }

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Emulation & Game Modding Tutorial API"}

# Tutorial CRUD operations
@api_router.post("/tutorials", response_model=Tutorial)
async def create_tutorial(tutorial_data: TutorialCreate):
    """Create a new tutorial"""
    tutorial_dict = tutorial_data.dict()
    tutorial = Tutorial(**tutorial_dict)
    
    # Process video sources for attribution
    processed_video_sources = []
    for video_source in tutorial.video_sources:
        if video_source.type == "youtube" and video_source.url:
            video_id = extract_youtube_id(video_source.url)
            if video_id:
                video_source.video_id = video_id
                video_source.attribution = get_youtube_attribution(video_id)
        processed_video_sources.append(video_source)
    
    tutorial.video_sources = processed_video_sources
    
    # Insert into database
    result = await db.tutorials.insert_one(tutorial.dict())
    return tutorial

@api_router.post("/tutorials/submit", response_model=Tutorial)
async def submit_tutorial(submission: TutorialSubmission):
    """Submit a tutorial for approval (user-generated content)"""
    # Process YouTube URLs
    video_sources = []
    for youtube_url in submission.youtube_urls:
        video_id = extract_youtube_id(youtube_url)
        if video_id:
            video_source = VideoSource(
                type="youtube",
                url=youtube_url,
                video_id=video_id,
                attribution=get_youtube_attribution(video_id)
            )
            video_sources.append(video_source)
    
    # Create tutorial (set as unapproved for moderation)
    tutorial_data = submission.dict()
    tutorial_data.pop('youtube_urls')  # Remove this field as we've processed it
    tutorial_data['video_sources'] = video_sources
    tutorial_data['is_approved'] = False  # Requires approval
    
    tutorial = Tutorial(**tutorial_data)
    
    # Insert into database
    result = await db.tutorials.insert_one(tutorial.dict())
    return tutorial

@api_router.get("/tutorials", response_model=List[Tutorial])
async def get_tutorials(
    console: Optional[str] = None,
    emulator: Optional[str] = None,
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    approved_only: bool = True,
    limit: int = 50
):
    """Get tutorials with optional filtering"""
    query = {}
    
    if console:
        query["console"] = {"$regex": console, "$options": "i"}
    if emulator:
        query["emulator"] = {"$regex": emulator, "$options": "i"}
    if category:
        query["category"] = {"$regex": category, "$options": "i"}
    if difficulty:
        query["difficulty"] = {"$regex": difficulty, "$options": "i"}
    if approved_only:
        query["is_approved"] = True
    
    tutorials = await db.tutorials.find(query).limit(limit).sort("created_at", -1).to_list(limit)
    return [Tutorial(**tutorial) for tutorial in tutorials]

@api_router.get("/tutorials/{tutorial_id}", response_model=Tutorial)
async def get_tutorial(tutorial_id: str):
    """Get a specific tutorial and increment view count"""
    tutorial = await db.tutorials.find_one({"id": tutorial_id})
    if not tutorial:
        raise HTTPException(status_code=404, detail="Tutorial not found")
    
    # Increment view count
    await db.tutorials.update_one(
        {"id": tutorial_id},
        {"$inc": {"views": 1}}
    )
    tutorial["views"] = tutorial.get("views", 0) + 1
    
    return Tutorial(**tutorial)

@api_router.post("/tutorials/{tutorial_id}/video")
async def upload_video(
    tutorial_id: str,
    file: UploadFile = File(...),
    attribution: str = Form(...)
):
    """Upload a video file for a tutorial"""
    tutorial = await db.tutorials.find_one({"id": tutorial_id})
    if not tutorial:
        raise HTTPException(status_code=404, detail="Tutorial not found")
    
    # Save video file
    file_extension = file.filename.split('.')[-1]
    filename = f"{tutorial_id}_{uuid.uuid4()}.{file_extension}"
    file_path = UPLOADS_DIR / filename
    
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    # Create video source
    video_source = VideoSource(
        type="hosted",
        file_path=str(file_path),
        attribution={
            "type": "user_uploaded",
            "attribution_text": attribution,
            "filename": file.filename
        }
    )
    
    # Update tutorial with new video source
    await db.tutorials.update_one(
        {"id": tutorial_id},
        {"$push": {"video_sources": video_source.dict()}}
    )
    
    return {"message": "Video uploaded successfully", "video_source": video_source}

# Get metadata for frontend
@api_router.get("/metadata")
async def get_metadata():
    """Get metadata for consoles, emulators, categories"""
    # Get unique values from existing tutorials
    pipeline = [
        {"$group": {
            "_id": None,
            "consoles": {"$addToSet": "$console"},
            "emulators": {"$addToSet": "$emulator"},
            "categories": {"$addToSet": "$category"},
            "difficulties": {"$addToSet": "$difficulty"}
        }}
    ]
    
    result = await db.tutorials.aggregate(pipeline).to_list(1)
    
    if result:
        metadata = result[0]
        metadata.pop('_id')
    else:
        metadata = {
            "consoles": ["NES", "SNES", "N64", "GameCube", "Wii", "Switch", "PS1", "PS2", "PS3", "PS4", "PS5", "Xbox", "Xbox 360", "Xbox One", "PC", "Game Boy", "GBA", "DS", "3DS"],
            "emulators": ["RetroArch", "PCSX2", "Dolphin", "Yuzu", "Ryujinx", "RPCS3", "Xenia", "PPSSPP", "Citra", "melonDS", "mGBA", "Snes9x", "Nestopia"],
            "categories": ["Setup & Installation", "Configuration", "Game-specific", "Performance Optimization", "Modding", "Troubleshooting", "Advanced Features"],
            "difficulties": ["Beginner", "Intermediate", "Advanced"]
        }
    
    return metadata

# Search tutorials
@api_router.get("/search")
async def search_tutorials(
    q: str,
    limit: int = 20
):
    """Search tutorials by title, description, content, or tags"""
    query = {
        "$and": [
            {"is_approved": True},
            {
                "$or": [
                    {"title": {"$regex": q, "$options": "i"}},
                    {"description": {"$regex": q, "$options": "i"}},
                    {"content": {"$regex": q, "$options": "i"}},
                    {"tags": {"$regex": q, "$options": "i"}},
                    {"console": {"$regex": q, "$options": "i"}},
                    {"emulator": {"$regex": q, "$options": "i"}}
                ]
            }
        ]
    }
    
    tutorials = await db.tutorials.find(query).limit(limit).to_list(limit)
    return [Tutorial(**tutorial) for tutorial in tutorials]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()