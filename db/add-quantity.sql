-- เพิ่มคอลัมน์ quantity เข้าตาราง boardgames
ALTER TABLE boardgames ADD quantity INT DEFAULT 1;
GO

-- อัปเดตข้อมูลเก่าให้มีอย่างน้อย 1 กล่อง
UPDATE boardgames SET quantity = 1 WHERE quantity IS NULL;
GO

-- คุณสามารถเปลี่ยนจำนวนกล่องของเกมได้ตามนี้ครับ เช่น Catan มี 3 กล่อง
-- UPDATE boardgames SET quantity = 3 WHERE name = 'Catan';
