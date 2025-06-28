
export enum Role {
  Employee = 'Employee',
  Supervisor = 'Supervisor',
  Admin = 'Admin',
}

export enum RequestType {
  Correction = 'Correction',
  Overtime = 'Overtime',
}

export enum RequestStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  supervisorId?: string;
}

export interface TimeEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  clockIn: string | null; // ISO 8601 format
  clockOut: string | null; // ISO 8601 format
  status: 'Normal' | 'Corrected';
}

export interface AttendanceRecord extends TimeEntry {
  userName: string;
  workDuration: number | null; // in hours
}

export interface Request {
  id: string;
  userId: string;
  userName: string;
  type: RequestType;
  date: string; // YYYY-MM-DD
  requestedTime: string; // HH:mm
  reason: string;
  status: RequestStatus;
  approverId?: string;
  createdAt: string; // ISO 8601 format
}

export interface ManagedRequest extends Request {
  user: User;
}
