"""drop professional invites

Revision ID: 20260128_0006
Revises: 20260128_0005
Create Date: 2026-01-28

"""

from __future__ import annotations

from alembic import op


# revision identifiers, used by Alembic.
revision = "20260128_0006"
down_revision = "20260128_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # O fluxo de convites foi abolido. Mantemos a migration idempotente.
    op.execute("DROP TABLE IF EXISTS professional_invites")


def downgrade() -> None:
    # Não reintroduzimos a tabela de convites no downgrade.
    # (Se necessário no futuro, crie uma migration específica.)
    pass
