-- The 29 pillars defined in the CrownKey master guide are enabled for production so a fresh installation
-- behaves the same as the live deployment. The 13 additional codes stay disabled until an administrator
-- approves them (PATCH /api/v1/admin/pillars/:code, which is audited). Reconciling the original legacy
-- dictionary against these definitions remains a business sign-off item.
UPDATE ref.pillars
SET review_status = 'APPROVED', production_enabled = TRUE
WHERE pillar_code IN (
    'FC','TAX','ML','PRB','VAC','INH','CODE','FIRE','DIV','EVI','PFC','TCERT','TDEED','ABS','OOS',
    'LANDLORD','EQH','EQLOW','REO','SHORT','EXPL','FSBO','DOM','PRICE','REPAIR','CONDEMN','UTIL','HOA','COMLIEN')
  AND (review_status <> 'APPROVED' OR production_enabled = FALSE);
