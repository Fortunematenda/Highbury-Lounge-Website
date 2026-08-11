-- First-party website page-view analytics (privacy-friendly visitor cookie).
-- SQLite / Cloudflare D1 dialect (not T-SQL).
CREATE TABLE site_page_views (
	id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	visitor_id text NOT NULL,
	path text NOT NULL,
	referrer text,
	title text,
	user_agent text,
	country text,
	created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX site_page_views_created_idx ON site_page_views (created_at);
--> statement-breakpoint
CREATE INDEX site_page_views_path_idx ON site_page_views (path);
--> statement-breakpoint
CREATE INDEX site_page_views_visitor_idx ON site_page_views (visitor_id);
