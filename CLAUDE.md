# CLAUDE.md

## Projeto: POMO SUL
### Sistema Integrado de Gestão Operacional do Pomar

---

## 1. VISÃO DO PROJETO

O **POMO SUL** é um sistema integrado de gestão operacional agrícola desenvolvido para organizar, integrar e preservar o histórico das atividades da propriedade.

O objetivo principal é criar uma **única fonte confiável de informações**, substituindo gradualmente controles dispersos em planilhas, anotações e registros manuais.

O sistema deve ser construído especificamente para a realidade da POMO SUL.

- Não deve ser um ERP agrícola genérico.
- Deve ser uma ferramenta prática de gestão para uma propriedade de fruticultura, focada em:
  - controle operacional;
  - organização das informações;
  - histórico completo;
  - integração entre atividades;
  - facilidade de uso no dia a dia.

O sistema deve transformar informações que hoje estão distribuídas em planilhas, anotações e comunicação informal em uma base organizada e confiável.

---

## 2. OBJETIVO PRINCIPAL

Criar uma **única fonte de informação operacional** da propriedade.

O sistema deve centralizar:

- Talhões
- Operações agrícolas
- Produtos utilizados
- Estoque
- Atividades
- Horas-homem
- Máquinas
- Manutenções
- Fotos quando necessário
- Observações
- Histórico operacional

---

## 3. PRINCÍPIO FUNDAMENTAL

### O TALHÃO É O CENTRO DO SISTEMA

Toda informação operacional deve estar relacionada a um talhão.

Cada talhão representa uma unidade produtiva com uma história própria.

O sistema deve permitir consultar a vida completa de cada área:

- características;
- implantação;
- espécie;
- variedade;
- porta-enxerto;
- idade;
- tratamentos realizados;
- herbicidas;
- adubações;
- atividades;
- observações;
- histórico operacional.

---

## 4. PRINCÍPIO DE INTERFACE

O POMO SUL deve possuir uma interface moderna, limpa, simples e agradável.

**A prioridade da interface é:**
> Gestão operacional primeiro. Visual como suporte.

### Mobile-first, Desktop-ready

O sistema deve ser projetado com abordagem **mobile-first**: a interface é construída primeiro para telas pequenas e depois expandida para desktop — nunca o contrário.

**Ambas as versões devem funcionar muito bem.** Não é aceitável que uma experiência seja significativamente inferior à outra.

| Contexto de uso | Dispositivo | Uso principal |
|---|---|---|
| Campo, durante a operação | Celular | Lançamentos rápidos |
| Escritório, gestão e consultas | Desktop | Cadastros, histórico, análise |

**Requisitos de interface mobile:**

- Layout pensado para tela pequena desde o início.
- Botões e áreas de toque com tamanho adequado para uso em campo.
- Formulários com campos grandes e teclado otimizado para cada tipo de dado.
- Navegação por menu inferior — padrão de aplicativo, não de site.
- Fluxo de lançamento rápido: registrar uma operação em poucos toques.
- Funcionar bem em conexões lentas ou instáveis.
- Possibilidade de instalação como PWA na tela inicial do celular.

**Requisitos de interface desktop:**

- Aproveitar o espaço maior para exibir mais informações simultaneamente.
- Navegação lateral ou superior.
- Tabelas e listas com mais colunas visíveis.
- Formulários mais completos em uma única tela.

O sistema deve priorizar:

- rapidez nos lançamentos;
- facilidade de entendimento;
- poucos passos para registrar informações;
- clareza dos dados.

Recursos visuais, como fotos e imagens, devem ser utilizados quando agregarem valor para:

- identificação;
- acompanhamento;
- histórico;
- registro de problemas.

**Exemplos:**

| Contexto | Utilidade da foto |
|---|---|
| Máquinas | Identificação e histórico de manutenção (ex: Trator Valtra 07) |
| Talhões | Acompanhamento da evolução da área |
| Pragas e doenças | Registro de sintomas |

> Imagens **não devem ser prioridade** nem tornar o sistema lento ou complexo.

---

## 5. FILOSOFIA DO PROJETO

### Simplicidade acima de complexidade

O sistema deve facilitar a rotina da propriedade.
Não criar campos, classificações, subgrupos ou controles que não gerem valor.

### Registrar uma vez, utilizar várias vezes

Uma informação cadastrada deve alimentar automaticamente todos os locais necessários.

**Exemplo:** Uma operação agrícola registrada deve:
- aparecer no histórico do talhão;
- gerar consumo de estoque;
- registrar a atividade realizada;
- permitir análises futuras.

### O sistema não substitui conhecimento técnico

O sistema não deve tomar decisões agronômicas. As decisões continuam sendo feitas pelo responsável técnico.

O sistema deve: **registrar, organizar, armazenar e facilitar consultas futuras.**

---

## 6. USUÁRIOS DO SISTEMA

O sistema terá usuários cadastrados. Todos os usuários terão as mesmas permissões.

Não haverá inicialmente diferenciação entre: administrador, sócio, gerente ou funcionário.

Todos poderão:
- visualizar informações;
- cadastrar informações;
- editar informações;
- acessar todos os módulos.

> O objetivo inicial é manter o sistema simples. Controle avançado de permissões poderá ser desenvolvido futuramente caso seja necessário.

---

## 7. MÓDULO 1 — TALHÕES

O talhão é a **principal entidade** do sistema. Cada talhão deve possuir cadastro próprio.

**Campos do cadastro:**

| Campo | Descrição |
|---|---|
| Nome/codinome | Identificação histórica do talhão |
| Fazenda | Propriedade à qual pertence |
| Área | Em hectares |
| Cultura | Tipo de cultura |
| Espécie | Espécie plantada |
| Variedade | Variedade da espécie |
| Porta-enxerto | Porta-enxerto utilizado |
| Ano de plantio | Ano de implantação |
| Espaçamento | Espaçamento entre plantas/linhas |
| Número de plantas | Total de plantas |
| Observações | Informações gerais |
| Foto | Opcional |

### Histórico do talhão

Cada talhão deve possuir uma linha do tempo contendo:
- operações realizadas;
- tratamentos;
- herbicidas;
- adubações;
- atividades;
- observações;
- fotos quando necessário.

---

## 8. MÓDULO 2 — OPERAÇÕES AGRÍCOLAS

Este módulo registra as aplicações realizadas no pomar.

**Tipos iniciais:**
- Tratamentos fitossanitários
- Herbicidas
- Adubação
- Outras aplicações agrícolas

### Estrutura geral de uma operação

| Campo | |
|---|---|
| Data | |
| Tipo de operação | |
| Talhão | |
| Produtos utilizados | |
| Quantidade utilizada | |
| Responsável | |
| Máquina utilizada | |
| Operador | |
| Observações | |
| Foto | Opcional |

### Tratamentos fitossanitários

Registrar:
- Data, talhões tratados, produtos utilizados, quantidades, volume de calda, máquina utilizada, operador, observações.
- Permitir **múltiplos produtos** na mesma aplicação.

### Herbicidas

Registrar:
- Data, talhão, produto, quantidade aplicada, volume de calda, máquina, operador, observações.

### Adubação

Registrar:
- Data, talhão, produto utilizado, quantidade aplicada, unidade, máquina/equipamento, responsável, observações.

---

## 9. MÓDULO 3 — ESTOQUE

Controle simples de produtos.

> Não criar subgrupos inicialmente. Todos os produtos devem aparecer em uma **lista única em ordem alfabética**.

### Cadastro de produtos

| Campo | |
|---|---|
| Nome do produto | |
| Unidade | |
| Quantidade disponível | |
| Observações | |

### Movimentações

| Tipo | Origem |
|---|---|
| Entrada | Lançamento manual (produto, quantidade, data, observação) |
| Saída | Gerada automaticamente pelas operações agrícolas |

---

## 10. MÓDULO 4 — ATIVIDADES

Registrar todas as atividades realizadas no pomar.

> Não criar subgrupos. Todas as atividades estarão em uma única lista de opções.

**Lista inicial:**

1. Roçar
2. Triturar galhos
3. Colher
4. Podar
5. Ralear
6. Arquear galhos
7. Cortar cavalos
8. Plantio
9. Replantio
10. Outros

> A lista deve poder ser ampliada futuramente.

### Registro da atividade

| Campo | |
|---|---|
| Data | |
| Tipo de atividade | |
| Talhão | |
| Funcionários envolvidos | |
| Horas trabalhadas por funcionário | |
| Observações | |
| Foto | Opcional |

O sistema deve calcular automaticamente:
- **Horas-homem da atividade**
- **Horas-homem por talhão**

---

## 11. MÓDULO 5 — MÁQUINAS E MANUTENÇÃO

Controle da frota e equipamentos.

### Cadastro de máquinas

| Campo | |
|---|---|
| Nome | |
| Marca | |
| Modelo | |
| Ano | |
| Foto | Opcional |
| Horímetro | |
| Observações | |

### Histórico de manutenção

| Campo | |
|---|---|
| Data | |
| Máquina | |
| Serviço realizado | |
| Peças utilizadas | |
| Valor | |
| Horímetro | |
| Mecânico | |
| Observações | |
| Fotos | Quando necessário |

> **Objetivo:** Criar histórico completo da vida útil de cada máquina.

---

## 12. MÓDULO 6 — FOTOS E OBSERVAÇÕES

Criar registro visual complementar da propriedade.

Fotos devem ser utilizadas principalmente para:
- doenças;
- sintomas;
- danos climáticos;
- evolução do pomar;
- identificação de máquinas;
- registros importantes.

**Cada foto deve possuir:**
- Data
- Talhão ou equipamento relacionado
- Descrição

---

## 13. FUNCIONALIDADES FUTURAS

> Não implementar inicialmente.

Possíveis evoluções:
- produção;
- custos completos;
- indicadores;
- dashboards;
- integração climática;
- inteligência artificial;
- análises históricas avançadas.

---

## 14. TECNOLOGIA PREVISTA

**Arquitetura moderna:**

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js / React |
| Backend | API integrada |
| Banco de dados | PostgreSQL |
| Hospedagem | Cloud moderna |
| Interface | Mobile-first, Desktop-ready — PWA instalável no celular |

---

## 15. REGRAS PARA O DESENVOLVIMENTO

Antes de criar qualquer funcionalidade:

1. Entender o processo real da propriedade.
2. Evitar burocracia.
3. Evitar duplicação de dados.
4. Criar interfaces simples.
5. Priorizar uso diário.
6. Manter código organizado.
7. Documentar decisões importantes.

---

## 16. PRIMEIRA FASE DE DESENVOLVIMENTO

Criar inicialmente:

1. Estrutura do projeto
2. Sistema de usuários
3. Cadastro de talhões
4. Histórico dos talhões
5. Operações agrícolas
6. Tratamentos fitossanitários
7. Herbicidas
8. Adubação
9. Cadastro de produtos
10. Controle básico de estoque
11. Atividades e horas-homem
12. Cadastro de máquinas
13. Histórico básico de manutenção

---

## REGRA FINAL DO PROJETO

> O POMO SUL deve ser uma ferramenta **simples, integrada e utilizada diariamente.**

O objetivo não é criar um sistema complexo.

O objetivo é **transformar a experiência e o conhecimento da propriedade em uma memória operacional digital organizada.**

**Prioridades:**

| # | Prioridade |
|---|---|
| 1 | Gestão operacional |
| 2 | Informação confiável |
| 3 | Integração dos dados |
| 4 | Facilidade de uso |
| 5 | Histórico completo |
| 6 | Visual como suporte |
| 7 | Evolução gradual |
