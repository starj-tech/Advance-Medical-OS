import { create } from 'zustand';

interface HardwareData {
  device_id: string;
  heart_rate: number;
  spo2: number;
  blood_pressure: string;
}

interface HospitalState {
  userRole: string | null;
  hardwareData: HardwareData | null;
  ewsAlerts: string[];
  login: (role: string) => void;
  logout: () => void;
  updateHardwareData: (data: HardwareData) => void;
  addAlert: (alert: string) => void;
}

export const useHospitalStore = create<HospitalState>((set) => ({
  userRole: null,
  hardwareData: null,
  ewsAlerts: [],
  login: (role) => set({ userRole: role }),
  logout: () => set({ userRole: null, hardwareData: null, ewsAlerts: [] }),
  updateHardwareData: (data) => set({ hardwareData: data }),
  addAlert: (alert) => set((state) => ({ ewsAlerts: [...state.ewsAlerts, alert] })),
}));
