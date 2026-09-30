-- Fulfillment de assinaturas: webhook Stripe -> plano do profissional.
--
-- checkout.session.completed usa o metadata.plan gravado no checkout;
-- customer.subscription.created/updated resolve o plano pelo price_id
-- comparando com public.plans (fonte única);
-- customer.subscription.deleted volta para gratuito;
-- invoice.paid / invoice.payment_failed atualizam plan_status e expiração.

CREATE OR REPLACE FUNCTION public.fulfill_professional_subscription()
RETURNS TRIGGER AS $$
DECLARE
  v_subject_type TEXT;
  v_subject_id TEXT;
  v_plan TEXT;
  v_price_id TEXT;
  v_customer TEXT;
  v_subscription TEXT;
BEGIN
  IF NEW.provider <> 'stripe' OR NEW.processing_status <> 'processed' THEN
    RETURN NEW;
  END IF;

  IF NEW.event_type = 'checkout.session.completed' THEN
    v_subject_type := NEW.payload -> 'data' -> 'object' -> 'metadata' ->> 'insforge_subject_type';
    v_subject_id := NEW.payload -> 'data' -> 'object' -> 'metadata' ->> 'insforge_subject_id';
    IF v_subject_id IS NULL THEN
      SELECT m.subject_type, m.subject_id
      INTO v_subject_type, v_subject_id
      FROM payments.customer_mappings m
      WHERE m.provider = NEW.provider
        AND m.provider_customer_id = NEW.payload -> 'data' -> 'object' ->> 'customer'
      LIMIT 1;
    END IF;
    IF v_subject_id IS NULL THEN
      RAISE WARNING 'Stripe checkout.session.completed % has no resolvable billing subject', NEW.id;
      RETURN NEW;
    END IF;

    v_customer := NEW.payload -> 'data' -> 'object' ->> 'customer';
    v_subscription := NEW.payload -> 'data' -> 'object' ->> 'subscription';

    IF v_subject_type = 'professional' THEN
      UPDATE public.professionals
      SET plan = COALESCE(NEW.payload -> 'data' -> 'object' -> 'metadata' ->> 'plan', plan),
          plan_status = 'active',
          stripe_customer_id = COALESCE(v_customer, stripe_customer_id),
          stripe_subscription_id = COALESCE(v_subscription, stripe_subscription_id),
          updated_at = NOW()
      WHERE id::text = v_subject_id;
    END IF;
  END IF;

  IF NEW.event_type IN ('customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted', 'invoice.paid', 'invoice.payment_failed') THEN
    v_subject_type := COALESCE(
      NEW.payload -> 'data' -> 'object' -> 'parent' -> 'subscription_details' -> 'metadata' ->> 'insforge_subject_type',
      NEW.payload -> 'data' -> 'object' -> 'metadata' ->> 'insforge_subject_type'
    );
    v_subject_id := COALESCE(
      NEW.payload -> 'data' -> 'object' -> 'parent' -> 'subscription_details' -> 'metadata' ->> 'insforge_subject_id',
      NEW.payload -> 'data' -> 'object' -> 'metadata' ->> 'insforge_subject_id'
    );
    IF v_subject_id IS NULL THEN
      SELECT m.subject_type, m.subject_id
      INTO v_subject_type, v_subject_id
      FROM payments.customer_mappings m
      WHERE m.provider = NEW.provider
        AND m.provider_customer_id = NEW.payload -> 'data' -> 'object' ->> 'customer'
      LIMIT 1;
    END IF;
    IF v_subject_id IS NULL OR v_subject_type <> 'professional' THEN
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.event_type = 'customer.subscription.created' THEN
    v_price_id := NEW.payload -> 'data' -> 'object' -> 'items' -> 'data' -> 0 -> 'price' ->> 'id';
    v_plan := CASE
      WHEN v_price_id = (SELECT stripe_price_id FROM public.plans WHERE id = 'ouro') THEN 'ouro'
      WHEN v_price_id = (SELECT stripe_price_id FROM public.plans WHERE id = 'prata') THEN 'prata'
      WHEN v_price_id = (SELECT stripe_price_id FROM public.plans WHERE id = 'bronze') THEN 'bronze'
      ELSE NULL
    END;
    UPDATE public.professionals
    SET plan_status = CASE
          WHEN NEW.payload -> 'data' -> 'object' ->> 'status' = 'active' THEN 'active'
          WHEN NEW.payload -> 'data' -> 'object' ->> 'status' = 'past_due' THEN 'past_due'
          ELSE 'canceled'
        END,
        plan = COALESCE(v_plan, plan),
        stripe_subscription_id = COALESCE(NEW.payload -> 'data' -> 'object' ->> 'id', stripe_subscription_id),
        stripe_customer_id = COALESCE(NEW.payload -> 'data' -> 'object' ->> 'customer', stripe_customer_id),
        plan_expires_at = to_timestamp((NEW.payload -> 'data' -> 'object' -> 'items' -> 'data' -> 0 ->> 'current_period_end')::bigint),
        updated_at = NOW()
    WHERE id::text = v_subject_id;
  END IF;

  IF NEW.event_type = 'customer.subscription.updated' THEN
    v_price_id := NEW.payload -> 'data' -> 'object' -> 'items' -> 'data' -> 0 -> 'price' ->> 'id';
    v_plan := CASE
      WHEN v_price_id = (SELECT stripe_price_id FROM public.plans WHERE id = 'ouro') THEN 'ouro'
      WHEN v_price_id = (SELECT stripe_price_id FROM public.plans WHERE id = 'prata') THEN 'prata'
      WHEN v_price_id = (SELECT stripe_price_id FROM public.plans WHERE id = 'bronze') THEN 'bronze'
      ELSE NULL
    END;
    UPDATE public.professionals
    SET plan_status = CASE
          WHEN NEW.payload -> 'data' -> 'object' ->> 'status' = 'active' THEN 'active'
          WHEN NEW.payload -> 'data' -> 'object' ->> 'status' = 'past_due' THEN 'past_due'
          ELSE 'canceled'
        END,
        plan = COALESCE(v_plan, plan),
        plan_expires_at = to_timestamp((NEW.payload -> 'data' -> 'object' -> 'items' -> 'data' -> 0 ->> 'current_period_end')::bigint),
        updated_at = NOW()
    WHERE id::text = v_subject_id;
  END IF;

  IF NEW.event_type = 'customer.subscription.deleted' THEN
    UPDATE public.professionals
    SET plan_status = 'canceled',
        plan = 'gratuito',
        updated_at = NOW()
    WHERE id::text = v_subject_id;
  END IF;

  IF NEW.event_type = 'invoice.paid' THEN
    UPDATE public.professionals
    SET plan_status = 'active',
        plan_expires_at = to_timestamp((NEW.payload -> 'data' -> 'object' ->> 'period_end')::bigint),
        updated_at = NOW()
    WHERE id::text = v_subject_id;
  END IF;

  IF NEW.event_type = 'invoice.payment_failed' THEN
    UPDATE public.professionals
    SET plan_status = 'past_due',
        updated_at = NOW()
    WHERE id::text = v_subject_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS fulfill_professional_subscription_from_webhook ON payments.webhook_events;

CREATE TRIGGER fulfill_professional_subscription_from_webhook
  AFTER INSERT OR UPDATE ON payments.webhook_events
  FOR EACH ROW
  EXECUTE FUNCTION public.fulfill_professional_subscription();
