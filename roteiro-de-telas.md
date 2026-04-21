# Nivel7 - Roteiro de Telas (MVP)

Este roteiro traduz o `guia.md` e o `quiz-schema.json` em uma sequencia pratica de telas, com objetivo, copy e comportamento.

## Regras globais de UX
- 1 pergunta por tela
- Barra de progresso sempre visivel (exceto oferta final)
- Botao principal fixo no rodape (mobile first)
- Linguagem direta e simples
- Feedback instantaneo ao clicar em opcoes
- Sem cadastro de conta, apenas nome + email

---

## Tela 01 - Landing / Hero
**Objetivo:** iniciar quiz com alto desejo.

**Copy principal:**
- Headline: "Descubra por que voce nao atrai (em menos de 3 minutos)"
- Subheadline: "Uma analise brutalmente honesta da sua aparencia + o que ajustar para gerar mais atracao."
- CTA primario: "Quero meu diagnostico"
- CTA secundario: "Ver como funciona"

**Elementos:**
- Prova de rapidez: "Leva cerca de 3 minutos"
- Prova de personalizacao: "Analise unica para seu perfil"
- Nota de seguranca: "Suas fotos nao sao publicas"

---

## Tela 02 - Como Funciona (opcional)
**Objetivo:** reduzir friccao antes do quiz.

**Blocos em 3 passos:**
1. Responda perguntas rapidas
2. Envie ate 3 fotos
3. Receba seu diagnostico + plano de melhoria

**CTA:** "Comecar agora"

---

## Telas 03 a 11 - Quiz (bloco principal)
**Objetivo:** coletar sinais para personalizacao e preparar captura de lead.

Ordem sugerida:
1. Genero
2. Faixa etaria
3. Objetivo atual
4. Autoavaliacao de estilo
5. Conforto com fotos
6. Frequencia de cuidado
7. Estilo de roupa no dia a dia
8. Postura/expressao percebida
9. Percepcao no primeiro contato

**Microcopy fixa no topo:**
"Nao existe resposta certa. Responda com sinceridade."

**Comportamento:**
- Ao selecionar opcao, habilitar "Continuar"
- Salvar resposta em tempo real (estado local ou backend)

---

## Tela 12 - Captura de Nome + Email
**Objetivo:** capturar lead no pico de intencao.

**Copy:**
- Titulo: "Seu resultado personalizado esta quase pronto"
- Subtexto: "Confirme seus dados para receber seu diagnostico e seu link de desbloqueio."

**Campos:**
- Nome (obrigatorio)
- Email (obrigatorio, validacao de formato)

**CTA:** "Continuar para finalizar analise"

**Comportamento de validacao:**
- Mostrar erro curto: "Digite um email valido"
- Nao permitir avancar sem os dois campos

---

## Telas 13 a 15 - Quiz final
**Objetivo:** finalizar mapeamento de intencao e urgencia.

Perguntas:
1. Sente que chama atencao ao chegar?
2. Maior bloqueio atual para atracao
3. Tipo de pessoa que quer atrair
4. Tempo para perceber melhora
5. Disposicao para ajustar nos proximos 7 dias

---

## Tela 16 - Upload de Fotos
**Objetivo:** reforcar personalizacao e aumentar valor percebido.

**Copy:**
- Titulo: "Envie ate 3 fotos para calibrar seu diagnostico"
- Orientacoes:
  - "Rosto visivel e boa iluminacao"
  - "Use pelo menos um angulo frontal"
  - "Se puder, inclua uma foto de meio corpo"

**Regras:**
- Minimo: 1 foto
- Maximo: 3 fotos
- Formatos: jpg, jpeg, png, webp

**CTA:** "Gerar meu diagnostico"

---

## Tela 17 - Processamento (loading narrativo)
**Objetivo:** aumentar expectativa e credibilidade.

Duracao recomendada: 5 a 10 segundos.

Mensagens rotativas:
- "Analisando padrao de presenca..."
- "Comparando seu estilo com seu objetivo..."
- "Montando seu perfil de atracao..."

**Observacao:** nunca travar sem feedback; incluir indicador de progresso visual.

---

## Tela 18 - Spoiler de Resultado (Teaser)
**Objetivo:** gerar impacto emocional e abrir intencao de compra.

**Estrutura obrigatoria:**
1. Nota parcial (ex: 6.3/10)
2. Frase-impacto personalizada
3. Gancho de desbloqueio

**Exemplo de copy:**
"Sua nota atual e 6.3/10.  
Voce nao esta sendo ignorado(a) por falta de beleza, e sim por baixa assinatura visual.  
Desbloqueie agora para ver exatamente o que ajustar esta semana."

**CTA principal:** "Desbloquear meu resultado completo"

---

## Tela 19 - Oferta de Planos
**Objetivo:** converter para desbloqueio pago.

**Layout:**
- Card 1: Plano Basico
- Card 2: Plano Completo (destacado com selo "Mais escolhido")

**Basico inclui:**
- Nota completa
- Analise dos 3 pilares
- Top 5 melhorias praticas

**Completo inclui:**
- Tudo do basico
- Perfil de atracao
- Bloqueios de atracao
- Plano de 7 dias
- Primeira impressao social
- Simulacao de evolucao

**CTAs:**
- Basico: "Desbloquear minha nota completa"
- Completo: "Quero meu plano de atracao completo"

**Microcopy de urgencia etica:**
"Relatorio gerado para seu momento atual. Recomendado desbloquear enquanto os dados estao frescos."

---

## Tela 20 - Confirmacao de Envio / Aguardar Checkout
**Objetivo:** manter continuidade ate integracao de pagamento.

**Copy temporaria (MVP sem checkout integrado):**
"Perfeito, {nome}. Seu resultado foi preparado e enviado para {email}.  
No email voce encontra seu link de desbloqueio."

**CTA secundario:** "Voltar ao inicio"

---

## Entregas por Email (pos-fluxo)

## Email 1 - Entrega inicial
- Assunto: "Seu Raio-X de Atracao esta pronto"
- Conteudo: nota parcial + insight + link de desbloqueio

## Email 2 - Recuperacao D+1
- Assunto: "Voce viu isso no seu resultado?"
- Conteudo: bloqueio principal + novo CTA

## Email 3 - Ultima chamada D+2/D+3
- Assunto: "Ultima chance de desbloquear seu plano"
- Conteudo: urgencia leve + CTA final

---

## Eventos para Analytics (recomendado)
- `landing_view`
- `quiz_started`
- `question_answered` (com questionId)
- `lead_submitted`
- `photo_uploaded`
- `analysis_generated`
- `teaser_viewed`
- `offer_viewed`
- `plan_selected` (basico/completo)
- `checkout_clicked`
- `email_opened` (via ferramenta de email)

---

## Criterios de Pronto (MVP)
- Quiz completo funciona em mobile sem quebra
- Captura nome/email validada
- Upload de 1 a 3 fotos funcional
- Teaser aparece com dados personalizados
- Tela de oferta exibe os dois planos
- Email 1 dispara com placeholders preenchidos

Com esse roteiro, voce consegue sair da ideia para uma primeira versao vendavel, com narrativa forte e fluxo otimizado para conversao.
