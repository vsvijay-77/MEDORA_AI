import React, { createContext, useContext, useState, useEffect } from 'react';
import { Patient } from '../types';

interface AuthContextType {
  isAuthenticated: boolean;
  patient: Patient | null;
  login: (email: string, name?: string) => void;
  signup: (name: string, email: string) => void;
  updatePatient: (updates: Partial<Patient>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Check localStorage for persisted authentication
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('med_auth') === 'true';
  });

  const ACTIVE_PATIENT_ID = 'b70db8e8-211c-461f-991b-6b944193435b';

  // Check localStorage for user-specific patient profile
  const [patient, setPatient] = useState<Patient | null>(() => {
    const saved = localStorage.getItem('med_patient');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.id || parsed.id.startsWith('patient-') || parsed.id.startsWith('demo-')) {
          parsed.id = ACTIVE_PATIENT_ID;
        }
        return parsed;
      } catch (e) {
        return null;
      }
    }
    return null; // Don't pre-populate with Vijay; ask user to login first time!
  });

  // Persist patient whenever it changes
  useEffect(() => {
    if (patient) {
      localStorage.setItem('med_patient', JSON.stringify(patient));
    }
  }, [patient]);

  const login = (email: string, customName?: string) => {
    // Derive name from customName or email prefix (e.g., john.doe@... -> John)
    let displayName = customName?.trim();
    if (!displayName) {
      const namePart = email.split('@')[0].split('.')[0];
      displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }

    const newPatient: Patient = {
      id: ACTIVE_PATIENT_ID,
      name: displayName || 'User',
      dob: '1990-01-01',
      gender: 'Not Specified',
      abha_id: `ABHA-DEMO-${Math.floor(100000 + Math.random() * 900000)}`,
      preferred_language: 'English',
    };

    setPatient(newPatient);
    setIsAuthenticated(true);
    localStorage.setItem('med_auth', 'true');
    localStorage.setItem('med_patient', JSON.stringify(newPatient));
  };

  const signup = (name: string, _email: string) => {
    const newPatient: Patient = {
      id: ACTIVE_PATIENT_ID,
      name: name.trim() || 'User',
      dob: '1990-01-01',
      gender: 'Not Specified',
      abha_id: `ABHA-DEMO-${Math.floor(100000 + Math.random() * 900000)}`,
      preferred_language: 'English',
    };

    setPatient(newPatient);
    setIsAuthenticated(true);
    localStorage.setItem('med_auth', 'true');
    localStorage.setItem('med_patient', JSON.stringify(newPatient));
  };

  const updatePatient = (updates: Partial<Patient>) => {
    setPatient((prev) => {
      const updated = prev ? { ...prev, ...updates } : {
        id: `patient-${Date.now()}`,
        name: updates.name || 'User',
        dob: updates.dob || '1990-01-01',
        gender: updates.gender || 'Not Specified',
        abha_id: updates.abha_id || 'ABHA-DEMO-482915',
        preferred_language: updates.preferred_language || 'English',
        ...updates,
      };
      localStorage.setItem('med_patient', JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    setIsAuthenticated(false);
    setPatient(null);
    localStorage.removeItem('med_auth');
    localStorage.removeItem('med_patient');
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        patient,
        login,
        signup,
        updatePatient,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
