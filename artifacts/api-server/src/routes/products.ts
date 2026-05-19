import { Router } from "express";
import { db, productsTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import { requireAuth, requireManager, type AuthRequest } from "../lib/auth";
import { writeAuditLog } from "../lib/audit";
import { CreateProductBody, UpdateProductParams, UpdateProductBody, DeleteProductParams } from "@workspace/api-zod";
import { apiLimiter } from "../middleware/rateLimit";
import { withCache, buildCacheKey, cacheDelPattern } from "../lib/cache";

const router = Router();

function formatProduct(p: typeof productsTable.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: parseFloat(p.price),
    stock: p.stock,
    category: p.category,
  };
}

router.get("/products", requireAuth, apiLimiter, async (req, res): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  // Validate pagination parameters
  if (page < 1 || limit < 1 || limit > 100) {
    res.status(400).json({ error: "Invalid pagination parameters. Page must be >= 1, limit must be between 1 and 100." });
    return;
  }

  const cacheKey = buildCacheKey("products", "list", `page:${page}`, `limit:${limit}`);

  const result = await withCache(
    cacheKey,
    300, // 5 minute TTL
    async () => {
      // Get total count for metadata
      const [totalCountResult] = await db.select({ count: count() }).from(productsTable);
      const totalCount = totalCountResult.count;

      // Get paginated products
      const products = await db
        .select()
        .from(productsTable)
        .orderBy(productsTable.name)
        .limit(limit)
        .offset(offset);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        data: products.map(formatProduct),
        meta: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    }
  );

  res.json(result);
});

router.post("/products", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [product] = await db.insert(productsTable).values({
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    price: String(parsed.data.price),
    stock: parsed.data.stock,
    category: parsed.data.category ?? null,
  }).returning();

  const actingUser = (req as AuthRequest).user!;
  await writeAuditLog({ userId: parseInt(actingUser.sub), action: "CREATE_PRODUCT", resourceType: "product", resourceId: product.id, description: `Created product ${product.name}` });
  
  // Invalidate products cache
  await cacheDelPattern("products:list:*");
  
  res.status(201).json(formatProduct(product));
});

router.patch("/products/:id", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name != null) updates.name = parsed.data.name;
  if (parsed.data.description != null) updates.description = parsed.data.description;
  if (parsed.data.price != null) updates.price = String(parsed.data.price);
  if (parsed.data.stock != null) updates.stock = parsed.data.stock;
  if (parsed.data.category != null) updates.category = parsed.data.category;

  const [product] = await db.update(productsTable).set(updates).where(eq(productsTable.id, params.data.id)).returning();
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }

  const actingUser = (req as AuthRequest).user!;
  await writeAuditLog({ userId: parseInt(actingUser.sub), action: "UPDATE_PRODUCT", resourceType: "product", resourceId: product.id, description: `Updated product ${product.name}` });
  
  // Invalidate products cache
  await cacheDelPattern("products:list:*");
  
  res.json(formatProduct(product));
});

router.delete("/products/:id", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  await db.delete(productsTable).where(eq(productsTable.id, params.data.id));
  const actingUser = (req as AuthRequest).user!;
  await writeAuditLog({ userId: parseInt(actingUser.sub), action: "DELETE_PRODUCT", resourceType: "product", resourceId: params.data.id, description: `Deleted product ${params.data.id}` });
  
  // Invalidate products cache
  await cacheDelPattern("products:list:*");
  
  res.sendStatus(204);
});

export default router;
