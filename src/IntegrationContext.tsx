import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

// Define the shape of our API events
export interface ApiEvent {
  id: string;
  timestamp: string;
  type: string;
  payload: any;
}

interface IntegrationContextType {
  events: ApiEvent[];
  addEvent: (type: string, payload: any) => void;
  clearEvents: () => void;
}

const IntegrationContext = createContext<IntegrationContextType | undefined>(undefined);

export function IntegrationProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<ApiEvent[]>([]);

  // Function to drop a new event into the stream
  const addEvent = (type: string, payload: any) => {
    const newEvent: ApiEvent = {
      id: `evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toLocaleTimeString(),
      type,
      payload
    };
    // We put the newest event at the top of the array so it shows first in the drawer
    setEvents(prev => [newEvent, ...prev]);
  };

  const clearEvents = () => setEvents([]);

  return (
    <IntegrationContext.Provider value={{ events, addEvent, clearEvents }}>
      {children}
    </IntegrationContext.Provider>
  );
}

// Custom hook so any component can easily grab the context
export function useIntegration() {
  const context = useContext(IntegrationContext);
  if (context === undefined) {
    throw new Error('useIntegration must be used within an IntegrationProvider');
  }
  return context;
}