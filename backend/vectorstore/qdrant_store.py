import logging
import uuid
from typing import Any, Dict, List, Optional

from config import settings

logger = logging.getLogger("cortex.vectorstore.qdrant")

MOCK_COLLECTIONS: Dict[str, Dict[str, Any]] = {}


class QdrantStore:
    def __init__(self, url: Optional[str] = None, api_key: Optional[str] = None, mock_mode: bool = True):
        self.url = url or settings.QDRANT_URL
        self.api_key = api_key or ""
        self.mock_mode = mock_mode
        self._client = None
        self._connected = False

    async def connect(self):
        if self.mock_mode:
            self._connected = True
            logger.info("Qdrant mock mode: connected")
            return

        if self._connected:
            return

        try:
            from qdrant_client import AsyncQdrantClient
            self._client = AsyncQdrantClient(
                url=self.url,
                api_key=self.api_key if self.api_key else None,
                prefer_grpc=True,
            )
            await self._client.__aenter__()
            self._connected = True
            logger.info(f"Connected to Qdrant at {self.url}")
        except ImportError:
            logger.warning("qdrant-client not installed, falling back to mock mode")
            self.mock_mode = True
            self._connected = True
        except Exception as e:
            logger.error(f"Failed to connect to Qdrant: {e}")
            raise

    async def disconnect(self):
        if self._client and self._connected and not self.mock_mode:
            try:
                await self._client.__aexit__(None, None, None)
            except Exception as e:
                logger.error(f"Error disconnecting from Qdrant: {e}")
        self._client = None
        self._connected = False
        logger.info("Disconnected from Qdrant")

    async def create_collection(self, name: str, vector_size: int = 384):
        logger.info(f"Creating collection '{name}' (size={vector_size})")

        if self.mock_mode:
            MOCK_COLLECTIONS[name] = {
                "name": name,
                "vector_size": vector_size,
                "point_count": 0,
                "created_at": "2026-07-25T12:00:00Z",
            }
            return {"name": name, "status": "created"}

        await self.connect()
        try:
            from qdrant_client.http.models import VectorParams, Distance
            await self._client.create_collection(
                collection_name=name,
                vectors_config=VectorParams(
                    size=vector_size,
                    distance=Distance.COSINE,
                ),
            )
            return {"name": name, "status": "created"}
        except Exception as e:
            if "already exists" in str(e).lower():
                return {"name": name, "status": "exists"}
            raise

    async def upsert_points(self, collection: str, points: List[Dict[str, Any]]):
        logger.info(f"Upserting {len(points)} points to '{collection}'")

        if self.mock_mode:
            if collection not in MOCK_COLLECTIONS:
                MOCK_COLLECTIONS[collection] = {
                    "name": collection,
                    "vector_size": len(points[0].get("vector", [])) if points else 384,
                    "point_count": 0,
                    "points": {},
                }
            col = MOCK_COLLECTIONS[collection]
            if "points" not in col:
                col["points"] = {}
            for point in points:
                point_id = str(point.get("id", uuid.uuid4()))
                col["points"][point_id] = {
                    "id": point_id,
                    "vector": point.get("vector", []),
                    "payload": point.get("payload", {}),
                }
            col["point_count"] = len(col["points"])
            return {"status": "upserted", "count": len(points)}

        await self.connect()
        from qdrant_client.http.models import PointStruct

        qdrant_points = [
            PointStruct(
                id=p.get("id", str(uuid.uuid4())),
                vector=p.get("vector", []),
                payload=p.get("payload", {}),
            )
            for p in points
        ]

        result = await self._client.upsert(
            collection_name=collection,
            points=qdrant_points,
        )
        return {"status": result.status, "count": len(points)}

    async def search(
        self,
        collection: str,
        query_vector: List[float],
        limit: int = 10,
        filter: Optional[Dict] = None,
    ) -> List[Dict[str, Any]]:
        logger.info(f"Searching '{collection}' (limit={limit})")

        if self.mock_mode:
            if collection not in MOCK_COLLECTIONS:
                return []
            col = MOCK_COLLECTIONS[collection]
            points = col.get("points", {})

            import math
            scored = []
            for pid, pdata in points.items():
                vec = pdata.get("vector", [])
                if vec and query_vector:
                    dot = sum(a * b for a, b in zip(vec, query_vector))
                    norm_a = math.sqrt(sum(v * v for v in vec))
                    norm_b = math.sqrt(sum(v * v for v in query_vector))
                    score = dot / (norm_a * norm_b) if norm_a and norm_b else 0
                else:
                    score = 0
                scored.append((score, pdata))

            scored.sort(key=lambda x: x[0], reverse=True)
            results = []
            for score, pdata in scored[:limit]:
                results.append({
                    "id": pdata["id"],
                    "score": score,
                    "payload": pdata.get("payload", {}),
                    "vector": pdata.get("vector", []),
                })
            return results

        await self.connect()
        from qdrant_client.http.models import Filter as QdrantFilter

        qdrant_filter = None
        if filter:
            conditions = []
            for key, value in filter.items():
                from qdrant_client.http.models import FieldCondition, MatchValue
                conditions.append(
                    FieldCondition(
                        key=key,
                        match=MatchValue(value=value),
                    )
                )
            qdrant_filter = QdrantFilter(must=conditions)

        search_result = await self._client.search(
            collection_name=collection,
            query_vector=query_vector,
            limit=limit,
            query_filter=qdrant_filter,
        )

        return [
            {
                "id": str(hit.id),
                "score": hit.score,
                "payload": hit.payload or {},
                "vector": hit.vector if hasattr(hit, "vector") else None,
            }
            for hit in search_result
        ]

    async def delete_points(self, collection: str, point_ids: List[str]):
        logger.info(f"Deleting {len(point_ids)} points from '{collection}'")

        if self.mock_mode:
            if collection in MOCK_COLLECTIONS:
                points = MOCK_COLLECTIONS[collection].get("points", {})
                for pid in point_ids:
                    points.pop(pid, None)
                MOCK_COLLECTIONS[collection]["point_count"] = len(points)
            return {"status": "deleted", "count": len(point_ids)}

        await self.connect()
        result = await self._client.delete(
            collection_name=collection,
            points_selector=point_ids,
        )
        return {"status": result.status, "count": len(point_ids)}

    async def get_collection_stats(self, collection: str) -> Dict[str, Any]:
        logger.info(f"Getting stats for '{collection}'")

        if self.mock_mode:
            col = MOCK_COLLECTIONS.get(collection, {
                "name": collection,
                "vector_size": 384,
                "point_count": 0,
            })
            return {
                "name": col["name"],
                "vector_size": col.get("vector_size", 384),
                "point_count": col.get("point_count", 0),
                "indexed_vector_count": col.get("point_count", 0),
                "status": "green",
            }

        await self.connect()
        try:
            info = await self._client.get_collection(collection_name=collection)
            return {
                "name": collection,
                "vector_size": info.config.params.vectors.size,
                "point_count": info.points_count,
                "indexed_vector_count": info.indexed_vectors_count,
                "status": info.status,
            }
        except Exception as e:
            logger.error(f"Failed to get collection stats: {e}")
            return {
                "name": collection,
                "error": str(e),
                "point_count": 0,
            }

    async def collection_exists(self, name: str) -> bool:
        if self.mock_mode:
            return name in MOCK_COLLECTIONS
        try:
            await self.connect()
            collections = await self._client.get_collections()
            return any(c.name == name for c in collections.collections)
        except Exception:
            return False

    async def list_collections(self) -> List[str]:
        if self.mock_mode:
            return list(MOCK_COLLECTIONS.keys())
        await self.connect()
        collections = await self._client.get_collections()
        return [c.name for c in collections.collections]

    async def delete_collection(self, name: str):
        logger.info(f"Deleting collection '{name}'")
        if self.mock_mode:
            MOCK_COLLECTIONS.pop(name, None)
            return {"status": "deleted"}
        await self.connect()
        await self._client.delete_collection(collection_name=name)
        return {"status": "deleted"}
