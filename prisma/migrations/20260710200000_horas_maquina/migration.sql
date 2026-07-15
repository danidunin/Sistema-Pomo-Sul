-- Controle de Hora-Máquina: campo simples e opcional em Atividades e Tratamentos,
-- sem vínculo a uma máquina específica — puramente aditivo, não afeta dados existentes.

ALTER TABLE "atividades" ADD COLUMN "horas_maquina" DECIMAL(6,2);
ALTER TABLE "operacoes_agricolas" ADD COLUMN "horas_maquina" DECIMAL(6,2);
