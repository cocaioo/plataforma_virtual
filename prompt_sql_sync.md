# Prompt: Sincronização de Modelos SQLAlchemy -> Scripts SQL (Supabase/PostgreSQL)

---

## Contexto da Aplicação

Estou a desenvolver uma **plataforma virtual de gestão de UBS (Unidades Básicas de Saúde)**. A aplicação tem as seguintes características técnicas:

- **Backend:** Python com FastAPI (assíncrono)
- **ORM:** SQLAlchemy 2.x com `asyncio` (modelos declarativos que herdam de `Base`)
- **Base de Dados de Produção:** PostgreSQL hospedado no **Supabase**
- **Migrações:** Alembic (executado automaticamente no deploy via `alembic upgrade head`)
- **Deploy:** Render.com (o comando de start é `alembic upgrade head && gunicorn ...`)

### Regras Importantes

1. **Os scripts SQL gerados DEVEM ser compatíveis com PostgreSQL (Supabase).**
2. **O Supabase já possui tabelas em produção com dados reais** — nunca gerar `DROP TABLE` a menos que eu peça explicitamente.
3. **As alterações devem ser incrementais** — usar `ALTER TABLE` para modificar tabelas existentes, não recriar.
4. **Todos os comandos devem ser idempotentes quando possível** — usar `IF NOT EXISTS`, `IF EXISTS`, `DROP COLUMN IF EXISTS`, etc., para evitar erros caso o script seja executado mais de uma vez.
5. **Tipos de dados SQLAlchemy devem ser convertidos corretamente para PostgreSQL:**
   - `String(N)` → `character varying(N)` ou `VARCHAR(N)`
   - `Integer` → `integer`
   - `Text` → `text`
   - `Boolean` → `boolean`
   - `DateTime(timezone=True)` → `timestamp with time zone`
   - `Date` → `date`
   - `Numeric(p, s)` → `numeric(p, s)`
   - `server_default=func.now()` → `DEFAULT now()`
   - `ForeignKey("tabela.id")` → `FOREIGN KEY ... REFERENCES tabela (id)`
   - `ForeignKey("tabela.id", ondelete="CASCADE")` → `... ON DELETE CASCADE`
   - `primary_key=True, autoincrement=True` → `serial NOT NULL` + `PRIMARY KEY`
   - `unique=True` → constraint `UNIQUE`
   - `UniqueConstraint("col1", "col2", name="uq_name")` → `CONSTRAINT uq_name UNIQUE (col1, col2)`

---

## Ficheiros Anexados

> **Instrução:** Cola abaixo o conteúdo dos ficheiros solicitados. Estes são os inputs necessários para a análise.

### 1. `scripts_banco.md` (Estado atual da base de dados)
Este ficheiro documenta todos os `CREATE TABLE` e `ALTER TABLE` já executados no Supabase. Representa o estado real da base de dados em produção.

```
(COLAR AQUI O CONTEÚDO COMPLETO DO FICHEIRO scripts_banco.md)
```

### 2. Ficheiros de Modelos SQLAlchemy (Estado atual do código)
Estes são os modelos Python que definem a estrutura desejada. Cada classe mapeia para uma tabela no banco.

**`models/auth_models.py`**
```python
(COLAR AQUI O CONTEÚDO)
```

**`models/diagnostico_models.py`**
```python
(COLAR AQUI O CONTEÚDO)
```

**`models/agendamento_models.py`**
```python
(COLAR AQUI O CONTEÚDO)
```

> **Nota:** Se existirem outros ficheiros de modelos novos que ainda não estão listados acima, adiciona-os aqui no mesmo formato.

---

## Tarefas Solicitadas

Com base nos ficheiros acima, executa as seguintes tarefas **na ordem indicada**:

### Tarefa 1 — Análise Comparativa
Compara o `scripts_banco.md` (que reflete o estado real do Supabase) com os modelos SQLAlchemy (que refletem o estado desejado do código). Para cada tabela, identifica:

- **Tabelas novas:** Existem no modelo Python mas não no `scripts_banco.md`
- **Tabelas removidas:** Existem no `scripts_banco.md` mas não nos modelos (apenas reportar, NÃO gerar DROP)
- **Colunas adicionadas:** Existem no modelo mas não na tabela SQL correspondente
- **Colunas removidas:** Existem na tabela SQL mas não no modelo correspondente
- **Colunas alteradas:** Mesmo nome mas tipo, nullable, default ou constraints diferentes
- **Constraints alteradas:** Foreign keys, unique constraints ou defaults diferentes

Apresenta o resultado numa tabela resumo antes de gerar qualquer script.

### Tarefa 2 — Geração de Scripts SQL
Para cada diferença encontrada, gera os comandos SQL necessários:

- `CREATE TABLE` para tabelas novas (com todas as constraints e foreign keys)
- `ALTER TABLE ADD COLUMN IF NOT EXISTS` para colunas novas
- `ALTER TABLE DROP COLUMN IF EXISTS` para colunas removidas
- `ALTER TABLE ALTER COLUMN` para alterações de tipo/nullable/default

**Formato de saída:** Os scripts devem estar prontos para copiar e colar, organizados em seções numeradas com descrição, seguindo este formato:

```
### X.X. Descrição da Alteração
Breve explicação do que este script faz.

​```sql
-- Comandos SQL aqui
​```
```

### Tarefa 3 — Atualização do `scripts_banco.md`
Gera a versão atualizada das definições `CREATE TABLE` na seção 1 do `scripts_banco.md` para as tabelas que foram alteradas, refletindo o estado final após aplicar os novos scripts. Isto serve de referência para a próxima sincronização.

---

## Exemplo de Output Esperado

> Este é um exemplo para referência. O teu output deve seguir este formato.

**Resumo de Diferenças:**

| Tabela | Alteração | Detalhe |
|---|---|---|
| `indicators` | Coluna removida | `tipo_dado` (varchar(40)) |
| `indicators` | Coluna adicionada | `meta` (numeric(18,4), NULL) |
| `nova_tabela` | Tabela nova | 5 colunas, 2 foreign keys |

**Script:**

### 2.8. Atualizar Tabela `indicators`
Remove colunas obsoletas e adiciona novas colunas.

```sql
ALTER TABLE public.indicators
DROP COLUMN IF EXISTS tipo_dado;

ALTER TABLE public.indicators
ADD COLUMN IF NOT EXISTS meta numeric(18, 4) NULL;
```

---

## Avisos Finais

- **NÃO inventes colunas ou tabelas** que não existam nos modelos fornecidos.
- **NÃO alteres tabelas** que não apresentem diferenças entre o modelo e o script existente.
- **NÃO geres DROP TABLE** a menos que eu peça explicitamente.
- Se tiveres dúvidas sobre alguma conversão de tipo ou constraint, pergunta antes de gerar o script.
- Os `relationship()` do SQLAlchemy são apenas mapeamentos ORM — **não geram colunas no banco**. Ignora-os.
- Campos como `onupdate=func.now()` são tratados ao nível da aplicação, **não geram DEFAULT no SQL**.
- Apenas `server_default=func.now()` deve gerar `DEFAULT now()` no SQL.
