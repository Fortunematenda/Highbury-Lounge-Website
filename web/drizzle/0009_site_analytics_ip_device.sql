-- Add IP + device columns for admin analytics detail.
ALTER TABLE site_page_views ADD COLUMN ip text;
--> statement-breakpoint
ALTER TABLE site_page_views ADD COLUMN device text;
