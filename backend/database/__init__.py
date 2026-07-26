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

        # Non-destructive migration: add new columns to users if missing
        import sqlalchemy as sa
        for col_sql in [
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(255)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(100)",
        ]:
            await conn.execute(sa.text(col_sql))

        # Non-destructive migration: add new columns to workflow_states if missing
        for col_sql in [
            "ALTER TABLE workflow_states ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0 NOT NULL",
            "ALTER TABLE workflow_states ADD COLUMN IF NOT EXISTS error TEXT",
            "ALTER TABLE workflow_states ADD COLUMN IF NOT EXISTS attempt INTEGER DEFAULT 1 NOT NULL",
            "ALTER TABLE workflow_states ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ",
            "ALTER TABLE workflow_states ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ",
        ]:
            await conn.execute(sa.text(col_sql))

        # Add unique constraint on meeting_id if not exists
        await conn.execute(sa.text("""
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'uq_workflow_states_meeting_id'
                ) THEN
                    ALTER TABLE workflow_states
                    ADD CONSTRAINT uq_workflow_states_meeting_id UNIQUE (meeting_id);
                END IF;
            END $$;
        """))
