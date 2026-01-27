-- Add deducted_credits_amount column to refund_request table
-- This field tracks the actual credits deducted from user when refund is approved

ALTER TABLE refund_request 
ADD COLUMN IF NOT EXISTS deducted_credits_amount INTEGER;

COMMENT ON COLUMN refund_request.deducted_credits_amount IS 'Credits deducted from user when refund is approved';
