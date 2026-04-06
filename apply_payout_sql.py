
import psycopg2

db_url = "postgresql://postgres:estoesGRANDE333#@db.pviwmlbusbuzedtbyieu.supabase.co:5432/postgres"

sql = """
-- Create Payout Requests table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payout_requests') THEN
        CREATE TABLE public.payout_requests (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            driver_id UUID REFERENCES public.profiles(id) NOT NULL,
            amount INTEGER NOT NULL CHECK (amount > 0),
            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
            payment_info TEXT,
            external_reference TEXT,
            rejection_reason TEXT,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );

        ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Drivers can view their own payout requests') THEN
            CREATE POLICY "Drivers can view their own payout requests"
            ON public.payout_requests FOR SELECT
            TO authenticated
            USING (auth.uid() = driver_id);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Drivers can create payout requests') THEN
            CREATE POLICY "Drivers can create payout requests"
            ON public.payout_requests FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = driver_id);
        END IF;
    END IF;

    -- Add payout_request_id to trips
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='payout_request_id') THEN
        ALTER TABLE public.trips ADD COLUMN payout_request_id UUID REFERENCES public.payout_requests(id);
    END IF;
END $$;
"""

def apply():
    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(sql)
        print("SQL migration applied successfully!")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    apply()
