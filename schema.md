## Table `users`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `email` | `varchar` |  Unique |
| `name` | `varchar` |  |
| `type` | `user_type` |  |
| `avatar_url` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `vendors`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `user_id` | `uuid` | Primary |
| `store_name` | `varchar` |  |
| `cpf_cnpj` | `varchar` |  Unique |
| `asaas_wallet_id` | `varchar` |  Nullable |
| `status` | `vendor_status` |  |
| `created_at` | `timestamptz` |  |

## Table `categories`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `varchar` |  |
| `slug` | `varchar` |  Unique |
| `parent_id` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `products`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `vendor_id` | `uuid` |  |
| `category_id` | `uuid` |  Nullable |
| `name` | `varchar` |  |
| `description` | `text` |  Nullable |
| `price` | `numeric` |  |
| `stock` | `int4` |  |
| `images` | `_text` |  |
| `active` | `bool` |  |
| `created_at` | `timestamptz` |  |

## Table `kits`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `vendor_id` | `uuid` |  |
| `name` | `varchar` |  |
| `description` | `text` |  Nullable |
| `discount_percentage` | `numeric` |  |
| `active` | `bool` |  |
| `created_at` | `timestamptz` |  |

## Table `kit_products`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `kit_id` | `uuid` | Primary |
| `product_id` | `uuid` | Primary |
| `quantity` | `int4` |  |

## Table `promotions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `product_id` | `uuid` |  Nullable |
| `kit_id` | `uuid` |  Nullable |
| `discount_percentage` | `numeric` |  |
| `start_date` | `timestamptz` |  |
| `end_date` | `timestamptz` |  |
| `created_at` | `timestamptz` |  |

## Table `reviews`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `product_id` | `uuid` |  |
| `user_id` | `uuid` |  |
| `rating` | `int4` |  |
| `comment` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `orders`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `consumer_id` | `uuid` |  |
| `status` | `order_status` |  |
| `total_value` | `numeric` |  |
| `shipping_address` | `jsonb` |  |
| `shipping_value` | `numeric` |  |
| `asaas_payment_id` | `varchar` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `sub_orders`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `order_id` | `uuid` |  |
| `vendor_id` | `uuid` |  |
| `status` | `sub_order_status` |  |
| `gross_value` | `numeric` |  |
| `commission_value` | `numeric` |  |
| `net_value` | `numeric` |  |
| `created_at` | `timestamptz` |  |

## Table `order_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `sub_order_id` | `uuid` |  |
| `product_id` | `uuid` |  |
| `quantity` | `int4` |  |
| `unit_price` | `numeric` |  |
| `created_at` | `timestamptz` |  |

