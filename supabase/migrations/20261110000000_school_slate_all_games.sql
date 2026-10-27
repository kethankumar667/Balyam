-- School Slate is now drawn in six games, not only classic Rummy. Equipped looks are stored per game in
-- `equipped_cosmetics.game_scope`, which is free text, so nothing structural changes: only what the catalog says it is.
-- Rollback: supabase/rollbacks/20261110000000_school_slate_all_games_rollback.sql
update public.cosmetic_catalog
   set description = 'A chalk-lined blackboard in a teak frame, for your classic Rummy and Ludo tables and for Goli Jump, Bingo, Star Game and Sudoku. Host-selected worlds take priority.'
 where id = 'table_retro_school_slate';
