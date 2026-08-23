-- Uma armadilha só pode ter uma leitura por data. Sem essa restrição, reabrir a
-- grade de lançamento em lote para uma data já lançada criava uma segunda linha
-- para a mesma armadilha+data, e a média do ponto passava a dividir pelo número
-- errado de armadilhas. O lançamento em lote agora faz upsert nessa chave.

CREATE UNIQUE INDEX "leituras_armadilha_armadilha_id_data_key" ON "leituras_armadilha"("armadilha_id", "data");
