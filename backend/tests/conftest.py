import pytest
from unittest.mock import MagicMock, AsyncMock
from uuid import uuid4
from datetime import date, datetime

@pytest.fixture
def mock_supabase():
    """Mock Supabase client."""
    mock = MagicMock()
    # chainable table().select().eq().single().execute()
    mock.table.return_value = mock
    mock.select.return_value = mock
    mock.eq.return_value = mock
    mock.single.return_value = mock
    mock.execute.return_value = MagicMock(data=None, count=0)
    mock.insert.return_value = mock
    mock.update.return_value = mock
    mock.range.return_value = mock
    mock.order.return_value = mock
    mock.limit.return_value = mock
    mock.contains.return_value = mock
    mock.ilike.return_value = mock
    return mock


@pytest.fixture
def sample_installation_id():
    return uuid4()


@pytest.fixture
def sample_user_id():
    return str(uuid4())