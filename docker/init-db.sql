-- Claims Lifecycle Database Initialization Script

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR UNIQUE,
    password VARCHAR,
    role VARCHAR,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create claims table
CREATE TABLE IF NOT EXISTS claims (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_number VARCHAR UNIQUE,
    customer_name VARCHAR,
    account_number VARCHAR,
    transaction_amount DECIMAL(10,2),
    transaction_date TIMESTAMP,
    merchant_name VARCHAR,
    description TEXT,
    reason VARCHAR,
    status VARCHAR DEFAULT 'pending',
    claim_class VARCHAR,
    eligibility_checks JSONB,
    is_eligible BOOLEAN DEFAULT false,
    evidence_files JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create session table for express-session
CREATE TABLE IF NOT EXISTS session (
    sid VARCHAR NOT NULL COLLATE "default",
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);

ALTER TABLE session ADD CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX IDX_session_expire ON session (expire);

-- Insert sample users
INSERT INTO users (id, username, password, role) VALUES
    ('aca5e25e-6aa2-4e4c-a043-0fc5c4263733', 'john.customer', 'customer123', 'Customer'),
    ('b603cc22-4da6-4834-9f50-fa780f8bbb7d', 'sarah.customer', 'customer123', 'Customer'),
    ('89ff7738-4440-40f3-a7eb-846e649293e3', 'mike.processor', 'processor123', 'Claim Processor'),
    ('2a8da458-2152-4018-8e04-af4e3b68549e', 'emma.processor', 'processor123', 'Claim Processor'),
    ('7cbd93fa-05f1-40a2-b44d-57db04110cdb', 'admin.processor', 'processor123', 'Claim Processor')
ON CONFLICT (username) DO NOTHING;

-- Insert sample claims
INSERT INTO claims (
    id, claim_number, customer_name, account_number, transaction_amount, 
    transaction_date, merchant_name, description, reason, status, claim_class, 
    eligibility_checks, is_eligible, evidence_files
) VALUES
    (
        '9e23da06-ef6b-4810-a15e-206c76892e26',
        'CLM-2024-001',
        'Sarah Johnson',
        'ACC-789456123',
        2500.00,
        '2024-01-15 10:30:00',
        'Premium Electronics Ltd',
        'Faulty laptop that stopped working after 2 weeks',
        'faulty-goods',
        'pending',
        'Class 2',
        '{"timePeriod": {"withinSixYears": true}, "purchaseMethod": {"wasCreditCardUsed": true, "wasNotCashOrTransfer": true}, "reasonForClaim": {"isValidReason": true, "isNotChangeOfMind": true}, "transactionType": {"isNotRestrictedTransaction": true, "isPurchaseOfGoodsOrServices": true}, "transactionValue": {"overHundredPounds": true, "underThirtyThousandPounds": true}}',
        true,
        '[{"url": "/objects/uploads/receipt-001.pdf", "name": "receipt.pdf"}, {"url": "/objects/uploads/warranty-001.jpg", "name": "warranty.jpg"}]'
    ),
    (
        'bd9ebbc2-e614-4e05-bdef-a66ef68b8015',
        'CLM-2024-002',
        'Michael Thompson',
        'ACC-456789012',
        850.00,
        '2024-02-03 14:20:00',
        'TravelMax Tours',
        'Holiday cancelled due to company going into administration',
        'supplier-failure',
        'approved',
        'Class 1',
        '{"timePeriod": {"withinSixYears": true}, "purchaseMethod": {"wasCreditCardUsed": true, "wasNotCashOrTransfer": true}, "reasonForClaim": {"isValidReason": true, "isNotChangeOfMind": true}, "transactionType": {"isNotRestrictedTransaction": true, "isPurchaseOfGoodsOrServices": true}, "transactionValue": {"overHundredPounds": true, "underThirtyThousandPounds": true}}',
        true,
        '[{"url": "/objects/uploads/booking-002.pdf", "name": "booking_confirmation.pdf"}, {"url": "/objects/uploads/cancel-002.pdf", "name": "cancellation_notice.pdf"}]'
    ),
    (
        '8f3aff01-aa2d-4047-b93b-2dcf8127e4e2',
        'CLM-2024-003',
        'Emma Williams',
        'ACC-123456789',
        15750.00,
        '2023-11-28 09:15:00',
        'Luxury Kitchen Solutions',
        'Kitchen installation never completed, company has disappeared',
        'non-delivery',
        'pending',
        'Class 4',
        '{"timePeriod": {"withinSixYears": true}, "purchaseMethod": {"wasCreditCardUsed": true, "wasNotCashOrTransfer": true}, "reasonForClaim": {"isValidReason": true, "isNotChangeOfMind": true}, "transactionType": {"isNotRestrictedTransaction": true, "isPurchaseOfGoodsOrServices": true}, "transactionValue": {"overHundredPounds": true, "underThirtyThousandPounds": true}}',
        true,
        '[{"url": "/objects/uploads/contract-003.pdf", "name": "contract.pdf"}, {"url": "/objects/uploads/payment-003.pdf", "name": "payment_receipt.pdf"}, {"url": "/objects/uploads/photos-003.zip", "name": "photos.zip"}]'
    ),
    (
        'f1a2b3c4-d5e6-7890-abcd-ef1234567890',
        'CLM-2024-004',
        'David Brown',
        'ACC-987654321',
        450.00,
        '2024-03-10 16:45:00',
        'Tech Gadgets Online',
        'Phone arrived damaged and seller refuses refund',
        'faulty-goods',
        'under-review',
        'Class 1',
        '{"timePeriod": {"withinSixYears": true}, "purchaseMethod": {"wasCreditCardUsed": true, "wasNotCashOrTransfer": true}, "reasonForClaim": {"isValidReason": true, "isNotChangeOfMind": true}, "transactionType": {"isNotRestrictedTransaction": true, "isPurchaseOfGoodsOrServices": true}, "transactionValue": {"overHundredPounds": true, "underThirtyThousandPounds": true}}',
        true,
        '[{"url": "/objects/uploads/damage-004.jpg", "name": "damage_photos.jpg"}]'
    ),
    (
        'a1b2c3d4-e5f6-7890-1234-567890abcdef',
        'CLM-2024-005',
        'Lisa Chen',
        'ACC-555666777',
        7200.00,
        '2024-01-22 11:30:00',
        'Home Furniture Plus',
        'Furniture set delivered with major defects, company refusing replacement',
        'faulty-goods',
        'rejected',
        'Class 3',
        '{"timePeriod": {"withinSixYears": true}, "purchaseMethod": {"wasCreditCardUsed": true, "wasNotCashOrTransfer": true}, "reasonForClaim": {"isValidReason": true, "isNotChangeOfMind": true}, "transactionType": {"isNotRestrictedTransaction": true, "isPurchaseOfGoodsOrServices": true}, "transactionValue": {"overHundredPounds": true, "underThirtyThousandPounds": true}}',
        true,
        '[{"url": "/objects/uploads/furniture-005.pdf", "name": "invoice.pdf"}, {"url": "/objects/uploads/defects-005.jpg", "name": "defect_photos.jpg"}]'
    ),
    (
        'z9y8x7w6-v5u4-t3s2-r1q0-p9o8n7m6l5k4',
        'CLM-2024-006',
        'Robert Wilson',
        'ACC-111222333',
        3300.00,
        '2024-02-14 13:20:00',
        'Professional Services Ltd',
        'Service contract breached, work not completed as agreed',
        'supplier-failure',
        'pending',
        'Class 2',
        '{"timePeriod": {"withinSixYears": true}, "purchaseMethod": {"wasCreditCardUsed": true, "wasNotCashOrTransfer": true}, "reasonForClaim": {"isValidReason": true, "isNotChangeOfMind": true}, "transactionType": {"isNotRestrictedTransaction": true, "isPurchaseOfGoodsOrServices": true}, "transactionValue": {"overHundredPounds": true, "underThirtyThousandPounds": true}}',
        true,
        '[{"url": "/objects/uploads/contract-006.pdf", "name": "service_contract.pdf"}]'
    )
ON CONFLICT (id) DO NOTHING;