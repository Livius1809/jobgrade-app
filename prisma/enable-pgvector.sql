-- Sprint 1 KB: Activare extensie pgvector pe Neon PostgreSQL
-- Rulează o singură dată, înainte de prisma db push
-- Neon suportă pgvector nativ — doar activăm extensia în schema curentă

CREATE EXTENSION IF NOT EXISTS vector;
