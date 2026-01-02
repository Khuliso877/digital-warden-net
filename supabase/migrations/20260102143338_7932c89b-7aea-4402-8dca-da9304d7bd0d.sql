-- Add tier column to trusted_contacts for escalation levels
ALTER TABLE public.trusted_contacts 
ADD COLUMN tier integer NOT NULL DEFAULT 1 CHECK (tier >= 1 AND tier <= 3);

-- Add index for efficient tier-based queries
CREATE INDEX idx_trusted_contacts_tier ON public.trusted_contacts(user_id, tier);

-- Add comment for clarity
COMMENT ON COLUMN public.trusted_contacts.tier IS 'Contact priority tier: 1=Immediate (family), 2=Secondary (neighbors/colleagues), 3=Tertiary';