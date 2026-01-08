"""add attachment section and description

Revision ID: 20260108_0003
Revises: 20260108_0002
Create Date: 2026-01-08

"""

from __future__ import annotations

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260108_0003"
down_revision = "20260108_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE ubs_attachments ADD COLUMN IF NOT EXISTS section VARCHAR(50)")
    op.execute("ALTER TABLE ubs_attachments ADD COLUMN IF NOT EXISTS description TEXT")


def downgrade() -> None:
    op.execute("ALTER TABLE ubs_attachments DROP COLUMN IF EXISTS description")
    op.execute("ALTER TABLE ubs_attachments DROP COLUMN IF EXISTS section")
