-- migrations/20260805_plans_seed.sql
INSERT INTO public.plans (id, display_name, rank, monthly_price, request_limit, receives_broadcasts, show_whatsapp_to_client, client_visible, badge_label, badge_bg, badge_text, badge_border) VALUES
('gratuito', 'Gratuito', 4, 0, 0, false, false, false, NULL, NULL, NULL, NULL),
('bronze', 'Bronze', 3, 3490, 10, true, false, true, 'Concorrência', 'bg-amber-500/10', 'text-amber-400', 'border-amber-500/20'),
('prata', 'Prata', 2, 5490, 30, true, true, true, 'Prioridade', 'bg-cyan-500/10', 'text-cyan-400', 'border-cyan-500/20'),
('ouro', 'Ouro', 1, 7990, NULL, true, true, true, 'Premium', 'bg-amber-500/10', 'text-amber-400', 'border-amber-500/20');
