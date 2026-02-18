export type EmployeeWithRefs = {
  id: string;
  tenantId: string;
  fullName: string;
  documentType: string;
  document: string;
  gender: string;
  email: string | null;
  phone: string | null;
  birthdate: Date;
  entryDate: Date;
  isActive: boolean;
  departmentRef?: { name: string } | null;
  positionRef?: { name: string } | null;
};
