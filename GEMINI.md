# Ofertix — Arquitetura e Modelo de Dados

> Plataforma de e-commerce multi-vendedor com carrinho unificado e split de pagamento por vendedor.

---

## 1. Stack Tecnológica

| Camada | Tecnologia | Observações / Detalhes |
|---|---|---|
| **Frontend** | Next.js (App Router) + TypeScript | Módulos `(cliente)` e `(vendedor)` isolados via Route Groups. |
| **Estilização** | Tailwind CSS | Design system consistente, interfaces limpas e responsivas. |
| **Backend** | NestJS (Node.js) + TypeScript | Arquitetura modular (`vendors`, `products`, `orders`, `payments`, `users`, `reviews`). |
| **Banco de Dados** | Supabase (PostgreSQL) | PostgreSQL gerenciado, Auth, Storage, e Row Level Security (RLS). |
| **Pagamento / Split** | Asaas API | Cobrança unificada com split automatizado via `walletId` de cada vendedor. |
| **Imagens** | Cloudinary | Upload direto do frontend via unsigned uploads, garantindo performance. |
| **Deploy** | Vercel (Frontend) + Railway (Backend) | CI/CD automático via repositório Git. |

---

## 2. Estrutura do Projeto (Proposta)

```
ofertix/
├── apps/
│   ├── web/                              # Next.js (Frontend)
│   │   ├── app/
│   │   │   ├── (auth)/                   # Fluxos de Autenticação
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   ├── (cliente)/                # Módulo do Consumidor
│   │   │   │   ├── produtos/
│   │   │   │   │   ├── page.tsx          # Listagem geral (Filtros, Busca, Ordenação)
│   │   │   │   │   └── [slug]/page.tsx   # Detalhes do Produto & Reviews
│   │   │   │   ├── carrinho/page.tsx     # Carrinho unificado multi-vendedor
│   │   │   │   ├── checkout/page.tsx     # Checkout (Dados de envio e pagamento Asaas)
│   │   │   │   ├── pedidos/
│   │   │   │   │   ├── page.tsx          # Histórico de Pedidos do Cliente
│   │   │   │   │   └── [id]/page.tsx     # Status do Pedido detalhado por Sub-pedido
│   │   │   │   └── conta/page.tsx        # Informações da Conta do Cliente
│   │   │   ├── (vendedor)/               # Módulo do Vendedor
│   │   │   │   ├── dashboard/page.tsx    # Indicadores: faturamento, vendas, ticket médio
│   │   │   │   ├── produtos/
│   │   │   │   │   ├── page.tsx          # Gestão de Produtos (Listagem)
│   │   │   │   │   ├── novo/page.tsx     # Cadastro de Produto (com upload Cloudinary)
│   │   │   │   │   └── [id]/editar/page.tsx # Edição de Produto
│   │   │   │   ├── pedidos/page.tsx      # Sub-pedidos atribuídos ao vendedor (status)
│   │   │   │   └── conta/page.tsx        # Cadastro da Subconta Asaas (walletId)
│   │   │   └── layout.tsx                # Layout principal com Providers
│   │   ├── components/
│   │   │   ├── ui/                       # Componentes base reutilizáveis (botões, cards, inputs)
│   │   │   ├── product/                  # Grid de produtos, filtros, reviews
│   │   │   ├── cart/                     # Mini-cart e itens do carrinho
│   │   │   └── dashboard/                # Gráficos e painéis de indicadores do vendedor
│   │   ├── lib/
│   │   │   ├── supabase/                 # Configuração do cliente Supabase e hooks
│   │   │   └── api.ts                    # Wrapper de fetch para chamadas à API NestJS
│   │   └── types/                        # Tipagens de UI e auxiliares
│   │
│   └── api/                              # NestJS (Backend)
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/                 # Middleware e Guard para validação de JWT do Supabase
│       │   │   ├── users/                # Sincronização e perfil do usuário
│       │   │   ├── vendors/              # Onboarding Asaas e status do vendedor
│       │   │   ├── products/             # Cadastro de produtos e kits
│       │   │   ├── orders/               # Criação de Pedidos e Sub-pedidos (com split)
│       │   │   ├── payments/             # Integração Asaas (criação de cobrança e webhook)
│       │   │   └── reviews/              # Criação e listagem de reviews de produtos
│       │   ├── common/
│       │   │   ├── guards/               # RolesGuard (CLIENTE vs VENDEDOR)
│       │   │   ├── decorators/           # Decodificador de usuário do JWT
│       │   │   └── filters/              # Tratamento global de erros
│       │   ├── config/                   # Configurações de envs (Asaas, Supabase, Cloudinary)
│       │   └── main.ts                   # Inicialização da API
│       └── supabase/
│           └── migrations/               # Arquivos SQL de migração e políticas RLS
│
└── packages/
    └── shared-types/                     # Modelos de dados e DTOs compartilhados entre Frontend e Backend
```

---

## 3. Modelagem do Banco de Dados

### 3.1 DDL (PostgreSQL / Supabase)

Abaixo está o modelo físico inicial em PostgreSQL. O Supabase cuidará da autenticação na tabela interna `auth.users`, a qual mapeamos para a tabela pública `users` via trigger.

```sql
-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Usuários (Público, espelha auth.users)
CREATE TYPE user_type AS ENUM ('CONSUMER', 'VENDOR');

CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type user_type NOT NULL DEFAULT 'CONSUMER',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Tabela de Vendedores (Extensão de Users para Vendedores)
CREATE TYPE vendor_status AS ENUM ('PENDING', 'ACTIVE');

CREATE TABLE vendors (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    store_name VARCHAR(255) NOT NULL,
    cpf_cnpj VARCHAR(20) UNIQUE NOT NULL,
    asaas_wallet_id VARCHAR(100), -- ID da carteira do vendedor gerado na subconta Asaas
    status vendor_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Categorias de Produtos
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Tabela de Produtos
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(user_id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    images TEXT[] NOT NULL DEFAULT '{}', -- URLs do Cloudinary
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Tabela de Kits (Agrupamento promocional de produtos de um mesmo vendedor)
CREATE TABLE kits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(user_id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    discount_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (discount_percentage BETWEEN 0 AND 100),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela Pivô Kit-Produto
CREATE TABLE kit_products (
    kit_id UUID REFERENCES kits(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    PRIMARY KEY (kit_id, product_id)
);

-- 6. Promoções Temporárias
CREATE TABLE promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    kit_id UUID REFERENCES kits(id) ON DELETE CASCADE,
    discount_percentage NUMERIC(5, 2) NOT NULL CHECK (discount_percentage BETWEEN 0 AND 100),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT check_target CHECK (
        (product_id IS NOT NULL AND kit_id IS NULL) OR 
        (product_id IS NULL AND kit_id IS NOT NULL)
    )
);

-- 7. Tabela de Avaliações (Reviews)
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE (product_id, user_id) -- Apenas uma avaliação por usuário por produto
);

-- 8. Tabela de Pedido Pai (Consolidado do Cliente)
CREATE TYPE order_status AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'REFUNDED');

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consumer_id UUID REFERENCES users(id) NOT NULL,
    status order_status NOT NULL DEFAULT 'PENDING',
    total_value NUMERIC(10, 2) NOT NULL CHECK (total_value >= 0),
    shipping_address JSONB NOT NULL,
    shipping_value NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (shipping_value >= 0),
    asaas_payment_id VARCHAR(100), -- ID da cobrança gerada no Asaas
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 9. Tabela de Sub-Pedidos (Segmentados por Vendedor)
CREATE TYPE sub_order_status AS ENUM ('PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED');

CREATE TABLE sub_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    vendor_id UUID REFERENCES vendors(user_id) NOT NULL,
    status sub_order_status NOT NULL DEFAULT 'PENDING',
    gross_value NUMERIC(10, 2) NOT NULL CHECK (gross_value >= 0),
    commission_value NUMERIC(10, 2) NOT NULL CHECK (commission_value >= 0), -- 5% da Ofertix
    net_value NUMERIC(10, 2) NOT NULL CHECK (net_value >= 0), -- 95% do Vendedor
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 10. Itens do Sub-Pedido
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sub_order_id UUID REFERENCES sub_orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
```

### 3.2 Segurança e Privacidade de Dados: Row Level Security (RLS)

O Supabase utiliza políticas RLS para garantir que os dados só sejam lidos/escritos por quem tem autorização legítima. 

> [!IMPORTANT]
> A regra básica é: **Clientes** só vêem seus próprios pedidos e dados cadastrais. **Vendedores** só vêem e modificam seus próprios produtos, kits, sub-pedidos de suas vendas e seu faturamento.

Aqui estão as políticas SQL recomendadas que garantem esse isolamento diretamente no banco de dados:

```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE kit_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 1. Políticas para 'users'
CREATE POLICY "Usuários podem visualizar seu próprio perfil" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil" ON users
    FOR UPDATE USING (auth.uid() = id);

-- 2. Políticas para 'vendors'
CREATE POLICY "Qualquer um pode ver informações públicas de vendedores ativos" ON vendors
    FOR SELECT USING (status = 'ACTIVE' OR auth.uid() = user_id);

CREATE POLICY "Vendedores gerenciam seus próprios dados cadastrais" ON vendors
    FOR ALL USING (auth.uid() = user_id);

-- 3. Políticas para 'products'
CREATE POLICY "Produtos ativos são visíveis para qualquer pessoa" ON products
    FOR SELECT USING (active = true OR auth.uid() = vendor_id);

CREATE POLICY "Apenas o vendedor proprietário pode modificar produtos" ON products
    FOR ALL USING (auth.uid() = vendor_id);

-- 4. Políticas para 'orders' (Pedido Pai)
CREATE POLICY "Clientes visualizam apenas seus próprios pedidos" ON orders
    FOR SELECT USING (auth.uid() = consumer_id);

CREATE POLICY "Clientes criam seus próprios pedidos" ON orders
    FOR INSERT WITH CHECK (auth.uid() = consumer_id);

-- 5. Políticas para 'sub_orders' (Sub-pedidos)
-- O cliente dono do pedido pai OR o vendedor dono do sub-pedido podem ver o sub-pedido
CREATE POLICY "Clientes e vendedores correspondentes visualizam sub-pedidos" ON sub_orders
    FOR SELECT USING (
        auth.uid() = vendor_id OR 
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = sub_orders.order_id 
            AND orders.consumer_id = auth.uid()
        )
    );

-- Apenas o sistema/backend cria/atualiza os sub-pedidos (gerenciado via Service Role bypass)
CREATE POLICY "Vendedores podem atualizar status de entrega de seus sub-pedidos" ON sub_orders
    FOR UPDATE USING (auth.uid() = vendor_id)
    WITH CHECK (auth.uid() = vendor_id);

-- 6. Políticas para 'order_items'
CREATE POLICY "Clientes e vendedores correspondentes visualizam itens de pedidos" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sub_orders
            WHERE sub_orders.id = order_items.sub_order_id
            AND (
                sub_orders.vendor_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM orders 
                    WHERE orders.id = sub_orders.order_id 
                    AND orders.consumer_id = auth.uid()
                )
            )
        )
    );
```

---

## 4. Decisões Importantes Registradas

1. **Estrutura de Divisão de Pedidos (Pai -> Filhos)**
   Para resolver o carrinho multi-vendedor de forma robusta e permitir a conciliação das taxas, o sistema registra um pedido pai (`orders`) que representa a transação financeira do cliente. Esse pedido é quebrado em vários sub-pedidos (`sub_orders`), um para cada vendedor diferente contido no carrinho.
   
2. **Cálculo da Taxa Administrativa (Comissão de 5%)**
   A plataforma Ofertix fica com 5% do valor total bruto de cada item vendido. A fórmula de rateio aplicada no backend é:
   - `gross_value` = soma dos itens do vendedor no carrinho
   - `commission_value` = `gross_value` * 0.05
   - `net_value` = `gross_value` - `commission_value` (este é o valor repassado ao Asaas com split)

3. **Split no Gateway de Pagamentos Asaas**
   - A conta principal do Asaas pertence à Ofertix.
   - O vendedor, no onboarding, cria uma subconta Asaas. O identificador dessa subconta (`asaas_wallet_id`) é armazenado na tabela `vendors`.
   - Ao processar o pagamento, enviamos a cobrança para a conta Ofertix contendo um array de `split`. Cada item do split aponta para o `asaas_wallet_id` correspondente do vendedor, com o valor líquido (`net_value`) calculado. A comissão de 5% sobra automaticamente na conta principal da Ofertix.
   - **Restrição**: Vendedores sem um `asaas_wallet_id` ativo e homologado não podem ter produtos visíveis ou ativos no marketplace.

4. **Tratamento de Frete Simulado (MVP)**
   Para viabilizar a entrega no MVP de 7 dias, o frete é simplificado:
   - Um valor fixo ou simulado por pedido geral (ex: R$ 15,00) cobrado do comprador.
   - O valor do frete é retido na conta principal Ofertix ou rateado de forma fixa, sem lógica de cotação via APIs de correios em tempo real.

5. **Upload de Mídia Descentralizado**
   Para evitar sobrecarregar a banda do backend NestJS, o frontend realiza o upload de imagens diretamente no **Cloudinary** utilizando uma assinatura temporária (ou assinatura unsigned configurada de forma segura). O backend NestJS recebe apenas a URL final gerada.