-- Festeja is now Komyx ("Gestão para buffets"). Rename the platform organization and the
-- subscription invoice labels; buffets are untouched. Guarded by kind so a renamed org is a no-op.
update public.organizations set name = 'Komyx', slug = 'komyx' where kind = 'platform' and slug = 'festeja';
update public.saas_invoices set description = replace(description, 'Festeja', 'Komyx') where description like '%Festeja%';
