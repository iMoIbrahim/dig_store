

## Digital Product Store — MVP Plan

### Design System
- **Dark theme** with deep backgrounds (`#0A0F1A`, `#111827`) and **emerald/green accents** (`#10B981`, `#059669`)
- Clean, modern typography with good spacing and soft shadows
- Card-based layouts with subtle borders and hover effects

### Database Schema (Supabase/PostgreSQL)
- **profiles** — user profile data linked to auth.users
- **user_roles** — admin role management (secure enum-based)
- **products** — title, price, description, image_url, stock_count, active flag
- **accounts** — digital inventory (email, password, product_id, sold flag, assigned_to)
- **orders** — user_id, product_id, payment_id, status (pending/paid/delivered), nowpayments metadata, delivered account details
- Full RLS policies on all tables

### Authentication
- Supabase Auth (email/password) with protected routes
- Login & Register pages with form validation
- Auth context with session management

### Pages & Components
1. **Home** — Hero section + product grid (4-5 cards with title, price, description, stock)
2. **Product Detail** — Full description, stock indicator, "Buy Now" button (requires login)
3. **Login / Register** — Clean forms with validation and error handling
4. **Payment Page** — Shows NOWPayments invoice details (wallet address, amount, QR code), polls for status
5. **Success Page** — Displays delivered account credentials immediately after payment confirmation
6. **User Dashboard** — Order history with purchased account details, always accessible
7. **Admin Panel** — Protected admin pages to:
   - Manage products (CRUD)
   - Upload account inventory (add accounts to a product)
   - View all orders and their statuses
   - See inventory levels

### Payment Flow (NOWPayments)
1. User clicks "Buy" → Edge function creates invoice via NOWPayments API (USDT TRC20/BEP20)
2. Frontend shows payment address, amount, QR code and polls for status
3. NOWPayments webhook → Edge function validates signature, marks order as paid
4. Auto-delivery: assigns an unused account to the order, marks account as sold
5. Frontend shows delivered credentials on success page

### Edge Functions
- **create-payment** — Creates NOWPayments invoice, creates pending order
- **nowpayments-webhook** — Validates IPN signature, processes payment confirmation, triggers account delivery
- **get-order-status** — Polling endpoint for payment status

### Security
- RLS on all tables (users see only their own orders)
- Admin role checked via `has_role()` security definer function
- Webhook signature validation (HMAC)
- Input validation with Zod on all edge functions
- Duplicate delivery prevention (database transaction with row locking)
- Accounts stored securely, only revealed to the purchasing user

