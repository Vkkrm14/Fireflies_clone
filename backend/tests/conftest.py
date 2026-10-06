"""Test fixtures: every test run gets its own throwaway SQLite file, seeded like production."""
import os
import sys
import tempfile

_tmp = tempfile.mkdtemp(prefix="ff-test-")
os.environ["DATABASE_URL"] = f"sqlite:///{os.path.join(_tmp, 'test.db')}"
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


@pytest.fixture(scope="session")
def client():
    from main import app

    with TestClient(app) as c:  # lifespan creates tables and seeds
        yield c
