-- Update script to fix broken image URLs
UPDATE boardgames SET image_url = N'https://placehold.co/400x300/1f2937/f59e0b?text=Catan' WHERE name LIKE '%Catan%';
UPDATE boardgames SET image_url = N'https://placehold.co/400x300/1f2937/f59e0b?text=Avalon' WHERE name LIKE '%Avalon%';
UPDATE boardgames SET image_url = N'https://placehold.co/400x300/1f2937/f59e0b?text=Exploding+Kittens' WHERE name LIKE '%Exploding Kittens%';
UPDATE boardgames SET image_url = N'https://placehold.co/400x300/1f2937/f59e0b?text=Splendor' WHERE name LIKE '%Splendor%';
UPDATE boardgames SET image_url = N'https://placehold.co/400x300/1f2937/f59e0b?text=Salem+1692' WHERE name LIKE '%Salem%';
UPDATE boardgames SET image_url = N'https://placehold.co/400x300/1f2937/f59e0b?text=Ticket+to+Ride' WHERE name LIKE '%Ticket to Ride%';
UPDATE boardgames SET image_url = N'https://placehold.co/400x300/1f2937/f59e0b?text=Dixit' WHERE name LIKE '%Dixit%';
-- Chess works fine, but we can update it just in case
UPDATE boardgames SET image_url = N'https://images.unsplash.com/photo-1528819622765-d6bcf132f793?auto=format&fit=crop&w=400&q=80' WHERE name LIKE '%Chess%';
