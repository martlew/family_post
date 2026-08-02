// Standalone helper: prints every real Lemon Squeezy variant ID for the
// configured store, so a stale/wrong LEMON_SQUEEZY_VARIANT_ID* in .env can be
// spotted without having to boot the whole backend.
//
// Usage: node list_lemon_variants.js

import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "server/.env"), override: false });

const apiKey = (process.env.LEMON_SQUEEZY_API_KEY || "").trim();
const storeId = (process.env.LEMON_SQUEEZY_STORE_ID || "429090").trim();

if (!apiKey) {
  console.error("ERROR: LEMON_SQUEEZY_API_KEY is not set (check .env / server/.env).");
  process.exit(1);
}

const headers = {
  Accept: "application/vnd.api+json",
  "Content-Type": "application/vnd.api+json",
  Authorization: `Bearer ${apiKey}`,
};

async function main() {
  const productsRes = await fetch(`https://api.lemonsqueezy.com/v1/products?filter[store_id]=${encodeURIComponent(storeId)}`, { headers });
  const productsJson = await productsRes.json().catch(() => ({}));
  if (!productsRes.ok) {
    console.error(`ERROR: products request failed (${productsRes.status}):`, JSON.stringify(productsJson, null, 2));
    process.exit(1);
  }

  const products = productsJson.data || [];
  if (products.length === 0) {
    console.warn(`No products found for store ${storeId}. Double-check LEMON_SQUEEZY_STORE_ID.`);
    return;
  }

  console.log(`Store ${storeId}: ${products.length} product(s)\n`);

  for (const product of products) {
    console.log(`Product ${product.id} - "${product.attributes?.name}"`);

    const variantsRes = await fetch(`https://api.lemonsqueezy.com/v1/variants?filter[product_id]=${encodeURIComponent(product.id)}`, { headers });
    const variantsJson = await variantsRes.json().catch(() => ({}));
    if (!variantsRes.ok) {
      console.error(`  ERROR: variants request failed (${variantsRes.status}):`, JSON.stringify(variantsJson, null, 2));
      continue;
    }

    for (const variant of variantsJson.data || []) {
      const price = typeof variant.attributes?.price === "number" ? (variant.attributes.price / 100).toFixed(2) : "?";
      console.log(`  variantId=${variant.id}  name="${variant.attributes?.name}"  price=${price}  status=${variant.attributes?.status}`);
    }
    console.log("");
  }
}

main().catch((error) => {
  console.error("ERROR:", error?.message || error);
  process.exit(1);
});
