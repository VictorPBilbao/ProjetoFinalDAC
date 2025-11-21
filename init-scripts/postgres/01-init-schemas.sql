-- ============================================================================
-- BANTADS Database Initialization Script
-- ============================================================================
-- ============================================================================
-- 1. CREATE SCHEMAS
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS client_schema;

CREATE SCHEMA IF NOT EXISTS account_schema;

-- Grant privileges
GRANT ALL PRIVILEGES ON SCHEMA client_schema TO postgres;

GRANT ALL PRIVILEGES ON SCHEMA account_schema TO postgres;

-- ============================================================================
-- 2. CLIENT SCHEMA - Tables for Client Service
-- ============================================================================
-- Clients table - EXPLICITLY use schema name
CREATE TABLE
    IF NOT EXISTS client_schema.clients (
        cpf VARCHAR(11) PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        telefone VARCHAR(20),
        salario NUMERIC(10, 2) NOT NULL,
        endereco TEXT,
        cep VARCHAR(9),
        cidade VARCHAR(100),
        estado VARCHAR(2),
        aprovado BOOLEAN DEFAULT FALSE,
        data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

-- ============================================================================
-- 3. INSERT PRE-REGISTERED CLIENTS (as per specification)
-- ============================================================================
-- Insert 5 pre-registered clients (all approved so you can test GET /api/clientes)
INSERT INTO
    client_schema.clients (
        cpf,
        nome,
        email,
        telefone,
        salario,
        endereco,
        cep,
        cidade,
        estado,
        aprovado,
        data_cadastro
    )
VALUES
    (
        '12912861012',
        'Catharyna',
        'cli1@bantads.com.br',
        '(41) 9 9999-1111',
        10000.00,
        'Rua das Flores, 100',
        '80000-000',
        'Curitiba',
        'PR',
        TRUE,
        '2000-01-01 00:00:00'
    ),
    (
        '09506382000',
        'Cleuddônio',
        'cli2@bantads.com.br',
        '(41) 9 9999-2222',
        20000.00,
        'Av. Sete de Setembro, 200',
        '80010-000',
        'Curitiba',
        'PR',
        TRUE,
        '1990-10-10 00:00:00'
    ),
    (
        '85733854057',
        'Catianna',
        'cli3@bantads.com.br',
        '(41) 9 9999-3333',
        3000.00,
        'Rua XV de Novembro, 300',
        '80020-000',
        'Curitiba',
        'PR',
        TRUE,
        '2012-12-12 00:00:00'
    ),
    (
        '58872160006',
        'Cutardo',
        'cli4@bantads.com.br',
        '(41) 9 9999-4444',
        500.00,
        'Rua Marechal Deodoro, 400',
        '80030-000',
        'Curitiba',
        'PR',
        TRUE,
        '2022-02-22 00:00:00'
    ),
    (
        '76179646090',
        'Coândrya',
        'cli5@bantads.com.br',
        '(41) 9 9999-5555',
        1500.00,
        'Rua Visconde de Guarapuava, 500',
        '80040-000',
        'Curitiba',
        'PR',
        TRUE,
        '2025-01-01 00:00:00'
    ),
    -- Clients pending approval for testing
    (
        '11122233344',
        'Crysthôncio',
        'cli6@bantads.com.br',
        '(41) 9 9999-6666',
        4500.00,
        'Rua Barão do Rio Branco, 600',
        '80050-000',
        'Curitiba',
        'PR',
        FALSE,
        CURRENT_TIMESTAMP
    ),
    (
        '55566677788',
        'Drauzylda',
        'cli7@bantads.com.br',
        '(41) 9 9999-7777',
        6000.00,
        'Av. Cândido de Abreu, 700',
        '80060-000',
        'Curitiba',
        'PR',
        FALSE,
        CURRENT_TIMESTAMP
    ) ON CONFLICT (cpf) DO NOTHING;

-- ============================================================================
-- 4. MANAGERS TABLE (client_schema)
-- ============================================================================
CREATE TABLE
    IF NOT EXISTS client_schema.managers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        name VARCHAR(100) NOT NULL,
        cpf VARCHAR(11) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        telephone VARCHAR(20),
        password VARCHAR(255) NOT NULL
    );

-- ============================================================================
-- 5. INSERT PRE-REGISTERED MANAGERS (as per specification)
-- ============================================================================
-- Insert 3 pre-registered managers
INSERT INTO
    client_schema.managers (cpf, name, email, telephone, password)
VALUES
    (
        '98574307084',
        'Geniéve',
        'ger1@bantads.com.br',
        '(41) 9 8888-1111',
        '$2a$10$U0qjOCPVy/Sj3A3W9DCCkO7YSWDyPUYoHyRHkfRBpd0sXTvbEOgSG' -- 'tads' hashed with bcrypt
    ),
    (
        '64065268052',
        'Godophredo',
        'ger2@bantads.com.br',
        '(41) 9 8888-2222',
        '$2a$10$U0qjOCPVy/Sj3A3W9DCCkO7YSWDyPUYoHyRHkfRBpd0sXTvbEOgSG' -- 'tads' hashed with bcrypt
    ),
    (
        '23862179060',
        'Gyândula',
        'ger3@bantads.com.br',
        '(41) 9 8888-3333',
        '$2a$10$U0qjOCPVy/Sj3A3W9DCCkO7YSWDyPUYoHyRHkfRBpd0sXTvbEOgSG' -- 'tads' hashed with bcrypt
    ) ON CONFLICT (cpf) DO NOTHING;

-- ============================================================================
-- 6. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_clients_email ON client_schema.clients (email);

CREATE INDEX IF NOT EXISTS idx_clients_aprovado ON client_schema.clients (aprovado);

CREATE INDEX IF NOT EXISTS idx_managers_email ON client_schema.managers (email);

CREATE INDEX IF NOT EXISTS idx_managers_cpf ON client_schema.managers (cpf);