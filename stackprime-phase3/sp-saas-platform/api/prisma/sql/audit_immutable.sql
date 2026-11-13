-- Makes "AuditLog" append-only at the database level. Idempotent: safe to run on every deploy.
CREATE OR REPLACE FUNCTION sp_audit_block_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sp_audit_no_update ON "AuditLog";
CREATE TRIGGER sp_audit_no_update
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION sp_audit_block_mutation();

DROP TRIGGER IF EXISTS sp_audit_no_truncate ON "AuditLog";
CREATE TRIGGER sp_audit_no_truncate
  BEFORE TRUNCATE ON "AuditLog"
  FOR EACH STATEMENT EXECUTE FUNCTION sp_audit_block_mutation();
