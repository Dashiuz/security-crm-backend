export interface EmployeeClientHistoryItem {
  id: string;
  clientId: string;
  clientName: string;
  clientCode?: string | null;
  assignedAt: string;
  unassignedAt: string | null;
  recordedAt: string;
  recordedBy?: string | null;
  notes?: string | null;
}
