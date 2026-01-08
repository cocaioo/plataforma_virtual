"""add nome_relatorio to ubs

Revision ID: 20260108_0001
Revises: 
Create Date: 2026-01-08

"""

from __future__ import annotations

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260108_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Idempotente: evita falhar em ambientes onde a coluna já existe
    op.execute("ALTER TABLE ubs ADD COLUMN IF NOT EXISTS nome_relatorio VARCHAR(255)")


def downgrade() -> None:
    # Idempotente: evita falhar se já tiver sido removida
    op.execute("ALTER TABLE ubs DROP COLUMN IF EXISTS nome_relatorio")
