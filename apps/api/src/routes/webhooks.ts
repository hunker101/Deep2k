import { Router, type Request, type Response } from 'express';
import { eq } from 'drizzle-orm';
import { sites, leads, type Db } from '@deep2k/db';

interface ShopifyLineItem {
  title: string;
  quantity: number;
  price: string;
  variant_title?: string | null;
}

interface ShopifyAddress {
  first_name?: string;
  last_name?: string;
  address1?: string;
  city?: string;
  province?: string;
  zip?: string;
  country?: string;
  phone?: string;
}

interface ShopifyCustomer {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
}

interface ShopifyOrder {
  id: number;
  name: string;           // e.g. "#1001"
  email?: string;
  total_price?: string;
  subtotal_price?: string;
  total_tax?: string;
  financial_status?: string;
  fulfillment_status?: string | null;
  customer?: ShopifyCustomer;
  shipping_address?: ShopifyAddress;
  billing_address?: ShopifyAddress;
  line_items?: ShopifyLineItem[];
  created_at?: string;
}

export function webhooksRouter(db: Db): Router {
  const router = Router();

  /**
   * POST /api/sites/:id/webhook/shopify
   * Called by Shopify's servers when an order is created.
   * No auth required — site UUID in URL provides sufficient entropy.
   * Register in Shopify: Settings → Notifications → Webhooks → orders/create
   */
  router.post('/sites/:id/webhook/shopify', async (req: Request, res: Response) => {
    const id = req.params.id ?? '';

    const [site] = await db.select({ id: sites.id }).from(sites).where(eq(sites.id, id));
    if (!site) { res.status(404).end(); return; }

    const order = req.body as ShopifyOrder;
    if (!order || !order.id) { res.status(400).end(); return; }

    const customer = order.customer ?? {};
    const shipping = order.shipping_address ?? order.billing_address ?? {};

    const firstName = customer.first_name ?? shipping.first_name ?? '';
    const lastName = customer.last_name ?? shipping.last_name ?? '';
    const email = order.email ?? customer.email ?? '';
    const phone = customer.phone ?? shipping.phone ?? '';

    const items = (order.line_items ?? [])
      .map(i => `${i.title}${i.variant_title ? ` (${i.variant_title})` : ''} x${i.quantity} @ $${i.price}`)
      .join(' | ');

    const fields: Record<string, string> = {
      order_id: order.name ?? String(order.id),
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      total: order.total_price ?? '',
      items,
      financial_status: order.financial_status ?? '',
    };

    if (shipping.address1) fields['address'] = shipping.address1;
    if (shipping.city) fields['city'] = shipping.city;
    if (shipping.province) fields['province'] = shipping.province;
    if (shipping.zip) fields['zip'] = shipping.zip;
    if (shipping.country) fields['country'] = shipping.country;

    // Remove empty fields
    for (const key of Object.keys(fields)) {
      if (!fields[key]) delete fields[key];
    }

    await db.insert(leads).values({
      siteId: site.id,
      type: 'order',
      fields,
      pageUrl: null,
    });

    // Shopify requires 200 response within 5 seconds or it retries
    res.status(200).end();
  });

  return router;
}
