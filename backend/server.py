from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import subprocess
import tempfile
import asyncio
import re

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_ALGORITHM = "HS256"

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

# Password utilities
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

# JWT utilities
def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

# Auth helper
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return {
            "id": str(user["_id"]),
            "email": user["email"],
            "name": user.get("name", ""),
            "role": user.get("role", "user")
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Create the main app
app = FastAPI(title="CodeNOVA API")

# Create routers
api_router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/api/auth")

# Pydantic Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str

class CodeExecutionRequest(BaseModel):
    code: str
    language: str = "python"

class CodeExecutionResponse(BaseModel):
    stdout: str
    stderr: str
    status: str
    execution_time: float

class SnippetCreate(BaseModel):
    name: str
    code: str
    language: str = "python"

class SnippetResponse(BaseModel):
    id: str
    name: str
    code: str
    language: str
    created_at: str
    updated_at: str

class HistoryResponse(BaseModel):
    id: str
    code: str
    language: str
    stdout: str
    stderr: str
    status: str
    execution_time: float
    created_at: str

# Brute force protection
async def check_brute_force(email: str, ip: str) -> bool:
    identifier = f"{ip}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("count", 0) >= 5:
        lockout_time = attempt.get("lockout_until")
        if lockout_time and datetime.now(timezone.utc) < lockout_time:
            return True
        else:
            await db.login_attempts.delete_one({"identifier": identifier})
    return False

async def record_failed_login(email: str, ip: str):
    identifier = f"{ip}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt:
        new_count = attempt.get("count", 0) + 1
        update = {"$set": {"count": new_count}}
        if new_count >= 5:
            update["$set"]["lockout_until"] = datetime.now(timezone.utc) + timedelta(minutes=15)
        await db.login_attempts.update_one({"identifier": identifier}, update)
    else:
        await db.login_attempts.insert_one({
            "identifier": identifier,
            "count": 1,
            "created_at": datetime.now(timezone.utc)
        })

async def clear_failed_logins(email: str, ip: str):
    identifier = f"{ip}:{email}"
    await db.login_attempts.delete_one({"identifier": identifier})

# Auth Routes
@auth_router.post("/register", response_model=UserResponse)
async def register(user_data: UserRegister, response: Response):
    email = user_data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed = hash_password(user_data.password)
    user_doc = {
        "email": email,
        "password_hash": hashed,
        "name": user_data.name,
        "role": "user",
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return UserResponse(id=user_id, email=email, name=user_data.name, role="user")

@auth_router.post("/login", response_model=UserResponse)
async def login(user_data: UserLogin, request: Request, response: Response):
    email = user_data.email.lower()
    ip = request.client.host if request.client else "unknown"
    
    if await check_brute_force(email, ip):
        raise HTTPException(status_code=429, detail="Too many failed attempts. Please try again in 15 minutes.")
    
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(user_data.password, user["password_hash"]):
        await record_failed_login(email, ip)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    await clear_failed_logins(email, ip)
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return UserResponse(id=user_id, email=email, name=user.get("name", ""), role=user.get("role", "user"))

@auth_router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out successfully"}

@auth_router.get("/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(id=user["id"], email=user["email"], name=user["name"], role=user["role"])

@auth_router.post("/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Refresh token not found")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        user_id = str(user["_id"])
        access_token = create_access_token(user_id, user["email"])
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
        
        return {"message": "Token refreshed"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# Code Execution - Secure Python execution
DANGEROUS_PATTERNS = [
    r'\bimport\s+os\b', r'\bfrom\s+os\b',
    r'\bimport\s+subprocess\b', r'\bfrom\s+subprocess\b',
    r'\bimport\s+sys\b', r'\bfrom\s+sys\b',
    r'\bopen\s*\(', r'\bexec\s*\(', r'\beval\s*\(',
    r'\b__import__\s*\(', r'\bcompile\s*\(',
    r'\bgetattr\s*\(', r'\bsetattr\s*\(',
    r'\bglobals\s*\(', r'\blocals\s*\(',
    r'\bimport\s+shutil\b', r'\bfrom\s+shutil\b',
    r'\bimport\s+socket\b', r'\bfrom\s+socket\b',
]

def sanitize_code(code: str) -> tuple[bool, str]:
    for pattern in DANGEROUS_PATTERNS:
        if re.search(pattern, code, re.IGNORECASE):
            return False, f"Security violation: Potentially dangerous code detected"
    return True, ""

async def execute_python_code(code: str, timeout: int = 5) -> dict:
    is_safe, error_msg = sanitize_code(code)
    if not is_safe:
        return {
            "stdout": "",
            "stderr": error_msg,
            "status": "error",
            "execution_time": 0.0
        }
    
    start_time = datetime.now(timezone.utc)
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(code)
        temp_file = f.name
    
    try:
        process = await asyncio.create_subprocess_exec(
            'python3', temp_file,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=timeout
            )
            status = "success" if process.returncode == 0 else "error"
        except asyncio.TimeoutError:
            process.kill()
            await process.wait()
            stdout = b""
            stderr = b"Execution timed out (5 second limit exceeded)"
            status = "timeout"
        
        end_time = datetime.now(timezone.utc)
        execution_time = (end_time - start_time).total_seconds()
        
        return {
            "stdout": stdout.decode('utf-8', errors='replace'),
            "stderr": stderr.decode('utf-8', errors='replace'),
            "status": status,
            "execution_time": execution_time
        }
    finally:
        os.unlink(temp_file)

@api_router.post("/run-code", response_model=CodeExecutionResponse)
async def run_code(request: CodeExecutionRequest, user: dict = Depends(get_current_user)):
    if request.language != "python":
        raise HTTPException(status_code=400, detail="Only Python is currently supported")
    
    result = await execute_python_code(request.code)
    
    # Save to history
    history_doc = {
        "user_id": user["id"],
        "code": request.code,
        "language": request.language,
        "stdout": result["stdout"],
        "stderr": result["stderr"],
        "status": result["status"],
        "execution_time": result["execution_time"],
        "created_at": datetime.now(timezone.utc)
    }
    await db.execution_history.insert_one(history_doc)
    
    return CodeExecutionResponse(**result)

# Snippets Routes
@api_router.post("/snippets", response_model=SnippetResponse)
async def create_snippet(snippet: SnippetCreate, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    snippet_doc = {
        "user_id": user["id"],
        "name": snippet.name,
        "code": snippet.code,
        "language": snippet.language,
        "created_at": now,
        "updated_at": now
    }
    result = await db.snippets.insert_one(snippet_doc)
    
    return SnippetResponse(
        id=str(result.inserted_id),
        name=snippet.name,
        code=snippet.code,
        language=snippet.language,
        created_at=now.isoformat(),
        updated_at=now.isoformat()
    )

@api_router.get("/snippets", response_model=List[SnippetResponse])
async def get_snippets(user: dict = Depends(get_current_user)):
    snippets = await db.snippets.find({"user_id": user["id"]}).sort("updated_at", -1).to_list(100)
    return [
        SnippetResponse(
            id=str(s["_id"]),
            name=s["name"],
            code=s["code"],
            language=s["language"],
            created_at=s["created_at"].isoformat() if isinstance(s["created_at"], datetime) else s["created_at"],
            updated_at=s["updated_at"].isoformat() if isinstance(s["updated_at"], datetime) else s["updated_at"]
        )
        for s in snippets
    ]

@api_router.get("/snippets/{snippet_id}", response_model=SnippetResponse)
async def get_snippet(snippet_id: str, user: dict = Depends(get_current_user)):
    try:
        snippet = await db.snippets.find_one({"_id": ObjectId(snippet_id), "user_id": user["id"]})
    except Exception:
        raise HTTPException(status_code=404, detail="Snippet not found")
    
    if not snippet:
        raise HTTPException(status_code=404, detail="Snippet not found")
    
    return SnippetResponse(
        id=str(snippet["_id"]),
        name=snippet["name"],
        code=snippet["code"],
        language=snippet["language"],
        created_at=snippet["created_at"].isoformat() if isinstance(snippet["created_at"], datetime) else snippet["created_at"],
        updated_at=snippet["updated_at"].isoformat() if isinstance(snippet["updated_at"], datetime) else snippet["updated_at"]
    )

@api_router.put("/snippets/{snippet_id}", response_model=SnippetResponse)
async def update_snippet(snippet_id: str, snippet: SnippetCreate, user: dict = Depends(get_current_user)):
    try:
        existing = await db.snippets.find_one({"_id": ObjectId(snippet_id), "user_id": user["id"]})
    except Exception:
        raise HTTPException(status_code=404, detail="Snippet not found")
    
    if not existing:
        raise HTTPException(status_code=404, detail="Snippet not found")
    
    now = datetime.now(timezone.utc)
    await db.snippets.update_one(
        {"_id": ObjectId(snippet_id)},
        {"$set": {
            "name": snippet.name,
            "code": snippet.code,
            "language": snippet.language,
            "updated_at": now
        }}
    )
    
    return SnippetResponse(
        id=snippet_id,
        name=snippet.name,
        code=snippet.code,
        language=snippet.language,
        created_at=existing["created_at"].isoformat() if isinstance(existing["created_at"], datetime) else existing["created_at"],
        updated_at=now.isoformat()
    )

@api_router.delete("/snippets/{snippet_id}")
async def delete_snippet(snippet_id: str, user: dict = Depends(get_current_user)):
    try:
        result = await db.snippets.delete_one({"_id": ObjectId(snippet_id), "user_id": user["id"]})
    except Exception:
        raise HTTPException(status_code=404, detail="Snippet not found")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Snippet not found")
    
    return {"message": "Snippet deleted"}

# Execution History Routes
@api_router.get("/history", response_model=List[HistoryResponse])
async def get_history(user: dict = Depends(get_current_user), limit: int = 50):
    history = await db.execution_history.find({"user_id": user["id"]}).sort("created_at", -1).to_list(limit)
    return [
        HistoryResponse(
            id=str(h["_id"]),
            code=h["code"],
            language=h["language"],
            stdout=h["stdout"],
            stderr=h["stderr"],
            status=h["status"],
            execution_time=h["execution_time"],
            created_at=h["created_at"].isoformat() if isinstance(h["created_at"], datetime) else h["created_at"]
        )
        for h in history
    ]

@api_router.delete("/history")
async def clear_history(user: dict = Depends(get_current_user)):
    await db.execution_history.delete_many({"user_id": user["id"]})
    return {"message": "History cleared"}

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "CodeNOVA API", "version": "1.0.0"}

# Include routers
app.include_router(api_router)
app.include_router(auth_router)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Startup event
@app.on_event("startup")
async def startup_event():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.snippets.create_index([("user_id", 1), ("updated_at", -1)])
    await db.execution_history.create_index([("user_id", 1), ("created_at", -1)])
    
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc)
        })
        logger.info("Admin user created: %s", admin_email)
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
        logger.info("Admin password updated: %s", admin_email)
    
    # Write test credentials
    creds_path = Path("/app/memory/test_credentials.md")
    creds_path.parent.mkdir(parents=True, exist_ok=True)
    creds_path.write_text(f"""# Test Credentials

## Admin Account
- Email: {admin_email}
- Password: {admin_password}
- Role: admin

## Test User
- Register a new account at /register

## Auth Endpoints
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- POST /api/auth/refresh
""")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
