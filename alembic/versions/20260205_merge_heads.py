"""Merge heads 20260128_0006 and 62c7a9704dab

Revision ID: 20260205_merge_heads
Revises: 20260128_0006, 62c7a9704dab
Create Date: 2026-02-05

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260205_merge_heads'
down_revision = ('20260128_0006', '62c7a9704dab')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
