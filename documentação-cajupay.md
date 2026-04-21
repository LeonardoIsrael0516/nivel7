Integração com a API
Guia para sistemas externos: autenticação, PIX, consultas e boas práticas de segurança.

Introdução
A API do cajuPay permite criar cobranças PIX, acompanhar pagamentos, gerenciar chaves para saque e consultar saldo. O fluxo típico é: criar cobrança → cliente paga no app do banco → você consulta o status via API.

Escopo desta página

Esta documentação cobre apenas rotas de negócio para integradores. Não inclui a API administrativa interna.
Base URL
Todas as rotas abaixo usam a URL base oficial de produção da API.


BASE_URL=https://api.cajupay.com.br
Substitua nos exemplos: endpoints ficam em https://api.cajupay.com.br/api/....

Autenticação
Forma recomendada: public key + secret

Integrações (incluindo plataformas open source em servidor próprio) devem usar o par X-API-Key (public key) e X-API-Secret (secret) em todas as chamadas às rotas de negócio. Guarde o secret só no servidor (variável de ambiente ou cofre). Não há fluxo de "conectar conta" via tela de consentimento OAuth na documentação pública — esse caminho não é necessário para a API de PIX, carteira e saques.
O titular da conta gera as chaves após login no painel cajuPay (menu API / Chaves) ou, programaticamente, com sessão válida:


curl -X POST "https://api.cajupay.com.br/api/api-keys" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token_sessao_painel>" \
  -d '{"name":"Minha integração","scopes":["payments.write","wallet.read"]}'
A resposta inclui public_key e secret_key (o secret só aparece uma vez). Escopos comuns: payments.write, wallet.read, payouts.write.

Nas requisições de negócio, envie sempre os dois cabeçalhos (como nos exemplos de PIX e carteira abaixo). O backend também aceita Authorization: Bearer em outros contextos (ex.: sessão do painel), mas para integração servidor a servidor use API Keys.

Segurança
Secret só no servidor

Nunca envie X-API-Secret em apps móveis ou front-end público. Guarde o segredo em variável de ambiente ou cofre, e chame a API apenas do seu backend.
Use sempre HTTPS em produção.
Rotacione chaves periodicamente (revogar/criar novas no painel).
Não registre em log o corpo completo de requisições que contenham o secret.
Idempotência
Operações de criação críticas exigem o cabeçalho Idempotency-Key (string não vazia, máximo 200 caracteres). Reenviar a mesma chave com o mesmo payload evita cobranças duplicadas; reutilizar a chave com corpo diferente retorna conflito.

POST /api/payments/pix — obrigatório.
POST /api/payouts — obrigatório (veja docs/API.md).
PIX — criar cobrança
POST /api/payments/pix — escopo payments.write. Corpo JSON (campos alinhados ao backend):

amount_cents (inteiro > 0), currency (ex.: BRL)
customer_ref, description, product_ref — identificadores do seu sistema
consumer (opcional no JSON, mas frequentemente exigido pelo provedor): name, document, email

curl -X POST "https://api.cajupay.com.br/api/payments/pix" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SUA_PUBLIC_KEY" \
  -H "X-API-Secret: SUA_SECRET_KEY" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "amount_cents": 14990,
    "currency": "BRL",
    "description": "Pedido #123",
    "product_ref": "sku-001",
    "customer_ref": "cliente-externo-456",
    "consumer": {
      "name": "Cliente Exemplo",
      "email": "cliente@exemplo.com",
      "document": "12345678901"
    }
  }'
Resposta (exemplo de campos)


{
  "payment_id": "uuid",
  "provider": "cajupay",
  "psp_reference": "...",
  "pix_copy_paste": "00020126...",
  "pix_qr_code": "...",
  "pix_key": "...",
  "pix_key_type": "evp",
  "status": "pending"
}
Consultar pagamentos
GET /api/payments — lista cobranças PIX da conta autenticada. Escopo atual no backend: payments.write (igual à criação).

Query: único parâmetro suportado é limit (opcional; padrão 100 se inválido ou omitido).

Atualize o status do pagamento consultando esta rota periodicamente (ou o painel); o campo status reflete o processamento no gateway.


curl -X GET "https://api.cajupay.com.br/api/payments?limit=50" \
  -H "X-API-Key: SUA_PUBLIC_KEY" \
  -H "X-API-Secret: SUA_SECRET_KEY"
Resposta: array JSON


[
  {
    "payment_id": "uuid",
    "amount_cents": 14990,
    "currency": "BRL",
    "status": "pending",
    "provider": "cajupay",
    "psp_reference": "...",
    "customer_ref": "cliente-externo-456",
    "created_at": "2025-01-01T12:00:00Z"
  }
]
Saques
POST /api/payouts — escopo payouts.write, com Idempotency-Key. A conta precisa estar com KYC aprovado; caso contrário o backend responde 403 com corpo payouts_blocked_pending_kyc.

Exemplo de corpo usando chave PIX já cadastrada:


curl -X POST "https://api.cajupay.com.br/api/payouts" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SUA_PUBLIC_KEY" \
  -H "X-API-Secret: SUA_SECRET_KEY" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "amount_cents": 5000,
    "currency": "BRL",
    "wallet_kind": "main",
    "destination": { "method": "pix_saved_key" },
    "pix_key_id": "<uuid-da-chave-cadastrada>"
  }'
Listagem: GET /api/payouts?limit=50 — detalhes em docs/API.md.

Chaves PIX (saques)
Cadastro de chaves para destino de saques (escopo payouts.write):

GET /api/pix-keys — listar
POST /api/pix-keys — criar: label, pix_key_type (cpf|cnpj|email|phone|evp), pix_key, is_default
PATCH /api/pix-keys — corpo { "id": "<uuid>" } para definir padrão
DELETE /api/pix-keys?id=<uuid> — remover
Carteira
Escopo wallet.read na chave de API. Os exemplos abaixo usam X-API-Key / X-API-Secret. Authorization: Bearer (sessão do painel) também é aceito pelo backend.

Saldo


curl -X GET "https://api.cajupay.com.br/api/wallet/balance?kind=main" \
  -H "X-API-Key: SUA_PUBLIC_KEY" \
  -H "X-API-Secret: SUA_SECRET_KEY"
Extrato / lançamentos


curl -X GET "https://api.cajupay.com.br/api/wallet/entries?kind=main&limit=50" \
  -H "X-API-Key: SUA_PUBLIC_KEY" \
  -H "X-API-Secret: SUA_SECRET_KEY"
Erros HTTP
Corpos de erro costumam ser texto simples (não JSON padronizado em todos os casos). Referência rápida:

Código	Significado
401	Não autenticado — token/chaves inválidos ou ausentes.
403	Sem permissão (escopo) ou recurso bloqueado (ex.: KYC pendente em saques).
409	Conflito de idempotência (ex.: idempotency_in_progress).
429	Rate limit (quando habilitado no gateway).
400	Validação — exemplos: invalid_json, missing Idempotency-Key, invalid_amount_cents.
Próximos passos
Gerar chaves de API

Para obter X-API-Key e X-API-Secret, entre no painel e abra API / Chaves (é necessário estar