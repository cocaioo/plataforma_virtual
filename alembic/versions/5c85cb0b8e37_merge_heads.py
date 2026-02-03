"""merge heads

Revision ID: 5c85cb0b8e37
Revises: 20260128_0006, 62c7a9704dab
Create Date: 2026-02-03 17:49:08.571442

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5c85cb0b8e37'
down_revision = ('20260128_0006', '62c7a9704dab')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
