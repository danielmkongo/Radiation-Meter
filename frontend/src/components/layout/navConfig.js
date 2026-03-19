import {
  LayoutDashboard, Zap, Bell, Monitor, Users, FileText, ClipboardList, UserCircle, Building2,
} from 'lucide-react';

export const NAV_ITEMS = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'hospital_manager', 'regulator', 'radiologist'],
  },
  {
    label: 'Exposure Logs',
    path: '/exposure',
    icon: Zap,
    roles: ['admin', 'hospital_manager', 'regulator', 'radiologist'],
  },
  {
    label: 'Alerts',
    path: '/alerts',
    icon: Bell,
    roles: ['admin', 'hospital_manager', 'regulator', 'radiologist'],
    badge: true,
  },
  {
    label: 'Devices',
    path: '/devices',
    icon: Monitor,
    roles: ['admin', 'hospital_manager', 'regulator'],
  },
  {
    label: 'Hospitals',
    path: '/hospitals',
    icon: Building2,
    roles: ['admin', 'hospital_manager', 'regulator'],
  },
  {
    label: 'Users',
    path: '/users',
    icon: Users,
    roles: ['admin', 'hospital_manager'],
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: FileText,
    roles: ['admin', 'hospital_manager', 'regulator'],
  },
  {
    label: 'Audit Log',
    path: '/audit',
    icon: ClipboardList,
    roles: ['admin', 'regulator'],
  },
  {
    label: 'My Profile',
    path: '/profile',
    icon: UserCircle,
    roles: ['admin', 'hospital_manager', 'regulator', 'radiologist'],
  },
];
