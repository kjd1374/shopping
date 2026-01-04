
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'request_items' AND column_name = 'is_hidden_by_user') THEN
        ALTER TABLE request_items ADD COLUMN is_hidden_by_user boolean default false;
    END IF;
END $$;
