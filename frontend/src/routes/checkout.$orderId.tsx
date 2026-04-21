import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { getOrderPaymentStatus } from "@/lib/public-api";
import { useQuiz } from "@/contexts/QuizContext";
import { cn } from "@/lib/utils";
import { getMetaPixelSettings } from "@/lib/public-api";
import type { MetaPixelSettings } from "@/lib/meta-pixel";
import { metaPixelTrack } from "@/lib/meta-pixel";

export const Route = createFileRoute("/checkout/$orderId")({
  component: CheckoutPage,
});

const PIX_COUNTDOWN_MS = 15 * 60 * 1000;

function CheckoutPage() {
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const { setUnlockedOrderId, setCheckoutOrderId, setLastPath } = useQuiz();
  const [status, setStatus] = useState<"pending" | "paid" | "failed">("pending");
  const [pixCopyPaste, setPixCopyPaste] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pixReady, setPixReady] = useState(false);
  const [amountCents, setAmountCents] = useState<number>(0);
  const [planName, setPlanName] = useState<string>("Produto");
  const [customer, setCustomer] = useState<{ name: string; email: string }>({
    name: "-",
    email: "-",
  });
  /** Inicia quando o codigo PIX fica disponivel (15 min a partir dai). */
  const [countdownEndsAt, setCountdownEndsAt] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const [justCopied, setJustCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pixelSettings, setPixelSettings] = useState<MetaPixelSettings | null>(null);
  const initiatedCheckoutRef = useRef(false);
  const purchasedRef = useRef(false);

  useEffect(() => {
    setCheckoutOrderId(orderId);
    setLastPath(`/checkout/${orderId}`);
  }, [orderId, setCheckoutOrderId, setLastPath]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const s = await getMetaPixelSettings();
        if (!cancelled) setPixelSettings(s);
      } catch {
        // pixel opcional
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (pixReady && countdownEndsAt === null) {
      setCountdownEndsAt(Date.now() + PIX_COUNTDOWN_MS);
    }
  }, [pixReady, countdownEndsAt]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: number | null = null;

    async function poll() {
      try {
        const data = await getOrderPaymentStatus(orderId);
        if (cancelled) return;
        setStatus((data.status as "pending" | "paid" | "failed") ?? "pending");
        setPixCopyPaste(data.pix?.pixCopyPaste ?? null);
        setQrCode(data.pix?.qrCode ?? null);
        setPixReady(Boolean(data.pixReady || data.pix?.pixCopyPaste || data.pix?.qrCode));
        setAmountCents(data.amountCents);
        setPlanName(data.planName);
        setCustomer(data.customer);
        setError(data.pixError ?? null);

        if (!initiatedCheckoutRef.current && pixelSettings?.enabled && data.amountCents > 0) {
          initiatedCheckoutRef.current = true;
          metaPixelTrack(
            "InitiateCheckout",
            {
              value: Math.round((data.amountCents / 100) * 100) / 100,
              currency: "BRL",
              content_name: data.planName,
              order_id: data.orderId,
            },
            pixelSettings,
          );
        }

        if (data.status === "paid" && data.canAccessResults) {
          if (!purchasedRef.current && pixelSettings?.enabled && data.amountCents > 0) {
            purchasedRef.current = true;
            metaPixelTrack(
              "Purchase",
              {
                value: Math.round((data.amountCents / 100) * 100) / 100,
                currency: "BRL",
                content_name: data.planName,
                order_id: data.orderId,
              },
              pixelSettings,
            );
          }
          setUnlockedOrderId(data.orderId);
          setLastPath("/result");
          await navigate({ to: "/result" });
          return;
        }
        pollTimer = window.setTimeout(poll, 4000);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Falha ao consultar pagamento");
      }
    }

    void poll();
    return () => {
      cancelled = true;
      if (pollTimer) window.clearTimeout(pollTimer);
    };
  }, [orderId, navigate, setLastPath, setUnlockedOrderId]);

  const copyPix = async () => {
    if (!pixCopyPaste) return;
    try {
      await navigator.clipboard.writeText(pixCopyPaste);
      setJustCopied(true);
      window.setTimeout(() => setJustCopied(false), 2200);
    } catch {
      setError("Nao foi possivel copiar. Selecione o codigo manualmente ou tente outro navegador.");
    }
  };

  const refreshNow = async () => {
    try {
      const data = await getOrderPaymentStatus(orderId);
      setStatus((data.status as "pending" | "paid" | "failed") ?? "pending");
      setPixCopyPaste(data.pix?.pixCopyPaste ?? null);
      setQrCode(data.pix?.qrCode ?? null);
      setPixReady(Boolean(data.pixReady || data.pix?.pixCopyPaste || data.pix?.qrCode));
      setAmountCents(data.amountCents);
      setPlanName(data.planName);
      setCustomer(data.customer);
      setError(data.pixError ?? null);
      if (data.status === "paid" && data.canAccessResults) {
        setUnlockedOrderId(data.orderId);
        setLastPath("/result");
        await navigate({ to: "/result" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao consultar pagamento");
    }
  };

  const normalizeQrSrc = (qr: string | null) => {
    if (!qr) return null;
    const t = qr.trim();
    if (t.startsWith("data:image/") || /^https?:\/\//i.test(t)) return t;
    const clean = t.replace(/\s/g, "");
    if (clean.startsWith("iVBOR")) return `data:image/png;base64,${clean}`;
    if (clean.startsWith("/9j/")) return `data:image/jpeg;base64,${clean}`;
    return t;
  };
  const qrImageSrc = qrCode
    ? normalizeQrSrc(qrCode)
    : pixCopyPaste
      ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(pixCopyPaste)}`
      : null;

  const remainingMs = countdownEndsAt != null ? Math.max(0, countdownEndsAt - Date.now()) : null;
  const expired = remainingMs === 0;
  const expireMin =
    remainingMs != null
      ? Math.floor(remainingMs / 60000)
          .toString()
          .padStart(2, "0")
      : "--";
  const expireSec =
    remainingMs != null
      ? Math.floor((remainingMs % 60000) / 1000)
          .toString()
          .padStart(2, "0")
      : "--";

  const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    amountCents / 100,
  );

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-slate-900 px-4 py-8">
      <div className="max-w-xl mx-auto space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex justify-center mb-4">
            {pixReady && qrImageSrc ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-3">
                <img src={qrImageSrc} alt="QR Code PIX" className="h-40 w-40" />
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 h-44 w-44 flex items-center justify-center text-sm text-slate-500">
                Gerando QR Code...
              </div>
            )}
          </div>

          <h2 className="text-center text-3xl font-semibold mb-1">Pague {brl} via Pix</h2>
          <p className="text-center text-slate-600 text-sm mb-5">
            Copie o codigo ou use a camera para ler o QR Code e finalize o pagamento no app do seu
            banco.
          </p>

          <label className="block text-sm text-slate-600 mb-2">Pix Copia e Cola</label>
          <div
            className={cn(
              "rounded-xl border bg-slate-50 transition-[box-shadow,transform] duration-300 ease-out",
              justCopied
                ? "border-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.35)] scale-[1.01]"
                : "border-slate-300",
            )}
          >
            <input
              type="text"
              readOnly
              value={pixCopyPaste ?? ""}
              placeholder="Codigo PIX aparece aqui."
              title={pixCopyPaste ?? undefined}
              className="w-full h-10 px-3 rounded-xl bg-transparent text-sm text-slate-800 outline-none truncate"
            />
          </div>
          <button
            type="button"
            onClick={copyPix}
            disabled={!pixCopyPaste}
            className={cn(
              "mt-3 w-full py-3 rounded-xl text-white font-semibold transition-all duration-300 ease-out",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "active:scale-[0.98]",
              justCopied
                ? "bg-emerald-600 shadow-lg shadow-emerald-600/35"
                : "bg-slate-900 hover:bg-slate-800",
            )}
          >
            <span className="inline-flex items-center justify-center gap-2">
              {justCopied && (
                <Check
                  className="h-5 w-5 shrink-0 animate-in zoom-in-95 fade-in-0 duration-200"
                  aria-hidden
                />
              )}
              <span
                key={justCopied ? "ok" : "copy"}
                className={cn(justCopied && "animate-in fade-in-0 zoom-in-95 duration-200")}
              >
                {justCopied ? "Copiado!" : "Copiar"}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={refreshNow}
            className="mt-3 w-full py-3 rounded-xl border border-slate-300 bg-white text-slate-800 font-semibold"
          >
            Confirmar pagamento
          </button>

          <div
            className={cn(
              "mt-4 rounded-xl border border-dashed px-4 py-3 flex items-center justify-between transition-colors duration-300",
              expired ? "border-red-200 bg-red-50" : "border-slate-300 bg-slate-50",
            )}
          >
            <span className={cn("text-sm", expired ? "text-red-700" : "text-slate-600")}>
              {countdownEndsAt == null
                ? "Aguardando codigo"
                : expired
                  ? "Tempo na tela"
                  : "Codigo expira em"}
            </span>
            <span
              className={cn(
                "font-mono text-lg font-semibold tabular-nums tracking-tight",
                expired ? "text-red-700" : "text-slate-900",
              )}
            >
              {countdownEndsAt == null ? "—" : `${expireMin}:${expireSec}`}
            </span>
          </div>
          {countdownEndsAt != null && !expired && (
            <p className="mt-2 text-center text-xs text-slate-500">
              15 minutos a partir do codigo aparecer.
            </p>
          )}
          {expired && (
            <p className="mt-2 text-center text-xs text-red-600">
              Tempo da tela esgotado; o prazo real do PIX segue o do seu banco.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-4">
            {[
              { title: "Acesse seu banco", desc: "Abra o app do seu banco, e rapidinho." },
              {
                title: "Escolha a opcao Pix",
                desc: 'Selecione "Pix Copia e Cola" ou "Ler QR code".',
              },
              {
                title: "Conclua o pagamento",
                desc: "Cole o codigo ou leia o QR code, confirme os dados e pronto!",
              },
            ].map((step, idx) => (
              <div
                key={step.title}
                className={`${idx < 2 ? "pb-4 border-b border-dashed border-slate-200" : ""}`}
              >
                <div className="font-semibold">{step.title}</div>
                <div className="text-sm text-slate-600">{step.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-xl mb-4">Resumo da compra</h3>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-600">Produto</span>
            <span>{planName}</span>
          </div>
          <div className="flex justify-between text-sm mb-3">
            <span className="text-slate-600">Pagamento Pix</span>
            <span>{brl}</span>
          </div>
          <div className="border-t border-dashed border-slate-200 pt-3 flex justify-between text-xl font-semibold">
            <span>Total</span>
            <span>{brl}</span>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-xl">Pix</h3>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                status === "paid"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {status === "paid" ? "Pago" : "Pendente"}
            </span>
          </div>
          <h4 className="font-semibold mb-2">Informacoes</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Cliente</span>
              <span>{customer.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">E-mail</span>
              <span>{customer.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Pedido</span>
              <span className="font-mono text-xs">{orderId.slice(0, 10)}...</span>
            </div>
          </div>
        </section>

        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>
    </div>
  );
}
