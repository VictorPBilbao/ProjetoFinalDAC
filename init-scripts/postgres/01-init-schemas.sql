-- Create schemas for each service
CREATE SCHEMA IF NOT EXISTS client_schema;

CREATE SCHEMA IF NOT EXISTS account_schema;

CREATE SCHEMA IF NOT EXISTS manager_schema;

-- Grant privileges
GRANT ALL ON SCHEMA client_schema TO postgres;

GRANT ALL ON SCHEMA account_schema TO postgres;

GRANT ALL ON SCHEMA manager_schema TO postgres;