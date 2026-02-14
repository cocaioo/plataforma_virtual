-- Incremental SQL (sessao atual)

ALTER TABLE public.usuarios
    ADD COLUMN IF NOT EXISTS telefone character varying(20) NULL;
