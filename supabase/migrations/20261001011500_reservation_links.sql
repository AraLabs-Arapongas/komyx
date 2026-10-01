-- Permanent client-facing reservation page (status, Pix, quote, contract)
alter type public.public_link_type add value if not exists 'RESERVATION';
