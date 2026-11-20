-- Run before the automatic reply functions so the AI sender role is committed first.
alter type public.user_role add value if not exists 'ai';