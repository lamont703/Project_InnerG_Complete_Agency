-- SEED DATA: High-Signal "Red Zone" Schools
-- Based on historical failure metrics from Texas State Reports

INSERT INTO public.barber_schools (name, city, failure_rate_institutional, is_red_zone)
VALUES 
('Socorro High School', 'EL PASO', 58.50, true),
('Barbers Trade School, Inc.', 'BEAUMONT', 71.40, true),
('James Earl Rudder High School', 'BRYAN', 58.30, true),
('Goldstar Barber Academy', 'BRYAN', 58.30, true),
('Next Top Barber Academy', 'LAREDO', 57.10, true),
('Immaculate Cut Barber Institute', 'LAREDO', 57.10, true),
('Modern Barber College', 'HOUSTON', 55.00, true),
('Cut & Shave Barber & Beauty College', 'SAN ANTONIO', 55.00, true),
('Texas Fadez Barber College', 'DUNCANVILLE', 52.40, true),
('El Pipo Barber School', 'EL PASO', 58.00, true),
('Capelli Barber College', 'EL PASO', 58.00, true),
('Milan Institute of Cosmetology El Paso', 'EL PASO', 58.00, true)
ON CONFLICT (name, city) DO UPDATE 
SET failure_rate_institutional = EXCLUDED.failure_rate_institutional,
    is_red_zone = EXCLUDED.is_red_zone;
