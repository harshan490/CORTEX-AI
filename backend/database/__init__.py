from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from config import settings
from typing import AsyncGenerator

engine = create_async_engine(settings.DATABASE_URL, echo=settings.ENVIRONMENT == "development", pool_pre_ping=True)

async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as conn:
        from database.models import User, Meeting, Participant, ActionItem, Decision, Task, Reminder, AgentLog, OrganizationMemory, WorkflowState, Risk, Dependency, Clarification
        # Add new enum values to existing PostgreSQL meetingstatus type
        for val in ('processing', 'awaiting_review', 'failed'):
            await conn.execute(
                __import__('sqlalchemy').text(
                    f"ALTER TYPE meetingstatus ADD VALUE IF NOT EXISTS '{val}'"
                )
            )
        await conn.run_sync(Base.metadata.create_all)
