-- One-time initial population, run inside a migration (longer/no
-- statement timeout vs. the ~8s PostgREST API limit that killed the
-- first attempt via .rpc()).
SELECT * FROM compute_professional_employment_matches();
