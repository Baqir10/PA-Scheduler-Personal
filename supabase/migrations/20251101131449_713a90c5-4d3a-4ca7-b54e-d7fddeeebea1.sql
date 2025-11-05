-- Rename is_organization to is_admin in profiles table
ALTER TABLE public.profiles RENAME COLUMN is_organization TO is_admin;

-- Update the handle_new_user function to use is_admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, email, is_admin)
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