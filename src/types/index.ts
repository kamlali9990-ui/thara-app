export type OrderStatus = 'جديد' | 'قيد التحضير' | 'جاهز للتوصيل' | 'في الطريق' | 'تم التوصيل' | 'مكتمل' | 'ملغي';

export interface Product {
  id: number;
  name: string;
  price: number;
  category?: string;
  image?: string;
  stock_quantity: number;
  isOffer?: boolean;
  offerPrice?: number;
  description?: string;
  unit?: string;
  imageUrl?: string;
}

export interface CartItem {
  id: number;
  name?: string;
  qty: number;
  price?: number;
  image?: string;
  currentPrice?: number;
}

export interface Order {
  id: string;
  date: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  paymentMethod?: string;
  phone?: string;
  notes?: string;
  location?: string;
  customerEmail?: string;
  estimatedDelivery?: number | null;
  assignedDriverId?: number | null;
  deliveryFee: number;
  deliveryAddress?: string | null;
  acceptedBy?: { id: number } | null;
  archived: boolean;
  archivedAt?: string | null;
  driverLat?: number | null;
  driverLng?: number | null;
  customerName?: string;
  name?: string;
}

export interface StaffMember {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'employee' | 'driver';
  permissions?: string[];
  phone?: string;
  is_active?: boolean;
}

export interface Driver {
  id: number;
  name: string;
  email: string;
  phone?: string;
}

export interface Customer {
  id?: number;
  email: string;
  name?: string;
  phone?: string;
  location?: string;
  loyalty_points?: number;
  username?: string;
  real_email?: string;
  created_at?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'customer' | 'admin' | 'driver';
  text: string;
  orderId?: string;
  customerEmail?: string;
  customerPhone?: string;
  senderName?: string;
  time: string;
  timestamp?: string;
  readAt?: string;
  status?: string;
  _failed?: boolean;
}

export interface TypingUser {
  userEmail: string;
  orderId: string;
  isTyping: boolean;
}

export interface SiteStats {
  member_count: number;
  visit_count: number;
}

export type StaffRole = 'admin' | 'manager' | 'employee' | 'driver';
