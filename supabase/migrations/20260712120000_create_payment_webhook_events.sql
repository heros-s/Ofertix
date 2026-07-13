-- ADR-0001: idempotência do webhook de pagamentos via log de eventos.
-- Ver: docs/decisions/0001-implementar-orders-payments-split-asaas.md
create table if not exists payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  asaas_payment_id varchar not null,
  event varchar not null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint payment_webhook_events_payment_event_unique unique (asaas_payment_id, event)
);

create index if not exists idx_payment_webhook_events_asaas_payment_id
  on payment_webhook_events (asaas_payment_id);
