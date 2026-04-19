-- ParkPune — PMC parking lot seed data
-- Run AFTER 001_initial_schema.sql

INSERT INTO parking_lots
    (name, address, geom, total_4w, total_2w, free_4w, free_2w, rate_4w, rate_2w, operating_hours)
VALUES
(
    'FC Road Parking',
    'Fergusson College Road, near Goodluck Cafe, Deccan Gymkhana, Pune 411004',
    ST_SetSRID(ST_MakePoint(73.8397, 18.5195), 4326)::geography,
    60, 20, 45, 15, 20.00, 4.00, '06:00-23:00'
),
(
    'JM Road Parking',
    'Jangli Maharaj Road, near Symbiosis College, Pune 411004',
    ST_SetSRID(ST_MakePoint(73.8378, 18.5167), 4326)::geography,
    40, 20, 30, 18, 20.00, 4.00, '06:00-22:00'
),
(
    'Laxmi Road Parking',
    'Near Tulshibaug, Budhwar Peth, Pune 411002',
    ST_SetSRID(ST_MakePoint(73.8567, 18.5108), 4326)::geography,
    80, 40, 60, 30, 20.00, 4.00, '06:00-22:00'
),
(
    'Deccan Gymkhana Lot',
    'Near Deccan Bus Stand, Pune-Satara Road Junction, Pune 411004',
    ST_SetSRID(ST_MakePoint(73.8414, 18.5162), 4326)::geography,
    70, 30, 55, 25, 20.00, 4.00, '00:00-24:00'
),
(
    'Shivajinagar Metro Lot',
    'Near Shivajinagar Metro Station, FC Road End, Pune 411005',
    ST_SetSRID(ST_MakePoint(73.8476, 18.5300), 4326)::geography,
    100, 50, 80, 40, 20.00, 4.00, '05:00-23:00'
),
(
    'Viman Nagar Lot',
    'Near Viman Nagar Main Road, Phoenix Marketcity, Pune 411014',
    ST_SetSRID(ST_MakePoint(73.9143, 18.5679), 4326)::geography,
    150, 50, 120, 45, 20.00, 4.00, '06:00-23:00'
),
(
    'Balewadi High Street Lot',
    'Near Balewadi High Street, Baner, Pune 411045',
    ST_SetSRID(ST_MakePoint(73.7817, 18.5590), 4326)::geography,
    130, 50, 100, 40, 20.00, 4.00, '06:00-23:00'
),
(
    'Bibvewadi Lot',
    'Bibvewadi Main Road, Pune 411037',
    ST_SetSRID(ST_MakePoint(73.8595, 18.4848), 4326)::geography,
    60, 20, 50, 18, 20.00, 4.00, '06:00-22:00'
);
