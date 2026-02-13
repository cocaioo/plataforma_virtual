"""Update indicators: remove type/precision, add meta/tipo_valor

Revision ID: 20260211_0007
Revises: 20260205_merge_heads
Create Date: 2026-02-11

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260211_0007"
down_revision = "20260205_merge_heads"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Idempotent: safe to run even if changes were already applied manually
    op.execute("""
        ALTER TABLE indicators
        ADD COLUMN IF NOT EXISTS meta NUMERIC(18, 4),
        ADD COLUMN IF NOT EXISTS tipo_valor VARCHAR(40) DEFAULT 'PERCENTUAL';
    """)
    op.execute("ALTER TABLE indicators DROP COLUMN IF EXISTS tipo_dado;")
    op.execute("ALTER TABLE indicators DROP COLUMN IF EXISTS grau_precisao_valor;")


def downgrade() -> None:
    op.execute("""
        ALTER TABLE indicators
        ADD COLUMN IF NOT EXISTS tipo_dado VARCHAR(40) NOT NULL DEFAULT 'TAXA_PERCENTUAL',
        ADD COLUMN IF NOT EXISTS grau_precisao_valor VARCHAR(40) NOT NULL DEFAULT 'UNIDADE';
    """)
    op.execute("ALTER TABLE indicators DROP COLUMN IF EXISTS meta;")
    op.execute("ALTER TABLE indicators DROP COLUMN IF EXISTS tipo_valor;")
    op.execute("ALTER TABLE indicators ALTER COLUMN tipo_dado DROP DEFAULT;")
    op.execute("ALTER TABLE indicators ALTER COLUMN grau_precisao_valor DROP DEFAULT;")
