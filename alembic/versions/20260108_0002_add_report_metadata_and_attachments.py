"""add report metadata fields and attachments

Revision ID: 20260108_0002
Revises: 20260108_0001
Create Date: 2026-01-08

"""

from __future__ import annotations

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260108_0002"
down_revision = "20260108_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Idempotente: evita falhar em ambientes onde colunas já existem
    op.execute("ALTER TABLE ubs ADD COLUMN IF NOT EXISTS periodo_referencia VARCHAR(50)")
    op.execute("ALTER TABLE ubs ADD COLUMN IF NOT EXISTS identificacao_equipe VARCHAR(100)")
    op.execute("ALTER TABLE ubs ADD COLUMN IF NOT EXISTS responsavel_nome VARCHAR(255)")
    op.execute("ALTER TABLE ubs ADD COLUMN IF NOT EXISTS responsavel_cargo VARCHAR(255)")
    op.execute("ALTER TABLE ubs ADD COLUMN IF NOT EXISTS responsavel_contato VARCHAR(255)")
    op.execute("ALTER TABLE ubs ADD COLUMN IF NOT EXISTS fluxo_agenda_acesso TEXT")

    # Tabela de anexos (armazenamento em disco + metadados no banco)
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS ubs_attachments (
            id SERIAL PRIMARY KEY,
            ubs_id INTEGER NOT NULL REFERENCES ubs(id) ON DELETE CASCADE,
            original_filename VARCHAR(255) NOT NULL,
            content_type VARCHAR(100),
            size_bytes INTEGER NOT NULL DEFAULT 0,
            storage_path TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT now()
        )
        """
    )

    op.execute("CREATE INDEX IF NOT EXISTS ix_ubs_attachments_ubs_id ON ubs_attachments(ubs_id)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_ubs_attachments_ubs_id")
    op.execute("DROP TABLE IF EXISTS ubs_attachments")

    op.execute("ALTER TABLE ubs DROP COLUMN IF EXISTS fluxo_agenda_acesso")
    op.execute("ALTER TABLE ubs DROP COLUMN IF EXISTS responsavel_contato")
    op.execute("ALTER TABLE ubs DROP COLUMN IF EXISTS responsavel_cargo")
    op.execute("ALTER TABLE ubs DROP COLUMN IF EXISTS responsavel_nome")
    op.execute("ALTER TABLE ubs DROP COLUMN IF EXISTS identificacao_equipe")
    op.execute("ALTER TABLE ubs DROP COLUMN IF EXISTS periodo_referencia")
