-- Upgrade accounts created by deployments that still wrote plaintext passwords.
UPDATE core.users
SET password_hash = crypt(password_plain, gen_salt('bf', 10))
WHERE password_plain IS NOT NULL AND octet_length(password_plain) BETWEEN 1 AND 72;

UPDATE core.users SET password_plain = NULL WHERE password_plain IS NOT NULL;
DELETE FROM core.user_sessions;
