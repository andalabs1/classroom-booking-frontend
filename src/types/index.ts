export type Role = "USER" | "ADMIN";
export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  registeredAt: string;
  password?: string;
};
export type Room = {
  id: string;
  code: string;
  name: string;
  building: string;
  floor: number;
  capacity: number;
  description: string;
  equipment: string[];
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
  image: string;
  category: string;
};
export type BookingStatus =
  | "PENDING"
  | "APPROVED"
  | "IN_USE"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";
export type BookingDraft = {
  roomId: string;
  date: string;
  start: string;
  end: string;
  attendees: number;
  purpose: string;
  equipment: string[];
  note: string;
  editingId?: string;
};
export type Booking = BookingDraft & {
  id: string;
  userId: string;
  status: BookingStatus;
  createdAt: string;
  reason?: string;
  room?: Room;
};
export type BookingNotification = {
  id: string;
  userId: string;
  bookingId: string | null;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  kind: "BOOKING" | "APPROVED" | "REJECTED" | "CANCELLED" | "REMINDER";
};
export type Database = {
  rooms: Room[];
  users: User[];
  bookings: Booking[];
  notifications: BookingNotification[];
};
