-- W13 Board Game Cafe App — seed data (run after schema.sql)
-- 8 sample board games with working images

INSERT INTO boardgames (name, category, image_url) VALUES
  (N'Catan (คาทาน)', N'Strategy (3-4 Players)', N'https://placehold.co/400x300/1f2937/f59e0b?text=Catan'),
  (N'Avalon (อวาลอน)', N'Party / Bluffing (5-10 Players)', N'https://placehold.co/400x300/1f2937/f59e0b?text=Avalon'),
  (N'Exploding Kittens', N'Card Game / Party (2-5 Players)', N'https://placehold.co/400x300/1f2937/f59e0b?text=Exploding+Kittens'),
  (N'Splendor (เกมค้าเพชร)', N'Strategy / Resource (2-4 Players)', N'https://placehold.co/400x300/1f2937/f59e0b?text=Splendor'),
  (N'Salem 1692 (ล่าแม่มด)', N'Party / Deduction (4-12 Players)', N'https://placehold.co/400x300/1f2937/f59e0b?text=Salem+1692'),
  (N'Ticket to Ride', N'Family / Route Building (2-5 Players)', N'https://placehold.co/400x300/1f2937/f59e0b?text=Ticket+to+Ride'),
  (N'Dixit (ดิกซิต)', N'Creative / Storytelling (3-6 Players)', N'https://placehold.co/400x300/1f2937/f59e0b?text=Dixit'),
  (N'Chess (หมากรุกสากล)', N'Classic Strategy (2 Players)', N'https://images.unsplash.com/photo-1528819622765-d6bcf132f793?auto=format&fit=crop&w=400&q=80');
