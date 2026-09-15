CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user'
);

INSERT INTO categories (name) VALUES ('Electronics'), ('Apparel') ON CONFLICT DO NOTHING;
INSERT INTO products (title, description, price, stock, category_id) VALUES 
('Keyboard', 'RGB Switch Keyboard', 89.99, 15, 1),
('Mouse', 'Wireless Ergonomic Mouse', 29.99, 30, 1) ON CONFLICT DO NOTHING;
INSERT INTO users (email, hashed_password, role) VALUES 
('admin@test.com', 'admin123', 'admin'),
('user@test.com', 'user123', 'user') ON CONFLICT DO NOTHING;