-- Update all service prices and durations based on new pricing structure

-- Masajes Individuales
UPDATE services SET price_cents = 7500, duration_minutes = 80 WHERE name LIKE '%Antiestrés%' OR name LIKE '%TheNook%';
UPDATE services SET price_cents = 6000, duration_minutes = 60 WHERE name LIKE '%Anticelulítico%' OR name LIKE '%Reductor%';
UPDATE services SET price_cents = 4000, duration_minutes = 40 WHERE name LIKE '%Piernas Cansadas%' AND NOT (name LIKE '%dos%' OR name LIKE '%tres%');
UPDATE services SET price_cents = 6000, duration_minutes = 55 WHERE name LIKE '%Deportivo%';
UPDATE services SET price_cents = 7500, duration_minutes = 80 WHERE name LIKE '%Descontracturante%' AND duration_minutes >= 75;
UPDATE services SET price_cents = 5500, duration_minutes = 60 WHERE name LIKE '%Descontracturante%' AND duration_minutes < 75;
UPDATE services SET price_cents = 6000, duration_minutes = 55 WHERE name LIKE '%Futura Mamá%' OR name LIKE '%Embarazadas%' AND duration_minutes >= 50;
UPDATE services SET price_cents = 3500, duration_minutes = 30 WHERE name LIKE '%Relajante%' AND (duration_minutes <= 30 OR name LIKE '%25%');
UPDATE services SET price_cents = 5500, duration_minutes = 60 WHERE name LIKE '%Relajante%' AND duration_minutes BETWEEN 50 AND 65;
UPDATE services SET price_cents = 7500, duration_minutes = 80 WHERE name LIKE '%Relajante%' AND duration_minutes >= 75;
UPDATE services SET price_cents = 6000, duration_minutes = 55 WHERE name LIKE '%Reflexología%' AND NOT (name LIKE '%dos%' OR name LIKE '%tres%');
UPDATE services SET price_cents = 6500, duration_minutes = 60 WHERE name LIKE '%Bambú%' OR name LIKE '%Cañas%' AND NOT name LIKE '%dos%';
UPDATE services SET price_cents = 6500, duration_minutes = 60 WHERE name LIKE '%Piedras Calientes%' AND NOT name LIKE '%dos%';
UPDATE services SET price_cents = 7500, duration_minutes = 80 WHERE name LIKE '%Drenaje Linfático%';
UPDATE services SET price_cents = 9000, duration_minutes = 95 WHERE name LIKE '%90 minutos%';
UPDATE services SET price_cents = 7500, duration_minutes = 80 WHERE name LIKE '%Futura Mamá%' AND duration_minutes >= 75;
UPDATE services SET price_cents = 6500, duration_minutes = 60 WHERE name LIKE '%Shiatsu%';

-- Masajes a Cuatro Manos
UPDATE services SET price_cents = 10500, duration_minutes = 55 WHERE name LIKE '%Cuatro Manos%';

-- Masajes para Dos Personas
UPDATE services SET price_cents = 13500, duration_minutes = 85 WHERE name LIKE '%dos%' AND duration_minutes >= 75 AND duration_minutes < 100;
UPDATE services SET price_cents = 18000, duration_minutes = 120 WHERE name LIKE '%dos%' AND duration_minutes >= 110;
UPDATE services SET price_cents = 9900, duration_minutes = 65 WHERE name LIKE '%dos%' AND duration_minutes BETWEEN 55 AND 65;
UPDATE services SET price_cents = 9000, duration_minutes = 55 WHERE name LIKE '%dos%' AND duration_minutes BETWEEN 45 AND 50;
UPDATE services SET price_cents = 6500, duration_minutes = 35 WHERE name LIKE '%dos%' AND duration_minutes <= 30;
UPDATE services SET price_cents = 12000, duration_minutes = 65 WHERE name LIKE '%dos%' AND name LIKE '%Bambú%';
UPDATE services SET price_cents = 11000, duration_minutes = 65 WHERE name LIKE '%dos%' AND name LIKE '%Piedras%';
UPDATE services SET price_cents = 8000, duration_minutes = 45 WHERE name LIKE '%dos%' AND name LIKE '%Piernas%';
UPDATE services SET price_cents = 10500, duration_minutes = 60 WHERE name LIKE '%dos%' AND name LIKE '%Reflexología%';
UPDATE services SET price_cents = 18000, duration_minutes = 100 WHERE name LIKE '%dos%' AND name LIKE '%90%';

-- Special pricing for third-party services
UPDATE services SET price_cents = 5593 WHERE name LIKE '%Sbox%' AND name LIKE '%45%';
UPDATE services SET price_cents = 6993 WHERE name LIKE '%Sbox%' AND name LIKE '%55%';
UPDATE services SET price_cents = 10612 WHERE name LIKE '%Atrápalo%';
UPDATE services SET price_cents = 6800 WHERE name LIKE '%Wonderbox%';
UPDATE services SET price_cents = 8921 WHERE name LIKE '%Groupon%' AND name LIKE '%55%';
UPDATE services SET price_cents = 12195 WHERE name LIKE '%Groupon%' AND name LIKE '%85%';

-- Rituales Individuales
UPDATE services SET price_cents = 8500, duration_minutes = 80 WHERE name LIKE '%Kobido%' AND NOT name LIKE '%dos%';
UPDATE services SET price_cents = 7000, duration_minutes = 65 WHERE name LIKE '%Romántico%' AND NOT name LIKE '%dos%';
UPDATE services SET price_cents = 12000, duration_minutes = 125 WHERE name LIKE '%Beauty%' AND NOT name LIKE '%dos%';
UPDATE services SET price_cents = 9000, duration_minutes = 95 WHERE name LIKE '%Sakura%' AND NOT name LIKE '%dos%';

-- Rituales para Dos Personas
UPDATE services SET price_cents = 12000, duration_minutes = 70 WHERE name LIKE '%Energizante%' AND name LIKE '%dos%';
UPDATE services SET price_cents = 15500, duration_minutes = 85 WHERE name LIKE '%Kobido%' AND name LIKE '%dos%';
UPDATE services SET price_cents = 17500, duration_minutes = 100 WHERE name LIKE '%Sakura%' AND name LIKE '%dos%';
UPDATE services SET price_cents = 11500, duration_minutes = 70 WHERE name LIKE '%Romántico%' AND name LIKE '%dos%';

-- Tratamientos Tres Personas
UPDATE services SET price_cents = 16000, duration_minutes = 65 WHERE name LIKE '%tres%' AND duration_minutes BETWEEN 55 AND 65;
UPDATE services SET price_cents = 21000, duration_minutes = 85 WHERE name LIKE '%tres%' AND duration_minutes BETWEEN 75 AND 85;
UPDATE services SET price_cents = 25500, duration_minutes = 95 WHERE name LIKE '%tres%' AND duration_minutes BETWEEN 85 AND 95;
UPDATE services SET price_cents = 12000, duration_minutes = 45 WHERE name LIKE '%tres%' AND name LIKE '%Piernas%';
UPDATE services SET price_cents = 29000, duration_minutes = 120 WHERE name LIKE '%tres%' AND duration_minutes >= 110;
UPDATE services SET price_cents = 16000, duration_minutes = 60 WHERE name LIKE '%tres%' AND name LIKE '%Reflexología%';
UPDATE services SET price_cents = 31500, duration_minutes = 130 WHERE name LIKE '%tres%' AND name LIKE '%Beauty%';
UPDATE services SET price_cents = 27000, duration_minutes = 100 WHERE name LIKE '%tres%' AND name LIKE '%Sakura%';

-- Update packages prices
UPDATE packages SET price_cents = 38200 WHERE name LIKE '%10%' AND name LIKE '%Piernas%';
UPDATE packages SET price_cents = 68000 WHERE name LIKE '%10%' AND name LIKE '%75%' AND NOT name LIKE '%dos%';
UPDATE packages SET price_cents = 76500 WHERE name LIKE '%10%' AND name LIKE '%45%' AND name LIKE '%dos%';
UPDATE packages SET price_cents = 19800 WHERE name LIKE '%5%' AND name LIKE '%Piernas%';
UPDATE packages SET price_cents = 61500 WHERE name LIKE '%5%' AND name LIKE '%75%' AND name LIKE '%dos%';
UPDATE packages SET price_cents = 39600 WHERE name LIKE '%5%' AND name LIKE '%45%' AND name LIKE '%dos%';
UPDATE packages SET price_cents = 51000 WHERE name LIKE '%10%' AND name LIKE '%55%' AND NOT name LIKE '%dos%';
UPDATE packages SET price_cents = 51000 WHERE name LIKE '%10%' AND name LIKE '%Futura Mamá%' AND name LIKE '%50%';
UPDATE packages SET price_cents = 51000 WHERE name LIKE '%10%' AND name LIKE '%Anticelulítico%';
UPDATE packages SET price_cents = 51000 WHERE name LIKE '%10%' AND name LIKE '%Shiatsu%';
UPDATE packages SET price_cents = 63500 WHERE name LIKE '%10%' AND name LIKE '%Drenaje%';
UPDATE packages SET price_cents = 26400 WHERE name LIKE '%5%' AND name LIKE '%55%' AND NOT name LIKE '%dos%';
UPDATE packages SET price_cents = 35500 WHERE name LIKE '%5%' AND name LIKE '%75%' AND NOT name LIKE '%dos%';
UPDATE packages SET price_cents = 26400 WHERE name LIKE '%5%' AND name LIKE '%Futura Mamá%' AND name LIKE '%50%';
UPDATE packages SET price_cents = 39600 WHERE name LIKE '%5%' AND name LIKE '%Kobido%';
UPDATE packages SET price_cents = 26400 WHERE name LIKE '%5%' AND name LIKE '%Anticelulítico%';
UPDATE packages SET price_cents = 26400 WHERE name LIKE '%5%' AND name LIKE '%Shiatsu%';
UPDATE packages SET price_cents = 33000 WHERE name LIKE '%5%' AND name LIKE '%Drenaje%';
UPDATE packages SET price_cents = 97500 WHERE name LIKE '%10%' AND name LIKE '%110%';
UPDATE packages SET price_cents = 50500 WHERE name LIKE '%5%' AND name LIKE '%110%';
UPDATE packages SET price_cents = 35500 WHERE name LIKE '%5%' AND name LIKE '%Futura Mamá%' AND name LIKE '%75%';