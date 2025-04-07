-- Insert test users
INSERT INTO users (username, password, email, role) VALUES
('admin_test', '$2a$10$X7J3Y5Z9A1B3C5D7E9G1I3K5M7O9Q1S3U5W7Y9A1C3E5G7I9K1M3O5Q7', 'admin@test.com', 'admin'),
('tech_test', '$2a$10$X7J3Y5Z9A1B3C5D7E9G1I3K5M7O9Q1S3U5W7Y9A1C3E5G7I9K1M3O5Q7', 'tech@test.com', 'tech'),
('purchasing_test', '$2a$10$X7J3Y5Z9A1B3C5D7E9G1I3K5M7O9Q1S3U5W7Y9A1C3E5G7I9K1M3O5Q7', 'purchasing@test.com', 'purchasing');

-- Insert test login attempts
INSERT INTO login_attempts (user_id, success, ip_address) VALUES
((SELECT id FROM users WHERE username = 'admin_test'), true, '127.0.0.1'),
((SELECT id FROM users WHERE username = 'tech_test'), true, '127.0.0.1'),
((SELECT id FROM users WHERE username = 'purchasing_test'), true, '127.0.0.1');

-- Insert test parts
INSERT INTO parts (name, description, quantity, min_quantity) VALUES
('Test Part 1', 'Description for test part 1', 100, 10),
('Test Part 2', 'Description for test part 2', 50, 5),
('Test Part 3', 'Description for test part 3', 200, 20);

-- Insert test purchase orders
INSERT INTO purchase_orders (status, created_by) VALUES
('pending', (SELECT id FROM users WHERE username = 'admin_test')),
('received', (SELECT id FROM users WHERE username = 'purchasing_test')),
('cancelled', (SELECT id FROM users WHERE username = 'admin_test'));

-- Insert test purchase order documents
INSERT INTO purchase_order_documents (purchase_order_id, document_type, file_path) VALUES
((SELECT id FROM purchase_orders WHERE status = 'pending'), 'receipt', '/test/path/receipt1.pdf'),
((SELECT id FROM purchase_orders WHERE status = 'received'), 'invoice', '/test/path/invoice1.pdf'),
((SELECT id FROM purchase_orders WHERE status = 'cancelled'), 'receipt', '/test/path/receipt2.pdf');

-- Insert test transactions
INSERT INTO transactions (part_id, quantity, type, created_by) VALUES
((SELECT id FROM parts WHERE name = 'Test Part 1'), 10, 'in', (SELECT id FROM users WHERE username = 'admin_test')),
((SELECT id FROM parts WHERE name = 'Test Part 2'), 5, 'out', (SELECT id FROM users WHERE username = 'tech_test')),
((SELECT id FROM parts WHERE name = 'Test Part 3'), 20, 'in', (SELECT id FROM users WHERE username = 'purchasing_test')); 