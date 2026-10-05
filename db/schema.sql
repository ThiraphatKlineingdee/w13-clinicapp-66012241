-- W13 Board Game Cafe App — Azure SQL schema
-- Run this against your Azure SQL Database
-- Compatible with Azure SQL (uses IDENTITY, NVARCHAR, DATETIME2)

IF OBJECT_ID('bookings', 'U') IS NOT NULL DROP TABLE bookings;
IF OBJECT_ID('boardgames', 'U') IS NOT NULL DROP TABLE boardgames;

CREATE TABLE boardgames (
  id        INT             IDENTITY(1,1) PRIMARY KEY,
  name      NVARCHAR(100)   NOT NULL,
  category  NVARCHAR(100)   NOT NULL,
  image_url NVARCHAR(1000)  NULL,
  created   DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE bookings (
  id           INT            IDENTITY(1,1) PRIMARY KEY,
  game_id      INT            NOT NULL,
  player_name  NVARCHAR(200)  NOT NULL,
  slot         DATETIME2      NOT NULL,
  created      DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT fk_bookings_game
    FOREIGN KEY (game_id) REFERENCES boardgames(id)
    ON DELETE CASCADE
);

CREATE INDEX ix_bookings_slot ON bookings (slot);
