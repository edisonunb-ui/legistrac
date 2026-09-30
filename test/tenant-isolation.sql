-- Executar apenas em banco descartável já migrado: psql -v ON_ERROR_STOP=1 -f test/tenant-isolation.sql
BEGIN;
CREATE ROLE legistrac_rls_test NOLOGIN;
GRANT USAGE ON SCHEMA public TO legistrac_rls_test;
GRANT SELECT,INSERT,UPDATE ON gabinetes,membros,atendimentos,demandas,historico TO legistrac_rls_test;
INSERT INTO gabinetes(id,nome) VALUES ('33333333-3333-4333-8333-333333333333','Isolamento A'),('44444444-4444-4444-8444-444444444444','Isolamento B');
INSERT INTO atendimentos(id,gabinete_id,protocolo,nome,descricao,criado_por) VALUES
('cccccccc-cccc-4ccc-8ccc-cccccccccccc','33333333-3333-4333-8333-333333333333','ISO-A','Pessoa A','Pedido A','teste'),
('dddddddd-dddd-4ddd-8ddd-dddddddddddd','44444444-4444-4444-8444-444444444444','ISO-B','Pessoa B','Pedido B','teste');
SET ROLE legistrac_rls_test;
SELECT set_config('app.gabinete_id','33333333-3333-4333-8333-333333333333',true);
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM atendimentos;
  IF n <> 1 THEN RAISE EXCEPTION 'Gabinete A enxergou % atendimentos',n; END IF;
  SELECT count(*) INTO n FROM atendimentos WHERE id='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  IF n <> 0 THEN RAISE EXCEPTION 'Gabinete A leu o gabinete B'; END IF;
  UPDATE atendimentos SET nome='Violação' WHERE id='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'Gabinete A alterou o gabinete B'; END IF;
END $$;
SELECT set_config('app.gabinete_id','44444444-4444-4444-8444-444444444444',true);
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM atendimentos;
  IF n <> 1 THEN RAISE EXCEPTION 'Gabinete B enxergou % atendimentos',n; END IF;
END $$;
RESET ROLE;
ROLLBACK;