-- Crear tabla RequestStatus en Supabase
CREATE TABLE IF NOT EXISTS RequestStatus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_exams INT NOT NULL,
    processed_exams INT DEFAULT 0,
    failed_exams INT DEFAULT 0,
    chunks_total INT NOT NULL,
    chunks_completed INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    error_message TEXT NULL
);