-- ============================================================
-- PizzaBot — Sign-up trigger
-- Atomically creates tenant + profile + subscription when a
-- new auth.users row is inserted (i.e. on every sign-up).
--
-- The Server Action passes these fields via options.data (user_metadata):
--   tenant_name  TEXT   — pizzeria display name
--   tenant_slug  TEXT   — URL-safe identifier (unique, pre-validated)
--   full_name    TEXT   — owner's full name
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER          -- runs as the function owner (postgres), bypassing RLS
SET search_path = public  -- prevent search_path injection
AS $$
DECLARE
  new_tenant_id UUID;
  v_name        TEXT;
  v_slug        TEXT;
  v_full_name   TEXT;
BEGIN
  v_name      := trim(NEW.raw_user_meta_data ->> 'tenant_name');
  v_slug      := trim(NEW.raw_user_meta_data ->> 'tenant_slug');
  v_full_name := trim(NEW.raw_user_meta_data ->> 'full_name');

  -- Guard: if metadata is missing this is not a pizzeria owner sign-up
  -- (e.g. Supabase internal service users). Skip gracefully.
  IF v_name IS NULL OR v_slug IS NULL THEN
    RETURN NEW;
  END IF;

  -- 1. Create the tenant (pizzeria account)
  INSERT INTO public.tenants (name, slug, owner_id)
  VALUES (v_name, v_slug, NEW.id)
  RETURNING id INTO new_tenant_id;

  -- 2. Create the profile linking auth.users → tenants
  INSERT INTO public.profiles (id, tenant_id, full_name, role)
  VALUES (NEW.id, new_tenant_id, v_full_name, 'owner');

  -- 3. Create the subscription row (status = trialing)
  --    Stripe customer / subscription IDs are filled later by the billing flow.
  INSERT INTO public.subscriptions (tenant_id, status, trial_ends_at)
  VALUES (
    new_tenant_id,
    'trialing',
    NOW() + INTERVAL '14 days'
  );

  RETURN NEW;
END;
$$;

-- Drop if re-running migration (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ── Comments ─────────────────────────────────────────────────
COMMENT ON FUNCTION public.handle_new_user() IS
  'Triggered on auth.users INSERT. Atomically provisions tenant, profile, '
  'and subscription rows from sign-up metadata. SECURITY DEFINER so it can '
  'write to tables whose RLS would otherwise block the newly-created user.';
