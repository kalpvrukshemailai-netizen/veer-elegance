-- Migration 029: Remove express shipping rate from site_content
-- Simplifies the delivery model to a single Standard Delivery option.
-- Preserves existing standard shipping rate and free shipping threshold.

UPDATE public.site_content
SET value = value - 'expressShippingRate'
WHERE key = 'shipping' AND value ? 'expressShippingRate';
