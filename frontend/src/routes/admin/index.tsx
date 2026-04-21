import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  getAdminEmailLogs,
  getIntegrationStatus,
  getAdminMetrics,
  getAdminOrders,
  getAdminPixelEvents,
  getAdminPlans,
  getAdminMe,
  getAdminSettings,
  approveOrderPayment,
  resendOrderResultEmail,
  saveAdminSettings,
  sendSmtpTestEmail,
  type SmtpTestEmailResponse,
  triggerReconciliation,
  updateAdminMe,
  updateAdminPlan,
  type AdminEmailLog,
  type AdminMetrics,
  type AdminOrder,
  type AdminPixelEvent,
  type AdminPlan,
  type AdminSettingsResponse,
} from "@/lib/admin-api";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboardPage,
});

type AdminSection =
  | "dashboard"
  | "plans"
  | "sales"
  | "emails"
  | "cajupay"
  | "smtp"
  | "pixel-meta"
  | "account";

function AdminDashboardPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [emailLogs, setEmailLogs] = useState<AdminEmailLog[]>([]);
  const [pixelEvents, setPixelEvents] = useState<AdminPixelEvent[]>([]);
  const [settings, setSettings] = useState<AdminSettingsResponse | null>(null);
  const [me, setMe] = useState<{ id: string; email: string } | null>(null);
  const [settingsForm, setSettingsForm] = useState({
    cajuBaseUrl: "",
    cajuApiKey: "",
    cajuApiSecret: "",
    smtpHost: "",
    smtpPort: "587",
    smtpUser: "",
    smtpPass: "",
    smtpFrom: "",
    pixelProvider: "",
    pixelToken: "",
    pixelEnabled: false,
    metaPixelId: "",
    metaAccessToken: "",
    metaTestEventCode: "",
  });
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");
  const [planDrafts, setPlanDrafts] = useState<
    Record<string, { name: string; price: string; isActive: boolean }>
  >({});
  const [integrations, setIntegrations] = useState<{
    smtpConfigured: boolean;
    cajuPayConfigured: boolean;
    pixelConfigured: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [smtpTestTo, setSmtpTestTo] = useState("");
  const [resendingOrderId, setResendingOrderId] = useState<string | null>(null);
  const [smtpTestBusy, setSmtpTestBusy] = useState(false);
  const [accountForm, setAccountForm] = useState({
    currentPassword: "",
    newEmail: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [accountBusy, setAccountBusy] = useState(false);
  const [smtpTestFeedback, setSmtpTestFeedback] = useState<
    | null
    | ({ kind: "success"; to: string } & SmtpTestEmailResponse)
    | { kind: "error"; message: string }
  >(null);

  useEffect(() => {
    async function load() {
      if (!localStorage.getItem("admin_token")) {
        await navigate({ to: "/admin/login" });
        return;
      }
      try {
        const [
          plansData,
          ordersData,
          integrationData,
          metricsData,
          emailData,
          pixelData,
          settingsData,
          meData,
        ] = await Promise.all([
          getAdminPlans(),
          getAdminOrders(),
          getIntegrationStatus(),
          getAdminMetrics(),
          getAdminEmailLogs(),
          getAdminPixelEvents(),
          getAdminSettings(),
          getAdminMe(),
        ]);
        setPlans(plansData);
        setPlanDrafts(
          Object.fromEntries(
            plansData.map((plan) => [
              plan.id,
              {
                name: plan.name,
                price: (plan.priceCents / 100).toFixed(2),
                isActive: plan.isActive,
              },
            ]),
          ),
        );
        setOrders(ordersData);
        setIntegrations(integrationData);
        setMetrics(metricsData);
        setEmailLogs(emailData);
        setPixelEvents(pixelData);
        setSettings(settingsData);
        setMe(meData);
        setSettingsForm({
          cajuBaseUrl: settingsData.cajuPay.baseUrl || "",
          cajuApiKey: "",
          cajuApiSecret: "",
          smtpHost: settingsData.smtp.host || "",
          smtpPort: String(settingsData.smtp.port || 587),
          smtpUser: settingsData.smtp.user || "",
          smtpPass: "",
          smtpFrom: settingsData.smtp.user || settingsData.smtp.from || "",
          pixelProvider: settingsData.pixel.provider || "",
          pixelToken: "",
          pixelEnabled: settingsData.pixel.enabled || false,
          metaPixelId: settingsData.pixel.metaPixelId || "",
          metaAccessToken: "",
          metaTestEventCode: settingsData.pixel.metaTestEventCode || "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar dados");
      }
    }
    void load();
  }, [navigate]);

  async function saveAccount() {
    const currentPassword = accountForm.currentPassword;
    const newEmail = accountForm.newEmail.trim();
    const newPassword = accountForm.newPassword;
    const confirm = accountForm.confirmNewPassword;

    if (!currentPassword || currentPassword.length < 8) {
      alert("Informe sua senha atual (min. 8).");
      return;
    }
    if (!newEmail && !newPassword) {
      alert("Informe um novo e-mail e/ou uma nova senha.");
      return;
    }
    if (newPassword && newPassword.length < 8) {
      alert("Nova senha deve ter no minimo 8 caracteres.");
      return;
    }
    if (newPassword && newPassword !== confirm) {
      alert("Confirmacao de senha nao confere.");
      return;
    }

    try {
      setAccountBusy(true);
      const res = await updateAdminMe({
        currentPassword,
        newEmail: newEmail || undefined,
        newPassword: newPassword || undefined,
      });
      setMe((prev) => (prev ? { ...prev, email: res.email } : { id: "", email: res.email }));
      setAccountForm({
        currentPassword: "",
        newEmail: "",
        newPassword: "",
        confirmNewPassword: "",
      });
      alert("Dados atualizados. Por seguranca, faca login novamente.");
      localStorage.removeItem("admin_token");
      await navigate({ to: "/admin/login" });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Falha ao salvar conta");
    } finally {
      setAccountBusy(false);
    }
  }

  async function reconcile() {
    try {
      await triggerReconciliation();
      alert("Reconciliacao enfileirada.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao reconciliar");
    }
  }

  async function sendSmtpTest() {
    const to = smtpTestTo.trim();
    if (!to) {
      setSmtpTestFeedback({ kind: "error", message: "Indique o e-mail de destino do teste." });
      return;
    }
    setSmtpTestBusy(true);
    setSmtpTestFeedback(null);
    try {
      const portNum = settingsForm.smtpPort.trim()
        ? Number(settingsForm.smtpPort.replace(",", "."))
        : undefined;
      const userEmail = settingsForm.smtpUser.trim();
      const result = await sendSmtpTestEmail({
        to,
        host: settingsForm.smtpHost.trim() || undefined,
        port: portNum !== undefined && Number.isFinite(portNum) ? portNum : undefined,
        user: userEmail || undefined,
        pass: settingsForm.smtpPass.trim() || undefined,
        from: userEmail || undefined,
      });
      setSmtpTestFeedback({ kind: "success", to, ...result });
    } catch (err) {
      setSmtpTestFeedback({
        kind: "error",
        message: err instanceof Error ? err.message : "Falha ao enviar e-mail de teste",
      });
    } finally {
      setSmtpTestBusy(false);
    }
  }

  async function saveIntegrations() {
    try {
      await saveAdminSettings({
        cajuPay: {
          baseUrl: settingsForm.cajuBaseUrl || undefined,
          apiKey: settingsForm.cajuApiKey || undefined,
          apiSecret: settingsForm.cajuApiSecret || undefined,
        },
        smtp: {
          host: settingsForm.smtpHost || undefined,
          port: Number(settingsForm.smtpPort || "587"),
          user: settingsForm.smtpUser || undefined,
          pass: settingsForm.smtpPass || undefined,
          from: settingsForm.smtpUser || undefined,
        },
        pixel: {
          provider: settingsForm.pixelProvider || undefined,
          token: settingsForm.pixelToken || undefined,
          enabled: settingsForm.pixelEnabled,
          metaPixelId: settingsForm.metaPixelId || undefined,
          metaAccessToken: settingsForm.metaAccessToken || undefined,
          metaTestEventCode: settingsForm.metaTestEventCode || undefined,
        },
      });
      alert("Configuracoes salvas com sucesso.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Falha ao salvar configuracoes");
    }
  }

  async function savePlan(planId: string) {
    const draft = planDrafts[planId];
    if (!draft) return;
    try {
      const updated = await updateAdminPlan(planId, {
        name: draft.name,
        priceCents: Math.round(Number(draft.price.replace(",", ".")) * 100),
        isActive: draft.isActive,
      });
      setPlans((prev) => prev.map((p) => (p.id === planId ? updated : p)));
      alert("Plano atualizado com sucesso.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Falha ao atualizar plano");
    }
  }

  async function approvePayment(orderId: string) {
    try {
      const result = await approveOrderPayment(orderId);
      if (!result.ok) {
        alert("Nao foi possivel aprovar este pagamento.");
        return;
      }
      const refreshedOrders = await getAdminOrders();
      const refreshedMetrics = await getAdminMetrics();
      setOrders(refreshedOrders);
      setMetrics(refreshedMetrics);
      alert(result.updated ? "Pagamento aprovado e resultado liberado." : "Pedido ja estava pago.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Falha ao aprovar pagamento");
    }
  }

  async function resendResultEmail(orderId: string) {
    setResendingOrderId(orderId);
    try {
      await resendOrderResultEmail(orderId);
      const refreshedLogs = await getAdminEmailLogs();
      setEmailLogs(refreshedLogs);
      alert(
        "E-mail de resultado enfileirado. Confirme o worker em execucao e a caixa de entrada (e spam).",
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Falha ao reenviar e-mail de resultado");
    } finally {
      setResendingOrderId(null);
    }
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[260px_1fr]">
      <aside className="border-r border-border p-4 md:p-6">
        <div className="mb-6">
          <div className="font-display text-3xl">
            Painel <span className="text-gradient-blood">Admin</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">Centro de controle do Nivel7</div>
        </div>

        <nav className="space-y-2">
          <SidebarBtn
            active={activeSection === "dashboard"}
            onClick={() => setActiveSection("dashboard")}
            label="Dashboard"
          />
          <SidebarBtn
            active={activeSection === "plans"}
            onClick={() => setActiveSection("plans")}
            label="Planos"
          />
          <SidebarBtn
            active={activeSection === "sales"}
            onClick={() => setActiveSection("sales")}
            label="Vendas"
          />
          <SidebarBtn
            active={activeSection === "emails"}
            onClick={() => setActiveSection("emails")}
            label="E-mails"
          />
          <div className="pt-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Integracoes
          </div>
          <SidebarBtn
            active={activeSection === "cajupay"}
            onClick={() => setActiveSection("cajupay")}
            label="CajuPay"
          />
          <SidebarBtn
            active={activeSection === "smtp"}
            onClick={() => setActiveSection("smtp")}
            label="SMTP"
          />
          <SidebarBtn
            active={activeSection === "pixel-meta"}
            onClick={() => setActiveSection("pixel-meta")}
            label="Pixel Meta"
          />
          <div className="pt-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">Conta</div>
          <SidebarBtn
            active={activeSection === "account"}
            onClick={() => setActiveSection("account")}
            label="E-mail e senha"
          />
        </nav>

        <div className="mt-8 space-y-2">
          <button
            onClick={reconcile}
            className="w-full px-3 py-2 rounded-lg border border-border hover:border-blood-subtle text-sm"
          >
            Reconciliar pagamentos
          </button>
          <Link
            to="/admin/login"
            className="block text-center w-full px-3 py-2 rounded-lg border border-border text-sm"
          >
            Trocar login
          </Link>
        </div>
      </aside>

      <main className="p-6 md:p-8">
        <h1 className="font-display text-4xl mb-6">Administracao</h1>

        {error && <div className="text-red-400 mb-6">{error}</div>}
        {activeSection === "dashboard" && (
          <>
            {metrics && (
              <section className="mb-8 grid md:grid-cols-4 gap-4">
                <KpiCard label="Pedidos" value={String(metrics.totalOrders)} />
                <KpiCard label="Pagos" value={String(metrics.paidOrders)} />
                <KpiCard label="Conversao" value={`${metrics.conversionRate}%`} />
                <KpiCard
                  label="Receita"
                  value={`R$ ${(metrics.paidRevenueCents / 100).toFixed(2)}`}
                />
              </section>
            )}
            <section className="grid md:grid-cols-3 gap-4">
              <StatusCard title="CajuPay" ok={integrations?.cajuPayConfigured ?? false} />
              <StatusCard title="SMTP" ok={integrations?.smtpConfigured ?? false} />
              <StatusCard title="Pixel" ok={integrations?.pixelConfigured ?? false} />
            </section>
          </>
        )}

        {activeSection === "account" && (
          <section className="max-w-xl">
            <h2 className="text-xl mb-3">Conta</h2>
            <div className="border border-border rounded-xl p-4 space-y-4">
              <div className="text-sm text-muted-foreground">
                Logado como: <span className="text-foreground font-medium">{me?.email ?? "-"}</span>
              </div>

              <div className="space-y-2">
                <label className="text-sm">Senha atual</label>
                <input
                  type="password"
                  value={accountForm.currentPassword}
                  onChange={(e) =>
                    setAccountForm((s) => ({ ...s, currentPassword: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded border border-border bg-background"
                  placeholder="Sua senha atual"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm">Novo e-mail (opcional)</label>
                <input
                  value={accountForm.newEmail}
                  onChange={(e) => setAccountForm((s) => ({ ...s, newEmail: e.target.value }))}
                  className="w-full px-3 py-2 rounded border border-border bg-background"
                  placeholder="novo@email.com"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm">Nova senha (opcional)</label>
                  <input
                    type="password"
                    value={accountForm.newPassword}
                    onChange={(e) => setAccountForm((s) => ({ ...s, newPassword: e.target.value }))}
                    className="w-full px-3 py-2 rounded border border-border bg-background"
                    placeholder="Min. 8 caracteres"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm">Confirmar nova senha</label>
                  <input
                    type="password"
                    value={accountForm.confirmNewPassword}
                    onChange={(e) =>
                      setAccountForm((s) => ({ ...s, confirmNewPassword: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded border border-border bg-background"
                    placeholder="Repita a senha"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  disabled={accountBusy}
                  onClick={() => void saveAccount()}
                  className="px-4 py-2 rounded-lg bg-gradient-blood text-primary-foreground disabled:opacity-50"
                >
                  {accountBusy ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </section>
        )}

        {activeSection === "plans" && (
          <section>
            <h2 className="text-xl mb-3">Planos</h2>
            <div className="border border-border rounded-xl overflow-hidden">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="px-4 py-3 border-b border-border/60 grid md:grid-cols-[1fr_180px_120px_120px] gap-3 items-center"
                >
                  <div className="space-y-1">
                    <input
                      value={planDrafts[plan.id]?.name ?? plan.name}
                      onChange={(e) =>
                        setPlanDrafts((prev) => ({
                          ...prev,
                          [plan.id]: {
                            ...(prev[plan.id] ?? {
                              name: plan.name,
                              price: (plan.priceCents / 100).toFixed(2),
                              isActive: plan.isActive,
                            }),
                            name: e.target.value,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 rounded border border-border bg-background"
                    />
                    <div className="text-xs text-muted-foreground">{plan.code}</div>
                  </div>
                  <input
                    value={planDrafts[plan.id]?.price ?? (plan.priceCents / 100).toFixed(2)}
                    onChange={(e) =>
                      setPlanDrafts((prev) => ({
                        ...prev,
                        [plan.id]: {
                          ...(prev[plan.id] ?? {
                            name: plan.name,
                            price: (plan.priceCents / 100).toFixed(2),
                            isActive: plan.isActive,
                          }),
                          price: e.target.value,
                        },
                      }))
                    }
                    className="px-3 py-2 rounded border border-border bg-background"
                    placeholder="Preco (ex: 59.90)"
                  />
                  <label className="text-sm flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={planDrafts[plan.id]?.isActive ?? plan.isActive}
                      onChange={(e) =>
                        setPlanDrafts((prev) => ({
                          ...prev,
                          [plan.id]: {
                            ...(prev[plan.id] ?? {
                              name: plan.name,
                              price: (plan.priceCents / 100).toFixed(2),
                              isActive: plan.isActive,
                            }),
                            isActive: e.target.checked,
                          },
                        }))
                      }
                    />
                    Ativo
                  </label>
                  <div>
                    <button
                      onClick={() => savePlan(plan.id)}
                      className="px-3 py-2 rounded-lg bg-gradient-blood text-primary-foreground w-full"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeSection === "sales" && (
          <section>
            <h2 className="text-xl mb-3">Vendas</h2>
            <div className="border border-border rounded-xl overflow-hidden">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="px-4 py-3 border-b border-border/60 flex justify-between gap-4"
                >
                  <div>
                    <div>
                      {order.quizSession.lead.name} - {order.plan.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {order.quizSession.lead.email}
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-2">
                    <div>{order.status}</div>
                    <div className="text-xs text-muted-foreground">
                      R$ {(order.amountCents / 100).toFixed(2)}
                    </div>
                    {order.status !== "paid" && (
                      <button
                        type="button"
                        onClick={() => approvePayment(order.id)}
                        className="block w-full px-3 py-1.5 rounded-lg bg-gradient-blood text-primary-foreground text-xs"
                      >
                        Aprovar pagamento (teste)
                      </button>
                    )}
                    {order.status === "paid" && (
                      <button
                        type="button"
                        disabled={resendingOrderId === order.id}
                        onClick={() => void resendResultEmail(order.id)}
                        className="block w-full px-3 py-1.5 rounded-lg border border-border hover:border-blood-subtle text-xs disabled:opacity-50"
                      >
                        {resendingOrderId === order.id
                          ? "A enfileirar…"
                          : "Reenviar e-mail do resultado"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeSection === "emails" && (
          <section>
            <h2 className="text-xl mb-3">Logs de E-mail</h2>
            <div className="border border-border rounded-xl overflow-hidden">
              {emailLogs.map((log) => (
                <div
                  key={log.id}
                  className="px-4 py-3 border-b border-border/60 flex justify-between"
                >
                  <div>
                    <div>{log.recipient}</div>
                    <div className="text-xs text-muted-foreground">{log.template}</div>
                  </div>
                  <div className="text-right text-xs">{log.status}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeSection === "cajupay" && (
          <section className="space-y-4">
            <h2 className="text-xl">Configuracao CajuPay</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <input
                placeholder="Base URL"
                value={settingsForm.cajuBaseUrl}
                onChange={(e) => setSettingsForm((s) => ({ ...s, cajuBaseUrl: e.target.value }))}
                className="px-3 py-2 rounded border border-border bg-background"
              />
              <input
                placeholder={`API Key (${settings?.cajuPay.apiKeyMasked || "nao configurado"})`}
                value={settingsForm.cajuApiKey}
                onChange={(e) => setSettingsForm((s) => ({ ...s, cajuApiKey: e.target.value }))}
                className="px-3 py-2 rounded border border-border bg-background"
              />
              <input
                placeholder={`API Secret (${settings?.cajuPay.apiSecretMasked || "nao configurado"})`}
                value={settingsForm.cajuApiSecret}
                onChange={(e) => setSettingsForm((s) => ({ ...s, cajuApiSecret: e.target.value }))}
                className="px-3 py-2 rounded border border-border bg-background"
              />
            </div>
            <button
              onClick={saveIntegrations}
              className="px-4 py-2 rounded-lg bg-gradient-blood text-primary-foreground"
            >
              Salvar CajuPay
            </button>
          </section>
        )}

        {activeSection === "smtp" && (
          <section className="space-y-4">
            <h2 className="text-xl">Configuracao SMTP</h2>
            <div className="grid md:grid-cols-4 gap-4">
              <input
                placeholder="Host"
                value={settingsForm.smtpHost}
                onChange={(e) => setSettingsForm((s) => ({ ...s, smtpHost: e.target.value }))}
                className="px-3 py-2 rounded border border-border bg-background"
              />
              <input
                placeholder="Porta"
                value={settingsForm.smtpPort}
                onChange={(e) => setSettingsForm((s) => ({ ...s, smtpPort: e.target.value }))}
                className="px-3 py-2 rounded border border-border bg-background"
              />
              <input
                type="email"
                placeholder="E-mail (login SMTP e remetente)"
                value={settingsForm.smtpUser}
                onChange={(e) => {
                  const v = e.target.value;
                  setSettingsForm((s) => ({ ...s, smtpUser: v, smtpFrom: v }));
                }}
                className="px-3 py-2 rounded border border-border bg-background"
              />
              <input
                placeholder={`Senha (${settings?.smtp.passMasked || "nao configurado"})`}
                value={settingsForm.smtpPass}
                onChange={(e) => setSettingsForm((s) => ({ ...s, smtpPass: e.target.value }))}
                className="px-3 py-2 rounded border border-border bg-background"
              />
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl">
              O endereco utilizado no login SMTP e sempre o remetente (From) das mensagens enviadas.
              O teste usa os valores acima; campos vazios completam com o que ja esta salvo no
              painel ou no .env do servidor.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1 max-w-md">
                <label className="block text-xs text-muted-foreground mb-1">
                  Destino do e-mail de teste
                </label>
                <input
                  type="email"
                  placeholder="voce@exemplo.com"
                  value={smtpTestTo}
                  onChange={(e) => setSmtpTestTo(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-border bg-background"
                />
              </div>
              <button
                type="button"
                disabled={smtpTestBusy}
                onClick={() => void sendSmtpTest()}
                className="px-4 py-2 rounded-lg border border-border hover:border-blood-subtle text-sm disabled:opacity-50"
              >
                {smtpTestBusy ? "A enviar…" : "Enviar e-mail de teste"}
              </button>
              <button
                onClick={saveIntegrations}
                className="px-4 py-2 rounded-lg bg-gradient-blood text-primary-foreground"
              >
                Salvar SMTP
              </button>
            </div>

            {smtpTestFeedback?.kind === "error" && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {smtpTestFeedback.message}
              </div>
            )}

            {smtpTestFeedback?.kind === "success" && (
              <div className="rounded-xl border border-border bg-surface/50 px-4 py-3 text-sm text-left space-y-3 max-w-3xl">
                <div className="font-medium text-foreground">
                  O servidor SMTP aceitou a mensagem
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Isto significa que a ligacao e as credenciais estao corretas. O correio pode
                  demorar alguns minutos; verifique a pasta{" "}
                  <strong className="text-foreground">Spam</strong>,{" "}
                  <strong className="text-foreground">Promocoes</strong> (Gmail) e confirme que
                  digitou o destino certo:{" "}
                  <span className="text-foreground">{smtpTestFeedback.to}</span>.
                </p>
                <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                  {smtpTestFeedback.configuredFrom !== smtpTestFeedback.effectiveFrom && (
                    <li>
                      Remetente no formulario:{" "}
                      <span className="text-foreground">{smtpTestFeedback.configuredFrom}</span>
                    </li>
                  )}
                  <li>
                    Remetente real enviado (From):{" "}
                    <span className="text-foreground break-all">
                      {smtpTestFeedback.effectiveFrom}
                    </span>
                  </li>
                  {smtpTestFeedback.accepted?.length > 0 && (
                    <li>Aceite pelo SMTP para: {smtpTestFeedback.accepted.join(", ")}</li>
                  )}
                  {smtpTestFeedback.rejected?.length > 0 && (
                    <li className="text-amber-300">
                      Rejeitado para: {smtpTestFeedback.rejected.join(", ")}
                    </li>
                  )}
                  {smtpTestFeedback.messageId && (
                    <li className="break-all">Message-ID: {smtpTestFeedback.messageId}</li>
                  )}
                  {smtpTestFeedback.smtpResponse && (
                    <li className="break-all text-muted-foreground/80">
                      Resposta: {smtpTestFeedback.smtpResponse}
                    </li>
                  )}
                </ul>
              </div>
            )}
          </section>
        )}

        {activeSection === "pixel-meta" && (
          <section className="space-y-6">
            <h2 className="text-xl">Pixel da Meta</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <input
                placeholder="Provider (ex: meta)"
                value={settingsForm.pixelProvider}
                onChange={(e) => setSettingsForm((s) => ({ ...s, pixelProvider: e.target.value }))}
                className="px-3 py-2 rounded border border-border bg-background"
              />
              <input
                placeholder={`Token interno (${settings?.pixel.tokenMasked || "nao configurado"})`}
                value={settingsForm.pixelToken}
                onChange={(e) => setSettingsForm((s) => ({ ...s, pixelToken: e.target.value }))}
                className="px-3 py-2 rounded border border-border bg-background"
              />
              <input
                placeholder="Meta Pixel ID"
                value={settingsForm.metaPixelId}
                onChange={(e) => setSettingsForm((s) => ({ ...s, metaPixelId: e.target.value }))}
                className="px-3 py-2 rounded border border-border bg-background"
              />
              <input
                placeholder={`Meta Access Token (${settings?.pixel.metaAccessTokenMasked || "nao configurado"})`}
                value={settingsForm.metaAccessToken}
                onChange={(e) =>
                  setSettingsForm((s) => ({ ...s, metaAccessToken: e.target.value }))
                }
                className="px-3 py-2 rounded border border-border bg-background"
              />
              <input
                placeholder="Meta Test Event Code"
                value={settingsForm.metaTestEventCode}
                onChange={(e) =>
                  setSettingsForm((s) => ({ ...s, metaTestEventCode: e.target.value }))
                }
                className="px-3 py-2 rounded border border-border bg-background md:col-span-2"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settingsForm.pixelEnabled}
                onChange={(e) => setSettingsForm((s) => ({ ...s, pixelEnabled: e.target.checked }))}
              />
              Pixel ativo
            </label>

            <button
              onClick={saveIntegrations}
              className="px-4 py-2 rounded-lg bg-gradient-blood text-primary-foreground"
            >
              Salvar Pixel Meta
            </button>

            <div>
              <h3 className="text-lg mb-3">Eventos recentes</h3>
              <div className="border border-border rounded-xl overflow-hidden">
                {pixelEvents.map((event) => (
                  <div
                    key={event.id}
                    className="px-4 py-3 border-b border-border/60 flex justify-between"
                  >
                    <div>{event.eventName}</div>
                    <div className="text-right text-xs">{event.status}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function StatusCard({ title, ok }: { title: string; ok: boolean }) {
  return (
    <div className="border border-border rounded-xl p-4">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className={ok ? "text-green-400 font-medium" : "text-yellow-400 font-medium"}>
        {ok ? "Configurado" : "Pendente"}
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border rounded-xl p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function SidebarBtn({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg border transition ${
        active ? "border-blood-subtle bg-surface/70" : "border-border hover:border-blood-subtle"
      }`}
    >
      {label}
    </button>
  );
}
