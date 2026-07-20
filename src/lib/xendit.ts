type CreatePaymentLinkInput = {
  externalId: string;
  customerId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  productName: string;
  productUrl: string;
  successUrl: string;
  failureUrl: string;
};

type XenditPaymentSession = {
  payment_session_id: string;
  reference_id: string;
  payment_link_url: string;
  status: string;
};

export async function createPaymentSession(input: CreatePaymentLinkInput) {
  const secretKey = process.env.XENDIT_SECRET_KEY;
  if (!secretKey) throw new Error("XENDIT_SECRET_KEY belum dikonfigurasi.");

  const safeName = input.customerName.replace(/[^A-Za-z0-9 ]/g, "").trim().slice(0, 50) || "Customer";
  const response = await fetch("https://api.xendit.co/sessions", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reference_id: input.externalId,
      session_type: "PAY",
      mode: "PAYMENT_LINK",
      amount: input.amount,
      currency: "IDR",
      country: "ID",
      capture_method: "AUTOMATIC",
      locale: "id",
      description: input.productName,
      success_return_url: input.successUrl,
      cancel_return_url: input.failureUrl,
      customer: {
        reference_id: input.customerId.replace(/[^A-Za-z0-9]/g, ""),
        type: "INDIVIDUAL",
        email: input.customerEmail,
        individual_detail: { given_names: safeName },
      },
      items: [
        {
          reference_id: input.externalId,
          name: input.productName,
          description: input.productName,
          type: "DIGITAL_PRODUCT",
          quantity: 1,
          net_unit_amount: input.amount,
          currency: "IDR",
          category: "Digital Course",
          url: input.productUrl,
        },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Xendit gagal membuat pembayaran: ${response.status} ${error}`);
  }

  return (await response.json()) as XenditPaymentSession;
}
