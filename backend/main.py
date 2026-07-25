import logging
from contextlib import asynccontextmanager

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from database import init_db

logger = logging.getLogger("cortex")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.warning(f"Database not available, running without persistence: {e}")
    yield


app = FastAPI(
    title="CORTEX AI API",
    description="Autonomous AI Chief of Staff",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "cortex-ai-api", "environment": settings.ENVIRONMENT}


@app.get("/")
async def root():
    return {
        "name": "CORTEX AI API",
        "description": "Autonomous AI Chief of Staff",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "docs": "/docs",
    }


from api.auth import router as auth_router
from api.meetings import router as meetings_router
from api.tasks import router as tasks_router
from api.analytics import router as analytics_router
from api.search import router as search_router
from api.agents import router as agents_router

app.include_router(auth_router)
app.include_router(meetings_router)
app.include_router(tasks_router)
app.include_router(analytics_router)
app.include_router(search_router)
app.include_router(agents_router)
