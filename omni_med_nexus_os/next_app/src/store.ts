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
  hardwareStatus: "CONNECTED" | "DISCONNECTED" | "ERROR" | "CONNECTING";
  ewsAlerts: string[];
  login: (role: string) => void;
  logout: () => void;
  updateHardwareData: (data: HardwareData) => void;
  setHardwareStatus: (status: "CONNECTED" | "DISCONNECTED" | "ERROR" | "CONNECTING") => void;
  addAlert: (alert: string) => void;
}

export const useHospitalStore = create<HospitalState>((set) => ({
  userRole: null,
  hardwareData: null,
  hardwareStatus: "CONNECTING",
  ewsAlerts: [],
  login: (role) => set({ userRole: role }),
  logout: () => set({ userRole: null, hardwareData: null, ewsAlerts: [] }),
  updateHardwareData: (data) => set({ hardwareData: data }),
  setHardwareStatus: (status) => set({ hardwareStatus: status }),
  addAlert: (alert) => set((state) => ({ ewsAlerts: [...state.ewsAlerts, alert] })),
}));
