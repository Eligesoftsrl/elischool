"""
Multi-tenant database wrapper.

Uses a contextvar to track the current request's tenant_id.
All queries against tenant-scoped collections are automatically filtered.
All inserts into tenant-scoped collections automatically get tenant_id added.

Set the current tenant from the auth dependency:
    _current_tenant.set(user["tenant_id"])

When _current_tenant is None (e.g. login, forgot-password, seed, public bootstrap,
superadmin endpoints), SmartDB returns the raw Motor collection (no scoping).
"""
import contextvars
from typing import Optional


_current_tenant: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "current_tenant", default=None
)


def set_current_tenant(tenant_id: Optional[str]) -> None:
    _current_tenant.set(tenant_id)


def get_current_tenant() -> Optional[str]:
    return _current_tenant.get()


# Collections that hold per-tenant data. All others are global (tenants, password_reset_tokens, login_attempts).
SCOPED_COLLECTIONS = {
    "students",
    "classrooms",
    "enrollments",
    "school_years",
    "activities",
    "ai_reports",
    "menus",
    "lesson_plans",
    "communications",
    "calendar_events",
    "extra_labs",
    "media",
    "attendance",
    "barcodes",
    "parent_links",
    "enrollment_requests",
    "users",
    "school_profile",
}


def _scope(q, tid: str) -> dict:
    if q is None:
        return {"tenant_id": tid}
    if not isinstance(q, dict):
        return q  # let Motor reject non-dict filters
    q = dict(q)
    q.setdefault("tenant_id", tid)
    return q


class TenantCollection:
    """Motor collection wrapper that auto-adds tenant_id to every query and insert."""

    def __init__(self, raw_coll, tenant_id: str):
        self._coll = raw_coll
        self._tid = tenant_id

    # --- read ---
    def find(self, q=None, *args, **kwargs):
        return self._coll.find(_scope(q, self._tid), *args, **kwargs)

    async def find_one(self, q=None, *args, **kwargs):
        return await self._coll.find_one(_scope(q, self._tid), *args, **kwargs)

    async def count_documents(self, q=None, *args, **kwargs):
        return await self._coll.count_documents(_scope(q, self._tid), *args, **kwargs)

    def aggregate(self, pipeline, *args, **kwargs):
        new_pipeline = [{"$match": {"tenant_id": self._tid}}] + list(pipeline or [])
        return self._coll.aggregate(new_pipeline, *args, **kwargs)

    def distinct(self, key, q=None, *args, **kwargs):
        return self._coll.distinct(key, _scope(q, self._tid), *args, **kwargs)

    # --- write ---
    async def insert_one(self, doc, *args, **kwargs):
        if isinstance(doc, dict):
            doc.setdefault("tenant_id", self._tid)
        return await self._coll.insert_one(doc, *args, **kwargs)

    async def insert_many(self, docs, *args, **kwargs):
        for d in docs:
            if isinstance(d, dict):
                d.setdefault("tenant_id", self._tid)
        return await self._coll.insert_many(docs, *args, **kwargs)

    async def update_one(self, q, *args, **kwargs):
        return await self._coll.update_one(_scope(q, self._tid), *args, **kwargs)

    async def update_many(self, q, *args, **kwargs):
        return await self._coll.update_many(_scope(q, self._tid), *args, **kwargs)

    async def delete_one(self, q, *args, **kwargs):
        return await self._coll.delete_one(_scope(q, self._tid), *args, **kwargs)

    async def delete_many(self, q, *args, **kwargs):
        return await self._coll.delete_many(_scope(q, self._tid), *args, **kwargs)

    async def find_one_and_update(self, q, *args, **kwargs):
        return await self._coll.find_one_and_update(_scope(q, self._tid), *args, **kwargs)

    async def find_one_and_delete(self, q, *args, **kwargs):
        return await self._coll.find_one_and_delete(_scope(q, self._tid), *args, **kwargs)

    async def replace_one(self, q, *args, **kwargs):
        return await self._coll.replace_one(_scope(q, self._tid), *args, **kwargs)

    # --- admin / passthrough ---
    def create_index(self, *args, **kwargs):
        return self._coll.create_index(*args, **kwargs)

    def __getattr__(self, name):
        # passthrough for everything not explicitly wrapped
        return getattr(self._coll, name)


class SmartDB:
    """
    Wrapper around a Motor database.

    When _current_tenant is set AND the requested collection is in SCOPED_COLLECTIONS,
    returns a TenantCollection that auto-scopes by tenant_id.

    Otherwise (no tenant context, or an unscoped collection like 'tenants'),
    returns the raw Motor collection so global queries continue to work.
    """

    def __init__(self, raw_db):
        self._db = raw_db

    def _resolve(self, name):
        coll = self._db[name]
        tid = _current_tenant.get()
        if tid and name in SCOPED_COLLECTIONS:
            return TenantCollection(coll, tid)
        return coll

    def __getattr__(self, name):
        if name.startswith("_"):
            raise AttributeError(name)
        return self._resolve(name)

    def __getitem__(self, name):
        return self._resolve(name)

    @property
    def raw(self):
        """Access the underlying un-scoped Motor database (use sparingly)."""
        return self._db
