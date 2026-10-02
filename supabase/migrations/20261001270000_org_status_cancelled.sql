-- Self-service cancellation: a third organization status.
alter type public.org_status add value if not exists 'cancelled';
