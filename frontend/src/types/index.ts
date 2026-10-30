export type UserRole = 'CUSTOMER' | 'PROFESSIONAL' | 'ADMIN';

export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone_number: string;
  role: UserRole;
  preferred_language?: 'en' | 'am' | 'om';
  preferred_theme?: 'light' | 'dark';
  is_banned: boolean;
  is_staff?: boolean;
  ban_reason?: string;
  profile_picture?: string | null;
  created_at: string;
  customer_profile?: CustomerProfile;
  professional_profile?: ProfessionalProfile;
}

export interface City {
  id: number;
  name: string;
  is_active: boolean;
  subcities: SubCity[];
}

export interface SubCity {
  id: number;
  name: string;
  city: number;
  is_active: boolean;
}

export interface ServiceCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon_name: string;
  is_active: boolean;
}

export interface ProfessionalCertificate {
  id: number;
  title: string;
  issued_by: string;
  certificate_file: string;
  uploaded_at: string;
  is_verified: boolean;
}

export interface ProfessionalPortfolioItem {
  id: number;
  title: string;
  description: string;
  image: string;
  created_at: string;
}

export interface ProfessionalProfile {
  id: number;
  user_id?: number;
  full_name?: string;
  city?: number | null;
  city_id?: number | null;
  city_name?: string;
  subcity?: number | null;
  subcity_id?: number | null;
  subcity_name?: string;
  service_area_description: string;
  bio: string;
  experience_years: number;
  previous_work_description?: string;
  profile_picture?: string | null;
  verification_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejection_reason?: string;
  average_rating: number;
  completed_jobs_count: number;
  categories: ServiceCategory[];
  portfolio_items?: ProfessionalPortfolioItem[];
  certificates?: ProfessionalCertificate[];
  reviews_count?: number;
}

export interface CustomerProfile {
  id: number;
  city?: number | null;
  city_id?: number | null;
  city_name?: string;
  subcity?: number | null;
  subcity_id?: number | null;
  subcity_name?: string;
  address_details: string;
  profile_picture?: string | null;
}

export type RequestStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DECLINED_BY_ALL';

export type RecipientStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'SUPERSEDED'
  | 'CANCELLED';

export interface ServiceRequestRecipient {
  id: number;
  professional_id: number;
  professional_name: string;
  profile_picture?: string | null;
  average_rating: number;
  phone_number?: string | null;
  status: RecipientStatus;
  declined_reason?: string;
  responded_at?: string | null;
  created_at: string;
}

export interface ServiceRequest {
  id: number;
  customer: number;
  customer_name: string;
  customer_picture?: string | null;
  customer_phone?: string | null;
  category: number;
  category_name: string;
  city: number;
  city_name: string;
  subcity?: number | null;
  subcity_name?: string;
  title: string;
  description: string;
  service_address?: string | null;
  preferred_date?: string | null;
  status: RequestStatus;
  accepted_professional?: number | null;
  accepted_professional_name?: string | null;
  accepted_professional_picture?: string | null;
  accepted_professional_phone?: string | null;
  cancellation_reason?: string;
  cancelled_by?: number | null;
  accepted_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at?: string;
  recipients?: ServiceRequestRecipient[];
  has_customer_reviewed?: boolean;
  has_professional_reviewed?: boolean;
}

export interface PostAuthor {
  id: number;
  username: string;
  full_name: string;
  profile_picture?: string | null;
  professional_id?: number | null;
  categories?: string[];
}

export interface Post {
  id: number;
  author: PostAuthor;
  content: string;
  image?: string | null;
  created_at: string;
  updated_at: string;
  likes_count: number;
  has_liked: boolean;
}

export interface Notification {
  id: number;
  notification_type: string;
  title: string;
  message: string;
  related_resource_type: string;
  related_resource_id?: number | null;
  is_read: boolean;
  created_at: string;
}

export interface Review {
  id: number;
  service_request: number;
  reviewer: number;
  reviewer_name: string;
  reviewer_picture?: string | null;
  reviewee: number;
  reviewee_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export type WalletTransactionType = 'TOPUP' | 'JOB_FEE';
export type WalletTransactionStatus = 'PENDING' | 'COMPLETED' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

export interface Wallet {
  id: number;
  balance: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: number;
  transaction_type: WalletTransactionType;
  amount: string;
  balance_after: string;
  status: WalletTransactionStatus;
  reference: string;
  chapa_reference?: string | null;
  payment_method?: string;
  service_request?: number | null;
  service_request_title?: string | null;
  description?: string;
  created_at: string;
  receipt_available: boolean;
}

export interface WalletReceipt {
  receipt_number: string;
  professional_name: string;
  professional_phone: string;
  amount: string | number;
  currency: string;
  date: string;
  chapa_reference?: string | null;
  merchant_reference: string;
  payment_method: string;
  status: string;
  note: string;
}

export interface TopUpInitializeResponse {
  checkout_url: string;
  merchant_reference: string;
  chapa_reference?: string | null;
  amount: number;
  currency: string;
}

export interface TopUpVerifyResponse {
  message: string;
  wallet_balance: number;
  status?: string;
  was_credited?: boolean;
  transaction: WalletTransaction;
  receipt?: WalletReceipt;
}

