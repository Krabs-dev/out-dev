import prisma from './prisma';

export const ADMIN_ADDRESSES = [
  '0x2228D6681933470e29ce2A23E76055b1384F57ca'
] as const;

export async function isAdminDB(address: string): Promise<boolean> {
  try {
    const admin = await prisma.admin.findUnique({
      where: { 
        address: address.toLowerCase() 
      },
      select: { isActive: true }
    });
    
    return admin?.isActive === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return ADMIN_ADDRESSES.some(adminAddress => 
      adminAddress.toLowerCase() === address.toLowerCase()
    );
  }
}

export function isAdmin(address: string): boolean {
  return ADMIN_ADDRESSES.some(adminAddress => 
    adminAddress.toLowerCase() === address.toLowerCase()
  );
}

export async function validateAdminAccess(address: string): Promise<void> {
  const isAdminUser = await isAdminDB(address);
  if (!isAdminUser) {
    throw new Error('Access denied: Admin privileges required');
  }
}

export class AdminService {
  static async getAllAdmins() {
    return await prisma.admin.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
  }
  
  static async addAdmin(address: string, createdBy: string) {
    const existingAdmin = await prisma.admin.findUnique({
      where: { address: address.toLowerCase() }
    });
    
    if (existingAdmin) {
      if (existingAdmin.isActive) {
        throw new Error('This address is already an active admin');
      } else {
        return await prisma.admin.update({
          where: { address: address.toLowerCase() },
          data: { 
            isActive: true,
            createdBy: createdBy.toLowerCase()
          }
        });
      }
    }
    
    return await prisma.admin.create({
      data: {
        address: address.toLowerCase(),
        createdBy: createdBy.toLowerCase(),
        isActive: true
      }
    });
  }
  
  static async removeAdmin(address: string) {
    return await prisma.admin.update({
      where: { address: address.toLowerCase() },
      data: { isActive: false }
    });
  }
  
  static async reactivateAdmin(address: string) {
    return await prisma.admin.update({
      where: { address: address.toLowerCase() },
      data: { isActive: true }
    });
  }
}