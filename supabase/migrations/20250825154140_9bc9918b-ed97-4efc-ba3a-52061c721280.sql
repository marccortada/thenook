-- Update services prices and durations to match the provided list where names are known in current DB
-- Antiestrés The Nook 75’ – €75.00 – 80 mins
UPDATE public.services SET price_cents = 7500, duration_minutes = 80, updated_at = now()
WHERE lower(name) IN ('masaje antiestrés thenook', 'antiestrés the nook');

-- Masaje Anticelulítico / Reductor 55’ – €60.00 – 60 mins
UPDATE public.services SET price_cents = 6000, duration_minutes = 60, updated_at = now()
WHERE lower(name) IN ('anticelulítico / reductor');

-- Piernas Cansadas 35’ – €40.00 – 40 mins
UPDATE public.services SET price_cents = 4000, duration_minutes = 40, updated_at = now()
WHERE lower(name) IN ('masaje piernas cansadas', 'piernas cansadas');

-- Masaje Deportivo 50’ – €60.00 – 55 mins
UPDATE public.services SET price_cents = 6000, duration_minutes = 55, updated_at = now()
WHERE lower(name) IN ('masaje deportivo');

-- Masaje Descontracturante 75’ – €75.00 – 80 mins
UPDATE public.services SET price_cents = 7500, duration_minutes = 80, updated_at = now()
WHERE lower(name) = 'masaje descontracturante';

-- Masaje para Embarazadas (Futura Mamá 50’) – €60.00 – 55 mins
UPDATE public.services SET price_cents = 6000, duration_minutes = 55, updated_at = now()
WHERE lower(name) IN ('masaje para embarazadas', 'futura mamá');

-- Masaje Relajante 55’ – €55.00 – 60 mins
UPDATE public.services SET price_cents = 5500, duration_minutes = 60, updated_at = now()
WHERE lower(name) IN ('masaje relajante');

-- Masaje Relajante / Descontracturante 25’ – €35.00 – 30 mins (only if a quick variant exists)
UPDATE public.services SET price_cents = 3500, duration_minutes = 30, updated_at = now()
WHERE lower(name) IN ('masaje relajante / descontracturante 25’', 'masaje relajante / descontracturante 25\'');

-- Reflexología Podal 50’ – €60.00 – 55 mins
UPDATE public.services SET price_cents = 6000, duration_minutes = 55, updated_at = now()
WHERE lower(name) IN ('reflexología podal');

-- Bambuterapia (Masaje con Cañas de Bambú 55’) – €65.00 – 60 mins
UPDATE public.services SET price_cents = 6500, duration_minutes = 60, updated_at = now()
WHERE lower(name) IN ('masaje con cañas de bambú', 'bambuterapia');

-- Masaje con Piedras Calientes 55’ – €65.00 – 60 mins
UPDATE public.services SET price_cents = 6500, duration_minutes = 60, updated_at = now()
WHERE lower(name) IN ('masaje con piedras calientes');

-- Drenaje Linfático 75’ – €75.00 – 80 mins
UPDATE public.services SET price_cents = 7500, duration_minutes = 80, updated_at = now()
WHERE lower(name) IN ('drenaje linfático');

-- Masaje 90 minutos – €90.00 – 95 mins (maps to Masaje Terapéutico)
UPDATE public.services SET price_cents = 9000, duration_minutes = 95, updated_at = now()
WHERE lower(name) IN ('masaje terapéutico');

-- Masaje a Cuatro Manos 50’ – €105.00 – 55 mins
UPDATE public.services SET price_cents = 10500, duration_minutes = 55, updated_at = now()
WHERE lower(name) IN ('masaje a cuatro manos');

-- Rituals (individuales)
-- Ritual Kobido (Facial) – €85.00 – 80 mins
UPDATE public.services SET price_cents = 8500, duration_minutes = 80, updated_at = now()
WHERE lower(name) IN ('ritual kobido');

-- Ritual Romántico Individual – €70.00 – 65 mins
UPDATE public.services SET price_cents = 7000, duration_minutes = 65, updated_at = now()
WHERE lower(name) IN ('ritual romántico de esencias florales', 'ritual romántico individual');

-- Ritual Beauty Individual (Facial y Corporal) – €120.00 – 125 mins
UPDATE public.services SET price_cents = 12000, duration_minutes = 125, updated_at = now()
WHERE lower(name) IN ('ritual beauty (facial y corporal)', 'ritual beauty individual');

-- Ritual Sakura Individual – €90.00 – 95 mins
UPDATE public.services SET price_cents = 9000, duration_minutes = 95, updated_at = now()
WHERE lower(name) IN ('ritual sakura');

-- Note: We intentionally do not deactivate or insert services here due to enum dependencies on services.type

-- ====================
-- Packages (Bonos): enforce only the provided list to be active and correctly priced
-- Build a temp table of allowed packages
CREATE TEMP TABLE _allowed_packages (
  name text PRIMARY KEY,
  sessions_count int NOT NULL,
  price_cents int NOT NULL
);

INSERT INTO _allowed_packages(name, sessions_count, price_cents) VALUES
  ($q$Bono 10 masajes Piernas Cansadas$q$, 10, 38200),
  ($q$Bono 10 masajes 75’$q$, 10, 68000),
  ($q$Bono 10 masajes 45’ para dos Personas$q$, 10, 76500),
  ($q$Bono 5 masajes Piernas Cansadas$q$, 5, 19800),
  ($q$Bono 5 masajes 75’ para dos Personas$q$, 5, 61500),
  ($q$Bono 5 masajes 45’ para dos Personas$q$, 5, 39600),
  ($q$Bono 10 masajes 55’$q$, 10, 51000),
  ($q$Bono 10 masajes Futura Mamá 50’$q$, 10, 51000),
  ($q$Bono 10 sesiones Anticelulítico / Reductor$q$, 10, 51000),
  ($q$Bono 10 sesiones de Shiatsu$q$, 10, 51000),
  ($q$Bono 10 sesiones Drenaje Linfático$q$, 10, 63500),
  ($q$Bono 5 masajes 55’$q$, 5, 26400),
  ($q$Bono 5 masajes 75’$q$, 5, 35500),
  ($q$Bono 5 masajes Futura Mamá 50’$q$, 5, 26400),
  ($q$Bono 5 Rituales Kobido Individual$q$, 5, 39600),
  ($q$Bono 5 sesiones Anticelulítico / Reductor$q$, 5, 26400),
  ($q$Bono 5 sesiones de Shiatsu$q$, 5, 26400),
  ($q$Bono 5 sesiones Drenaje Linfático$q$, 5, 33000),
  ($q$Bono 10 masajes 110’$q$, 10, 97500),
  ($q$Bono 5 masajes 110’$q$, 5, 50500),
  ($q$Bono 5 masajes Futura Mamá 75’$q$, 5, 35500);

-- Update existing packages that match by name (case-insensitive)
UPDATE public.packages p
SET price_cents = a.price_cents,
    sessions_count = a.sessions_count,
    active = true,
    updated_at = now()
FROM _allowed_packages a
WHERE lower(p.name) = lower(a.name);

-- Insert missing packages
INSERT INTO public.packages (name, sessions_count, price_cents, active)
SELECT a.name, a.sessions_count, a.price_cents, true
FROM _allowed_packages a
LEFT JOIN public.packages p ON lower(p.name) = lower(a.name)
WHERE p.id IS NULL;

-- Deactivate any other packages not in the allowed list
UPDATE public.packages
SET active = false, updated_at = now()
WHERE lower(name) NOT IN (SELECT lower(name) FROM _allowed_packages);

-- Clean up
DROP TABLE IF EXISTS _allowed_packages;