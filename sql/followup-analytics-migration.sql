-- ============================================================
-- FOLLOW-UP 72H ANALYTICS - MIGRAÇÃO SUPABASE
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- 1. TABELA: followup_logs (log detalhado de cada follow-up)
CREATE TABLE IF NOT EXISTS followup_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversa_id UUID REFERENCES conversas(id) ON DELETE CASCADE,
  mensagem_numero INTEGER NOT NULL,
  mensagem_dia INTEGER NOT NULL,
  estrategia TEXT,
  prompt_usado TEXT,
  mensagem_gerada TEXT,
  mensagem_enviada TEXT,
  enviada_em TIMESTAMP DEFAULT NOW(),
  respondida BOOLEAN DEFAULT false,
  respondida_em TIMESTAMP,
  tempo_ate_resposta INTERVAL,
  tipo_resposta VARCHAR(50),
  converteu BOOLEAN DEFAULT false,
  motivo_nao_conversao VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_followup_logs_conversa ON followup_logs(conversa_id);
CREATE INDEX IF NOT EXISTS idx_followup_logs_mensagem_num ON followup_logs(mensagem_numero);
CREATE INDEX IF NOT EXISTS idx_followup_logs_respondida ON followup_logs(respondida);
CREATE INDEX IF NOT EXISTS idx_followup_logs_converteu ON followup_logs(converteu);
CREATE INDEX IF NOT EXISTS idx_followup_logs_enviada_em ON followup_logs(enviada_em);

COMMENT ON TABLE followup_logs IS 'Log detalhado de cada follow-up enviado para analytics';

-- 2. TABELA: followup_metricas_diarias (agregação diária)
CREATE TABLE IF NOT EXISTS followup_metricas_diarias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data DATE NOT NULL,
  mensagem_numero INTEGER NOT NULL,
  total_enviadas INTEGER DEFAULT 0,
  total_respondidas INTEGER DEFAULT 0,
  taxa_resposta DECIMAL(5,2),
  tempo_medio_resposta INTERVAL,
  total_conversoes INTEGER DEFAULT 0,
  taxa_conversao DECIMAL(5,2),
  horario_envio TIME,
  melhor_etiqueta_funil VARCHAR(50),
  melhor_produto VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(data, mensagem_numero)
);

CREATE INDEX IF NOT EXISTS idx_metricas_diarias_data ON followup_metricas_diarias(data);
CREATE INDEX IF NOT EXISTS idx_metricas_diarias_msg ON followup_metricas_diarias(mensagem_numero);

COMMENT ON TABLE followup_metricas_diarias IS 'Métricas agregadas por dia e mensagem para dashboard';

-- 3. TABELA: followup_ab_tests (testes A/B)
CREATE TABLE IF NOT EXISTS followup_ab_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  mensagem_numero INTEGER NOT NULL,
  ativo BOOLEAN DEFAULT true,
  variante_a TEXT,
  variante_b TEXT,
  total_enviadas_a INTEGER DEFAULT 0,
  total_enviadas_b INTEGER DEFAULT 0,
  taxa_resposta_a DECIMAL(5,2),
  taxa_resposta_b DECIMAL(5,2),
  taxa_conversao_a DECIMAL(5,2),
  taxa_conversao_b DECIMAL(5,2),
  vencedor VARCHAR(1),
  inicio_em TIMESTAMP DEFAULT NOW(),
  fim_em TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE followup_ab_tests IS 'Testes A/B de diferentes versões de mensagens';

-- 4. VIEWS PARA ANALYTICS

-- View: Performance por mensagem
CREATE OR REPLACE VIEW followup_performance_mensagem AS
SELECT 
  mensagem_numero,
  mensagem_dia,
  COUNT(*) as total_enviadas,
  COUNT(*) FILTER (WHERE respondida = true) as total_respondidas,
  ROUND(
    COUNT(*) FILTER (WHERE respondida = true)::numeric / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) as taxa_resposta_pct,
  COUNT(*) FILTER (WHERE converteu = true) as total_conversoes,
  ROUND(
    COUNT(*) FILTER (WHERE converteu = true)::numeric / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) as taxa_conversao_pct,
  AVG(EXTRACT(EPOCH FROM tempo_ate_resposta) / 60) as tempo_medio_resposta_minutos,
  MIN(enviada_em) as primeira_enviada_em,
  MAX(enviada_em) as ultima_enviada_em
FROM followup_logs
GROUP BY mensagem_numero, mensagem_dia
ORDER BY mensagem_numero;

-- View: Performance por etiqueta de funil
CREATE OR REPLACE VIEW followup_performance_funil AS
SELECT 
  e.nome as etiqueta_funil,
  fl.mensagem_numero,
  COUNT(*) as total_enviadas,
  COUNT(*) FILTER (WHERE fl.respondida = true) as total_respondidas,
  ROUND(
    COUNT(*) FILTER (WHERE fl.respondida = true)::numeric / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) as taxa_resposta_pct,
  COUNT(*) FILTER (WHERE fl.converteu = true) as total_conversoes,
  ROUND(
    COUNT(*) FILTER (WHERE fl.converteu = true)::numeric / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) as taxa_conversao_pct
FROM followup_logs fl
JOIN conversas c ON c.id = fl.conversa_id
LEFT JOIN conversas_etiquetas ce ON ce.conversa_id = c.id
LEFT JOIN etiquetas e ON e.id = ce.etiqueta_id AND e.tipo = 'funil'
WHERE e.nome IS NOT NULL
GROUP BY e.nome, fl.mensagem_numero
ORDER BY taxa_conversao_pct DESC NULLS LAST;

-- View: Horário de melhor resposta
CREATE OR REPLACE VIEW followup_melhor_horario AS
SELECT 
  EXTRACT(HOUR FROM enviada_em) as hora_envio,
  COUNT(*) as total_enviadas,
  COUNT(*) FILTER (WHERE respondida = true) as total_respondidas,
  ROUND(
    COUNT(*) FILTER (WHERE respondida = true)::numeric / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) as taxa_resposta_pct,
  AVG(EXTRACT(EPOCH FROM tempo_ate_resposta) / 60) as tempo_medio_resposta_min
FROM followup_logs
WHERE respondida = true
GROUP BY EXTRACT(HOUR FROM enviada_em)
ORDER BY taxa_resposta_pct DESC;

-- View: Motivos de não conversão
CREATE OR REPLACE VIEW followup_motivos_perda AS
SELECT 
  motivo_nao_conversao,
  COUNT(*) as total,
  ROUND(
    COUNT(*)::numeric / 
    NULLIF((SELECT COUNT(*) FROM followup_logs WHERE respondida = true AND converteu = false), 0) * 100,
    2
  ) as percentual
FROM followup_logs
WHERE respondida = true 
  AND converteu = false
  AND motivo_nao_conversao IS NOT NULL
GROUP BY motivo_nao_conversao
ORDER BY total DESC;

-- View: Jornada completa do lead
CREATE OR REPLACE VIEW followup_jornada_lead AS
SELECT 
  c.id as conversa_id,
  cl.nome as cliente_nome,
  cl.whatsapp,
  c.janela_72h_inicio,
  COUNT(fl.id) as total_mensagens_enviadas,
  MAX(fl.mensagem_numero) as ultima_mensagem_enviada,
  BOOL_OR(fl.respondida) as respondeu_alguma,
  MIN(fl.respondida_em) FILTER (WHERE fl.respondida = true) as primeira_resposta_em,
  ARRAY_AGG(fl.mensagem_numero ORDER BY fl.mensagem_numero) FILTER (WHERE fl.respondida = true) as mensagens_respondidas,
  BOOL_OR(fl.converteu) as converteu,
  (
    SELECT e.nome 
    FROM conversas_etiquetas ce 
    JOIN etiquetas e ON e.id = ce.etiqueta_id 
    WHERE ce.conversa_id = c.id AND e.tipo = 'funil'
    ORDER BY ce.created_at DESC 
    LIMIT 1
  ) as etiqueta_funil_atual
FROM conversas c
JOIN clientes cl ON cl.id = c.cliente_id
LEFT JOIN followup_logs fl ON fl.conversa_id = c.id
WHERE c.origem = 'anuncio'
GROUP BY c.id, cl.nome, cl.whatsapp, c.janela_72h_inicio
ORDER BY c.janela_72h_inicio DESC;

-- 5. FUNÇÃO: Atualizar métricas diárias
CREATE OR REPLACE FUNCTION atualizar_metricas_followup_diarias()
RETURNS void AS $$
BEGIN
  DELETE FROM followup_metricas_diarias WHERE data = CURRENT_DATE;
  
  INSERT INTO followup_metricas_diarias (
    data, mensagem_numero, total_enviadas, total_respondidas,
    taxa_resposta, tempo_medio_resposta, total_conversoes,
    taxa_conversao, horario_envio, melhor_etiqueta_funil, melhor_produto
  )
  SELECT 
    CURRENT_DATE,
    mensagem_numero,
    COUNT(*),
    COUNT(*) FILTER (WHERE respondida = true),
    ROUND(
      COUNT(*) FILTER (WHERE respondida = true)::numeric / 
      NULLIF(COUNT(*), 0) * 100, 2
    ),
    AVG(tempo_ate_resposta) FILTER (WHERE respondida = true),
    COUNT(*) FILTER (WHERE converteu = true),
    ROUND(
      COUNT(*) FILTER (WHERE converteu = true)::numeric / 
      NULLIF(COUNT(*), 0) * 100, 2
    ),
    CASE 
      WHEN mensagem_numero % 3 = 1 THEN '09:00'::TIME
      WHEN mensagem_numero % 3 = 2 THEN '13:00'::TIME
      ELSE '16:00'::TIME
    END,
    (
      SELECT e.nome
      FROM followup_logs fl2
      JOIN conversas c ON c.id = fl2.conversa_id
      LEFT JOIN conversas_etiquetas ce ON ce.conversa_id = c.id
      LEFT JOIN etiquetas e ON e.id = ce.etiqueta_id AND e.tipo = 'funil'
      WHERE fl2.mensagem_numero = fl.mensagem_numero
        AND fl2.converteu = true
        AND e.nome IS NOT NULL
      GROUP BY e.nome
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ),
    NULL
  FROM followup_logs fl
  WHERE DATE(enviada_em) = CURRENT_DATE
  GROUP BY mensagem_numero;
END;
$$ LANGUAGE plpgsql;

-- 6. RPC: Funil de conversão
CREATE OR REPLACE FUNCTION get_funil_conversao()
RETURNS TABLE (
  numero INTEGER,
  total BIGINT,
  percentual NUMERIC,
  dropoff BIGINT,
  dropoff_pct NUMERIC
) AS $$
DECLARE
  total_msg1 BIGINT;
BEGIN
  SELECT COUNT(DISTINCT conversa_id) INTO total_msg1
  FROM followup_logs WHERE mensagem_numero = 1;

  IF total_msg1 = 0 THEN total_msg1 := 1; END IF;

  RETURN QUERY
  WITH msg_counts AS (
    SELECT 
      fl.mensagem_numero as msg_num,
      COUNT(DISTINCT fl.conversa_id) as cnt
    FROM followup_logs fl
    GROUP BY fl.mensagem_numero
    ORDER BY fl.mensagem_numero
  ),
  with_lag AS (
    SELECT 
      msg_num,
      cnt,
      LAG(cnt) OVER (ORDER BY msg_num) as prev_cnt
    FROM msg_counts
  )
  SELECT 
    wl.msg_num::INTEGER as numero,
    wl.cnt as total,
    ROUND(wl.cnt::numeric / total_msg1 * 100, 1) as percentual,
    COALESCE(wl.prev_cnt - wl.cnt, 0) as dropoff,
    CASE WHEN wl.prev_cnt > 0 
      THEN ROUND((wl.prev_cnt - wl.cnt)::numeric / wl.prev_cnt * 100, 1)
      ELSE 0 
    END as dropoff_pct
  FROM with_lag wl
  ORDER BY wl.msg_num;
END;
$$ LANGUAGE plpgsql;

-- 7. RPC: Overview metrics
CREATE OR REPLACE FUNCTION get_followup_overview(dias INTEGER DEFAULT 30)
RETURNS TABLE (
  total_leads BIGINT,
  taxa_resposta_geral NUMERIC,
  taxa_conversao_geral NUMERIC,
  tempo_medio_resposta_minutos NUMERIC,
  melhor_mensagem INTEGER,
  melhor_mensagem_taxa NUMERIC,
  melhor_horario INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(DISTINCT conversa_id) FROM followup_logs WHERE enviada_em >= NOW() - (dias || ' days')::INTERVAL)::BIGINT,
    COALESCE(ROUND(
      COUNT(*) FILTER (WHERE fl.respondida = true)::numeric / NULLIF(COUNT(*), 0) * 100, 1
    ), 0),
    COALESCE(ROUND(
      COUNT(*) FILTER (WHERE fl.converteu = true)::numeric / NULLIF(COUNT(*), 0) * 100, 1
    ), 0),
    COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM fl.tempo_ate_resposta) / 60) FILTER (WHERE fl.respondida = true), 0), 0),
    (
      SELECT sub.mensagem_numero FROM followup_logs sub
      WHERE sub.enviada_em >= NOW() - (dias || ' days')::INTERVAL
      GROUP BY sub.mensagem_numero
      ORDER BY COUNT(*) FILTER (WHERE sub.respondida = true)::numeric / NULLIF(COUNT(*), 0) DESC
      LIMIT 1
    ),
    (
      SELECT ROUND(COUNT(*) FILTER (WHERE sub.respondida = true)::numeric / NULLIF(COUNT(*), 0) * 100, 1)
      FROM followup_logs sub
      WHERE sub.enviada_em >= NOW() - (dias || ' days')::INTERVAL
      GROUP BY sub.mensagem_numero
      ORDER BY COUNT(*) FILTER (WHERE sub.respondida = true)::numeric / NULLIF(COUNT(*), 0) DESC
      LIMIT 1
    ),
    (
      SELECT EXTRACT(HOUR FROM sub.enviada_em)::INTEGER
      FROM followup_logs sub
      WHERE sub.respondida = true AND sub.enviada_em >= NOW() - (dias || ' days')::INTERVAL
      GROUP BY EXTRACT(HOUR FROM sub.enviada_em)
      ORDER BY COUNT(*)::numeric / NULLIF((SELECT COUNT(*) FROM followup_logs sub2 WHERE EXTRACT(HOUR FROM sub2.enviada_em) = EXTRACT(HOUR FROM sub.enviada_em)), 0) DESC
      LIMIT 1
    )
  FROM followup_logs fl
  WHERE fl.enviada_em >= NOW() - (dias || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- 8. Habilitar RLS (Row Level Security) - permitir acesso anônimo para as tabelas
ALTER TABLE followup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE followup_metricas_diarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE followup_ab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for followup_logs" ON followup_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for followup_metricas_diarias" ON followup_metricas_diarias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for followup_ab_tests" ON followup_ab_tests FOR ALL USING (true) WITH CHECK (true);

-- Pronto! Execute este script no SQL Editor do Supabase.
