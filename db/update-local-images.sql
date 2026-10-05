-- Script for updating to local images
UPDATE boardgames SET image_url = N'/images/catan.jpg' WHERE name LIKE '%Catan%';
UPDATE boardgames SET image_url = N'/images/avalon.jpg' WHERE name LIKE '%Avalon%';
UPDATE boardgames SET image_url = N'/images/exploding-kittens.jpg' WHERE name LIKE '%Exploding Kittens%';
UPDATE boardgames SET image_url = N'/images/splendor.jpg' WHERE name LIKE '%Splendor%';
UPDATE boardgames SET image_url = N'/images/salem.jpg' WHERE name LIKE '%Salem%';
UPDATE boardgames SET image_url = N'/images/ticket-to-ride.jpg' WHERE name LIKE '%Ticket to Ride%';
UPDATE boardgames SET image_url = N'/images/dixit.jpg' WHERE name LIKE '%Dixit%';
UPDATE boardgames SET image_url = N'/images/chess.jpg' WHERE name LIKE '%Chess%';
