BEGIN;

-- Legacy `activity_contributions` never had the immutable reviewer/rejection
-- audit and notification contract used by `initiative_donations`. Production
-- currently contains no rows in this table, so fail closed instead of allowing
-- a second, weaker financial review cycle to remain reachable.
CREATE OR REPLACE FUNCTION reject_legacy_activity_contribution_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'Legacy activity contributions are retired; use initiative_donations';
END;
$$;

DROP TRIGGER IF EXISTS trg_reject_legacy_activity_contribution_mutation
  ON activity_contributions;

CREATE TRIGGER trg_reject_legacy_activity_contribution_mutation
BEFORE INSERT OR UPDATE OR DELETE ON activity_contributions
FOR EACH ROW
EXECUTE FUNCTION reject_legacy_activity_contribution_mutation();

COMMENT ON FUNCTION reject_legacy_activity_contribution_mutation() IS
  'Forward-only guard: the mobile/API programme accepts reviewed contributions only through initiative_donations.';

COMMIT;
