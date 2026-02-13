"""add indicator value type

Revision ID: 20260212_0008
Revises: 20260211_0007
Create Date: 2026-02-12

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260212_0008"
down_revision = "20260211_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # No-op: tipo_valor is already added by migration 20260211_0007
    pass


def downgrade() -> None:
    # No-op: tipo_valor removal is handled by downgrade of 20260211_0007
    pass
