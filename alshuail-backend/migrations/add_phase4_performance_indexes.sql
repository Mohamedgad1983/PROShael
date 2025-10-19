-- Phase 4 Performance Optimization: Critical Index Creation
-- Migration: add_phase4_performance_indexes
-- Created: 2025-10-19
-- Purpose: Add missing indexes identified in performance profiling

-- Members table indexes
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status);
CREATE INDEX IF NOT EXISTS idx_members_type ON public.members(type);
CREATE INDEX IF NOT EXISTS idx_members_created_at ON public.members(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_members_updated_at ON public.members(updated_at DESC);

-- Payments table indexes
CREATE INDEX IF NOT EXISTS idx_payments_member_id ON public.payments(member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

-- Subscriptions table indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_member_id ON public.subscriptions(member_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- Initiatives table indexes
CREATE INDEX IF NOT EXISTS idx_initiatives_dates ON public.initiatives(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_initiatives_status ON public.initiatives(status);

-- Diyas table indexes
CREATE INDEX IF NOT EXISTS idx_diyas_user_status ON public.diyas(user_id, status);
CREATE INDEX IF NOT EXISTS idx_diyas_created_at ON public.diyas(created_at DESC);
