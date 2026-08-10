REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.assign_batch_to_profile(uuid, uuid) FROM anon;