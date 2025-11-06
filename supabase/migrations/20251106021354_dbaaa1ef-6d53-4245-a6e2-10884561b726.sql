-- Fix the handle_new_user trigger to use correct column name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert into profiles with correct column name
  INSERT INTO public.profiles (id, email, is_org)
  VALUES (
    new.id,
    new.email,
    COALESCE((new.raw_user_meta_data->>'is_admin')::boolean, false)
  );

  -- If admin (organization), insert into organizations table
  IF COALESCE((new.raw_user_meta_data->>'is_admin')::boolean, false) THEN
    INSERT INTO public.organizations (id, email, name)
    VALUES (
      new.id,
      new.email,
      COALESCE(new.raw_user_meta_data->>'organization_name', '')
    );
  END IF;

  RETURN new;
END;
$function$;