CREATE OR REPLACE FUNCTION public.assign_batch_to_profile(_user_id uuid, _batch_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.profiles p
  SET batch_id = _batch_id,
      batch_name = (SELECT b.name FROM public.batches b WHERE b.id = _batch_id)
  WHERE p.user_id = _user_id;
END; $$;