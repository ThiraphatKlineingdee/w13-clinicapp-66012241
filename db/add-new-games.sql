-- Script to add 5 new board games (English & Thai) with local image paths
INSERT INTO boardgames (name, category, image_url) VALUES
  (N'Architects of the West Kingdom (สถาปนิกแห่งอาณาจักรตะวันตก)', N'Worker Placement (1-5 Players)', N'/images/architects.jpg'),
  (N'Mansions of Madness (คฤหาสน์วิปลาส)', N'Thematic / Adventure (1-5 Players)', N'/images/mansions.jpg'),
  (N'Terraforming Mars (พลิกวิกฤตดาวอังคาร)', N'Strategy / Engine Building (1-5 Players)', N'/images/terraforming.jpg'),
  (N'Ark Nova (อาร์คโนวา)', N'Strategy / Hand Management (1-4 Players)', N'/images/arknova.jpg'),
  (N'CS Files (แฟ้มคดีปริศนา)', N'Party / Deduction (4-14 Players)', N'/images/csfiles.jpg');
