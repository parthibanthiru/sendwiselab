-- SendWiseLab — run once in Supabase → SQL Editor (a separate project from Finanzpal).
-- Creates a public profile row for every new user, protects it with Row Level Security,
-- and adds a function so users can delete their own account (GDPR Art. 17).

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on sign-up (name comes from signUp options.data.full_name)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    -- e-mail sign-up and Google set full_name; some providers only set name
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Let a logged-in user delete their own account (profile is removed via ON DELETE CASCADE)
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

-- Transfers and saved recipients are kept on the phone while the app runs on the demo provider
-- (lib/transfers/store.ts). With the real provider, a `transfers` table written only by the
-- server that talks to the provider is added here.
