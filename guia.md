# Nivel7 
## 1) Visao do Produto

**Nome do produto (recomendado para teste principal):** `Por que voce nao atrai?`  
**Subnome operacional:** `Analise Brutal de Aparencia + Poder de Atracao`

**Promessa central:**  
"Descubra sua nota real de aparencia, o que esta reduzindo sua atracao e exatamente o que ajustar nos proximos 7 dias."

**Mecanismo unico (MVP):**  
Uma analise personalizada com base em respostas de quiz + leitura visual de ate 3 fotos, entregando diagnostico emocional + plano pratico.

**Resultado que vende:**  
- Clareza sobre "como sou percebido hoje"
- Explicacao do "por que nao estou atraindo quem quero"
- Proximo passo simples e imediato

---

## 2) Posicionamento Comercial

### Publico inicial
- Homens e mulheres 18-38
- Solteiros(as) ou em fase de reconstrucao de autoestima
- Pessoas que sentem que "tem potencial, mas nao convertem interesse"

### Dores que mais convertem
- "Nao me acho feio(a), mas nao gero impacto."
- "As pessoas me tratam como amigo(a), nao como opcao romantica."
- "Nao sei o que mudar sem parecer forcar personalidade."

### Tom de voz
- Brutalmente honesto, porem respeitoso
- Direto, especifico e acionavel
- Nunca humilhante; sempre com possibilidade de melhora

### Principio psicologico
Nao vender "beleza perfeita". Vender **percepcao + atracao + progresso rapido**.

---

## 3) Arquitetura da Oferta

## Plano Basico - "Nivel de Aparencia"
Inclui:
- Nota geral (0 a 10) com explicacao curta
- Leitura em 3 pilares: estilo, simetria, presenca
- 5 melhorias praticas priorizadas

## Plano Completo - "Poder de Atracao"
Inclui tudo do basico + bonus:
- Bonus 1: Perfil de Atracao (arquetipo)
- Bonus 2: O que esta bloqueando sua atracao hoje
- Bonus 3: Plano de Atracao em 7 dias
- Bonus 4: Como as pessoas te enxergam no primeiro contato
- Bonus extra: Simulacao de impacto apos ajustes (projecao de evolucao)

### Ancoragem de valor
- Basico: "o que voce e hoje"
- Completo: "o que esta te travando + como virar o jogo"

---

## 4) Funil Completo (Sem Conta, Via Email)

## Etapa 1 - Landing de entrada
Objetivo: gerar curiosidade e iniciar quiz.

Copy sugerida:
- Headline: "Descubra por que voce nao atrai (em menos de 3 minutos)"
- Subheadline: "Receba uma analise brutalmente honesta sobre sua aparencia e sua energia de atracao."
- CTA: "Quero meu diagnostico"

## Etapa 2 - Quiz progressivo
Objetivo: aumentar envolvimento e personalizacao percebida.

- Exibir barra de progresso
- Perguntas simples, 1 por tela
- Microcopy de reforco: "Nao existe certo ou errado. Seja sincero(a)."

## Etapa 3 - Captura de lead (momento ideal)
Depois de 60-70% do quiz, pedir:
- Nome
- Email

Copy:
"Seu resultado personalizado esta quase pronto. Para receber seu diagnostico e link de desbloqueio, confirme seus dados."

## Etapa 4 - Upload de fotos
- Minimo 1 foto, maximo 3 fotos
- Orientacao rapida:
  - Rosto visivel
  - Boa iluminacao
  - Angulos diferentes (frente, meio perfil, corpo/estilo)

## Etapa 5 - Processamento + teaser
Tela de "analise em andamento" (5-10 segundos) com mensagens dinamicas:
- "Analisando padrao de presenca..."
- "Comparando seu estilo com seu objetivo..."
- "Montando seu perfil de atracao..."

Em seguida, exibir spoiler parcial (sem liberar tudo):
- Nota inicial
- 1 insight forte
- 1 ponto de melhora

## Etapa 6 - Oferta de desbloqueio
Mostrar 2 planos lado a lado:
- Basico
- Completo (destacado como recomendacao)

## Etapa 7 - Entrega por email
- Enviar resultado-resumo + CTA para desbloquear completo
- Sem login, sem conta
- Acesso vinculado ao email informado

---

## 5) Perguntas do Quiz (Estrutura Recomendada)

Meta: 10 a 14 perguntas totais.

## Bloco A - Identificacao
1. Qual seu genero?
2. Qual sua faixa etaria?
3. Hoje, seu foco e:
   - relacionamento serio
   - conhecer pessoas
   - melhorar autoconfianca
   - aumentar poder social

## Bloco B - Autoimagem e contexto
4. Como voce avalia seu estilo atual?
5. Como voce se sente com sua aparencia em fotos?
6. Com que frequencia cuida de cabelo/barba/pele?
7. Como costuma se vestir no dia a dia?
8. Sua postura/expressao transmite mais:
   - confianca
   - neutralidade
   - inseguranca

## Bloco C - Sinal social e atracao
9. Como as pessoas normalmente te percebem no primeiro contato?
10. Voce sente que chama atencao quando chega em um ambiente?
11. Qual seu maior bloqueio hoje para atracao?

## Bloco D - Intencao e urgencia
12. Que tipo de pessoa voce quer atrair?
13. Em quanto tempo quer perceber melhora?
14. Quanto esta disposto(a) a ajustar sua apresentacao nos proximos 7 dias?

### Regras de UX para alta conclusao
- 1 pergunta por tela
- Opcoes em formato botao (evitar campo aberto)
- Evitar linguagem tecnica
- Evitar julgamento explicito

---

## 6) Motor "Fake Inteligente" (MVP)

## Variaveis-base
- `estiloScore` (0-10)
- `simetriaScore` (0-10)
- `presencaScore` (0-10)
- `consistenciaCuidado` (baixo/medio/alto)
- `confiancaDeclarada` (baixa/media/alta)
- `objetivoPrincipal` (relacionamento/social/autoestima)

## Formula simples da nota
`notaFinal = (estiloScore * 0.35) + (simetriaScore * 0.25) + (presencaScore * 0.40)`

Arredondar para 1 casa decimal e limitar entre 4.8 e 8.9 no MVP inicial.

## Arquetipos de atracao (exemplo)
- Atracao Silenciosa (interessa, mas nao fixa)
- Potencial Negligenciado (boa base, baixa lapidacao)
- Presenca Neutra (nao afasta, mas nao marca)
- Intensidade Desalinhada (energia forte, comunicacao visual fraca)
- Imagem Inconsistente (cuidado irregular gera leitura confusa)

## Logica de atribuicao (simplificada)
- Presenca baixa + estilo medio -> Presenca Neutra
- Estilo baixo + simetria media/alta -> Potencial Negligenciado
- Confianca alta + leitura social baixa -> Intensidade Desalinhada
- Variacao grande entre respostas de cuidado e imagem -> Imagem Inconsistente
- Presenca media + feedback social morno -> Atracao Silenciosa

## Biblioteca de resposta dinamica
Montar blocos combinaveis:
- 20 frases de diagnostico emocional
- 20 frases de bloqueio principal
- 30 recomendacoes praticas (cabelo, barba, roupa, expressao, postura, foto)
- 10 mensagens de incentivo realista

Objetivo: reduzir respostas repetidas e aumentar sensacao de personalizacao.

## Simulacao de impacto
Regra:
- melhoriaPotencial = +0.8 ate +1.8 na nota
- percentualAtracao = +15% ate +45% (estimativa comportamental)

Exemplo:
"Com ajustes de estilo e presenca social, sua projeção pode subir de 6.1 para 7.4 nas proximas semanas."

---

## 7) Copy Persuasiva por Etapa

## Entrada
- "Voce nao precisa ficar mais bonito(a). Precisa ficar mais atraente."
- "Sua imagem atual pode estar sabotando sua vida amorosa sem voce perceber."

## Durante quiz
- "Estamos identificando seu padrao de atracao..."
- "Falta pouco para revelar seu diagnostico."

## Teaser parcial (spoiler)
Estrutura:
1) Nota parcial
2) Frase-impacto
3) Gancho de desbloqueio

Exemplo:
"Sua nota atual e 6.3/10.  
Voce nao esta sendo ignorado(a) por falta de beleza, e sim por baixa assinatura visual.  
Desbloqueie para ver exatamente o que ajustar ainda esta semana."

## Oferta
- Basico CTA: "Desbloquear minha nota completa"
- Completo CTA: "Quero meu plano de atracao completo"

## Urgencia etica
- "Relatorio gerado para seu perfil atual. Recomendado desbloquear enquanto os dados estao frescos."
- Evitar promessas absolutas ("garantia de conquistar qualquer pessoa")

---

## 8) Entregaveis do Cliente

## Relatorio Basico
1. Nota geral + resumo
2. Avaliacao por pilares (estilo/simetria/presenca)
3. Top 5 ajustes praticos imediatos

## Relatorio Completo
1. Tudo do basico
2. Perfil de atracao (arquetipo)
3. Bloqueios de atracao personalizados
4. Plano de atracao em 7 dias
5. Como voce e lido(a) no primeiro contato
6. Simulacao de impacto apos melhoria

---

## 9) Templates de Email (MVP)

## Email 1 - Entrega inicial (com teaser)
Assunto: `Seu Raio-X de Atracao esta pronto`

Corpo:
"[Nome], seu diagnostico inicial foi concluido.
Sua nota parcial: [X.X/10].
Seu principal ponto de atencao: [insight].

Para ver seu relatorio completo e seu plano de melhoria, desbloqueie aqui:
[link]"

## Email 2 - Recuperacao de nao compra (D+1)
Assunto: `Voce viu isso no seu resultado?`

Corpo:
"Seu perfil mostrou um padrao que poucas pessoas percebem sozinhas:
[gancho de bloqueio].

Seu plano completo continua disponivel:
[link]"

## Email 3 - Ultima chamada (D+2 ou D+3)
Assunto: `Ultima chance de desbloquear seu plano`

Corpo:
"Seu diagnostico foi gerado com base no seu momento atual.
Se quiser aplicar os ajustes com clareza, este e o melhor momento:
[link]"

---

## 10) Comparativo de Planos (Para Tela de Oferta)

Basico:
- Nota + analise dos 3 pilares
- Melhorias visuais praticas

Completo:
- Tudo do basico
- Perfil de atracao
- Bloqueios emocionais e sociais
- Plano de 7 dias
- Primeira impressao social
- Simulacao de evolucao

Recomendacao de interface:
- Destacar plano completo como "Mais escolhido"
- Mostrar ganho claro: "entender" (basico) vs "transformar" (completo)

---

## 11) Metricas Minimas para Validar MVP

## Conversao de funil
- Taxa de inicio do quiz
- Taxa de conclusao do quiz
- Taxa de captura de email
- Taxa de clique em desbloqueio
- Conversao por plano (basico vs completo)

## Indicadores de qualidade
- Tempo medio ate conclusao
- Taxa de abertura dos emails
- Taxa de resposta/engajamento com relatorio

## Metas iniciais sugeridas
- Conclusao do quiz: >= 45%
- Captura de email apos inicio: >= 35%
- Clique no desbloqueio: >= 12%
- Compra (quando checkout entrar): >= 2% no trafego frio

---

## 12) Ordem de Implementacao (Execucao Rapida)

1. Criar landing + quiz com 10-14 perguntas
2. Implementar logica de score e arquetipo com regras fixas
3. Gerar teaser parcial + tela de oferta de 2 planos
4. Implementar captura e disparo de email
5. Refinar copy com base em dados de conversao
6. Integrar checkout e pagamento
7. Iterar no motor de personalizacao

---

## 13) Regras de Ouro do Nivel7

- Clareza vence complexidade
- Personalizacao percebida vence perfeicao tecnica
- Diagnostico sem acao nao vende
- Linguagem forte, sem desrespeito
- Sempre mostrar "proximo passo" imediatamente

Esse guia e suficiente para lancar um MVP comercial forte, sem IA avancada, e evoluir para uma versao mais sofisticada depois da validacao de mercado.
