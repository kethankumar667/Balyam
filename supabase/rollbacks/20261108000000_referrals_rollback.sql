-- Forward operational rollback: stop new attribution/grants without erasing
-- earned ownership or the audit trail. Keep the deployed renderers for owners.
update public.referral_campaign set enabled = false where id = 'nostalgia-v1';
