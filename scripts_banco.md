# Scripts de Banco de Dados - Plataforma Virtual

Este documento contém os scripts SQL das tabelas já existentes no Supabase e os scripts para criar as novas tabelas e atualizar as existentes, conforme o estado atual do código (SQLAlchemy).

## 1. Tabelas Atuais (Já existentes no Supabase)

... (Conteúdo anterior mantido) ...

## 2. Novos Scripts (Para executar no Supabase)

### 2.1. Atualizar Tabela `usuarios` (Role)
Adiciona a coluna `role` que está faltando.

```sql
ALTER TABLE public.usuarios 
ADD COLUMN role character varying(20) NOT NULL DEFAULT 'USER';
```

### 2.2. Atualizar Tabela `usuarios` (Controle de Boas-vindas) - **NOVO**
Adiciona a coluna para controlar se o e-mail de boas-vindas manual já foi enviado.

```sql
ALTER TABLE public.usuarios 
ADD COLUMN welcome_email_sent boolean DEFAULT false;
```

### 2.3. Criar Tabela `professional_requests`
... (Conteúdo anterior mantido) ...