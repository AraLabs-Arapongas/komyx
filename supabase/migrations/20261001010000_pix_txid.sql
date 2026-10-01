-- Reservation code embedded in the Pix QR (txid) so the owner can match the deposit on the bank statement.
alter table public.events add column pix_txid text;
create index events_pix_txid_idx on public.events(organization_id, pix_txid);
