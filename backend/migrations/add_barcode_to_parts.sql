ALTER TABLE parts
ADD COLUMN IF NOT EXISTS barcode VARCHAR(255) UNIQUE;
