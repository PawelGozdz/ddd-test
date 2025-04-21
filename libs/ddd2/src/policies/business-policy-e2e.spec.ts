import { describe, it, expect, beforeEach, vi } from 'vitest';

import {  createPolicyFactory, PolicyRegistry } from '../policies';
import { ISpecification } from '../validations';

/**
 * End-to-end tests for Business Policy functionality
 * These tests verify that the entire system works together for real-world use cases
 */
describe('Business Policy E2E', () => {
  // Clear the registry before each test to avoid test interference
  beforeEach(() => {
    // Reset the private static property by using any type
    (PolicyRegistry as any).policies = new Map();
  });
  
  // Define domain entities for testing
  interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    age: number;
    isActive: boolean;
    roles: string[];
  }
  
  interface Order {
    id: string;
    userId: string;
    items: OrderItem[];
    totalAmount: number;
    shippingAddress: Address;
    status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
    createdAt: Date;
  }
  
  interface OrderItem {
    productId: string;
    quantity: number;
    unitPrice: number;
  }
  
  interface Address {
    street: string;
    city: string;
    zipCode: string;
    country: string;
  }
  
  // Helper function to create specifications
  const createSpec = <T>(
    predicate: (entity: T) => boolean
  ): ISpecification<T> => {
    return {
      isSatisfiedBy: predicate,
      and(other) {
        const self = this;
        return {
          isSatisfiedBy: (entity: T) => self.isSatisfiedBy(entity) && other.isSatisfiedBy(entity),
          and: vi.fn(),
          or: vi.fn(),
          not: vi.fn()
        };
      },
      or(other) {
        const self = this;
        return {
          isSatisfiedBy: (entity: T) => self.isSatisfiedBy(entity) || other.isSatisfiedBy(entity),
          and: vi.fn(),
          or: vi.fn(),
          not: vi.fn()
        };
      },
      not() {
        const self = this;
        return {
          isSatisfiedBy: (entity: T) => !self.isSatisfiedBy(entity),
          and: vi.fn(),
          or: vi.fn(),
          not: vi.fn()
        };
      }
    };
  };
  
  describe('User Registration and Account Management', () => {
    it('should validate user registration requirements', () => {
      // Arrange
      const userPolicyFactory = createPolicyFactory<User>('user');
      
      // Define user validation policies
      userPolicyFactory.register(
        'adultUser',
        createSpec<User>(user => user.age >= 18),
        'UNDERAGE_USER',
        'User must be at least 18 years old',
        user => ({ providedAge: user.age, minimumAge: 18 })
      );
      
      userPolicyFactory.register(
        'validEmail',
        createSpec<User>(user => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)),
        'INVALID_EMAIL',
        'Email must be in a valid format'
      );
      
      userPolicyFactory.register(
        'nameProvided',
        createSpec<User>(user => 
          !!user.firstName && user.firstName.trim().length > 0 &&
          !!user.lastName && user.lastName.trim().length > 0
        ),
        'MISSING_NAME',
        'First and last name must be provided'
      );
      
      // Act
      const validUser: User = {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        age: 25,
        isActive: true,
        roles: ['user']
      };
      
      const invalidUser: User = {
        id: '2',
        firstName: 'Jane',
        lastName: '',
        email: 'invalid-email',
        age: 16,
        isActive: true,
        roles: ['user']
      };
      
      // Assert
      const validResult = userPolicyFactory.checkAll(validUser);
      const invalidResult = userPolicyFactory.checkAll(invalidUser);
      
      expect(validResult.isSuccess).toBe(true);
      expect(invalidResult.isFailure).toBe(true);
      
      // Check specific violations
      const violations = invalidResult.error;
      expect(violations.length).toBe(3);
      
      const codes = violations.map(v => v.code);
      expect(codes).toContain('UNDERAGE_USER');
      expect(codes).toContain('INVALID_EMAIL');
      expect(codes).toContain('MISSING_NAME');
      
      // Verify detailed information is provided
      const ageViolation = violations.find(v => v.code === 'UNDERAGE_USER');
      expect(ageViolation?.details).toEqual({ providedAge: 16, minimumAge: 18 });
    });
    
    it('should enforce admin-specific requirements', () => {
      // Arrange
      const userPolicyFactory = createPolicyFactory<User>('user');
      const adminPolicyFactory = createPolicyFactory<User>('admin');
      
      // Regular user policies
      userPolicyFactory.register(
        'adultUser',
        createSpec<User>(user => user.age >= 18),
        'UNDERAGE_USER',
        'User must be at least 18 years old'
      );
      
      // Admin-specific policies
      adminPolicyFactory.register(
        'isAdmin',
        createSpec<User>(user => user.roles.includes('admin')),
        'NOT_ADMIN',
        'User must have admin role'
      );
      
      adminPolicyFactory.register(
        'minimumAge',
        createSpec<User>(user => user.age >= 21),
        'ADMIN_TOO_YOUNG',
        'Admin must be at least 21 years old'
      );
      
      // Act
      const regularUser: User = {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        age: 19,
        isActive: true,
        roles: ['user']
      };
      
      const youngAdmin: User = {
        id: '2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        age: 20,
        isActive: true,
        roles: ['user', 'admin']
      };
      
      const validAdmin: User = {
        id: '3',
        firstName: 'Robert',
        lastName: 'Johnson',
        email: 'robert@example.com',
        age: 25,
        isActive: true,
        roles: ['user', 'admin']
      };
      
      // Assert
      // Regular user validation
      expect(userPolicyFactory.checkAll(regularUser).isSuccess).toBe(true);
      expect(userPolicyFactory.checkAll(youngAdmin).isSuccess).toBe(true);
      expect(userPolicyFactory.checkAll(validAdmin).isSuccess).toBe(true);
      
      // Admin validation
      expect(adminPolicyFactory.checkAll(regularUser).isFailure).toBe(true);
      expect(adminPolicyFactory.checkAll(youngAdmin).isFailure).toBe(true);
      expect(adminPolicyFactory.checkAll(validAdmin).isSuccess).toBe(true);
      
      // Check specific violations for young admin
      const youngAdminResult = adminPolicyFactory.checkAll(youngAdmin);
      expect(youngAdminResult.isFailure).toBe(true);
      expect(youngAdminResult.error.length).toBe(1);
      expect(youngAdminResult.error[0].code).toBe('ADMIN_TOO_YOUNG');
    });
  });
  
  describe('Order Processing System', () => {
    it('should validate order creation requirements', () => {
      // Arrange
      const orderPolicyFactory = createPolicyFactory<Order>('order');
      
      // Order validation policies
      orderPolicyFactory.register(
        'hasItems',
        createSpec<Order>(order => order.items.length > 0),
        'EMPTY_ORDER',
        'Order must contain at least one item'
      );
      
      orderPolicyFactory.register(
        'positiveAmount',
        createSpec<Order>(order => order.totalAmount > 0),
        'INVALID_AMOUNT',
        'Order total amount must be positive'
      );
      
      orderPolicyFactory.register(
        'validItems',
        createSpec<Order>(order => order.items.every(item => 
          item.quantity > 0 && item.unitPrice > 0
        )),
        'INVALID_ITEMS',
        'All order items must have positive quantity and price',
        order => ({
          invalidItems: order.items
            .filter(item => item.quantity <= 0 || item.unitPrice <= 0)
            .map(item => ({ 
              productId: item.productId, 
              quantity: item.quantity, 
              unitPrice: item.unitPrice 
            }))
        })
      );
      
      orderPolicyFactory.register(
        'completeAddress',
        createSpec<Order>(order => 
          !!order.shippingAddress.street &&
          !!order.shippingAddress.city &&
          !!order.shippingAddress.zipCode &&
          !!order.shippingAddress.country
        ),
        'INCOMPLETE_ADDRESS',
        'Shipping address must be complete',
        order => ({
          address: order.shippingAddress,
          missingFields: [
            !order.shippingAddress.street ? 'street' : null,
            !order.shippingAddress.city ? 'city' : null,
            !order.shippingAddress.zipCode ? 'zipCode' : null,
            !order.shippingAddress.country ? 'country' : null,
          ].filter(Boolean)
        })
      );
      
      // Act
      const validOrder: Order = {
        id: 'order1',
        userId: 'user1',
        items: [
          { productId: 'prod1', quantity: 2, unitPrice: 10.99 },
          { productId: 'prod2', quantity: 1, unitPrice: 24.99 }
        ],
        totalAmount: 46.97,
        shippingAddress: {
          street: '123 Main St',
          city: 'Anytown',
          zipCode: '12345',
          country: 'USA'
        },
        status: 'pending',
        createdAt: new Date()
      };
      
      const invalidOrder: Order = {
        id: 'order2',
        userId: 'user2',
        items: [
          { productId: 'prod1', quantity: 0, unitPrice: 10.99 },
          { productId: 'prod2', quantity: 1, unitPrice: -5 }
        ],
        totalAmount: 0,
        shippingAddress: {
          street: '456 Oak St',
          city: '',
          zipCode: '54321',
          country: 'USA'
        },
        status: 'pending',
        createdAt: new Date()
      };
      
      // Assert
      const validResult = orderPolicyFactory.checkAll(validOrder);
      const invalidResult = orderPolicyFactory.checkAll(invalidOrder);
      
      expect(validResult.isSuccess).toBe(true);
      expect(invalidResult.isFailure).toBe(true);
      
      // Check specific violations
      const violations = invalidResult.error;
      expect(violations.length).toBe(3);
      
      const codes = violations.map(v => v.code);
      expect(codes).toContain('INVALID_AMOUNT');
      expect(codes).toContain('INVALID_ITEMS');
      expect(codes).toContain('INCOMPLETE_ADDRESS');
      
      // Verify detailed information
      const itemsViolation = violations.find(v => v.code === 'INVALID_ITEMS');
      expect(itemsViolation?.details?.invalidItems.length).toBe(2);
      
      const addressViolation = violations.find(v => v.code === 'INCOMPLETE_ADDRESS');
      expect(addressViolation?.details?.missingFields).toContain('city');
    });
    
    it('should enforce order transition policies', () => {
      // Arrange
      const orderTransitionFactory = createPolicyFactory<{order: Order, newStatus: string}>('orderTransition');
      
      // Order transition policies
      orderTransitionFactory.register(
        'validTransition',
        createSpec<{order: Order, newStatus: string}>(({ order, newStatus }) => {
          const validTransitions: Record<string, string[]> = {
            'pending': ['paid', 'cancelled'],
            'paid': ['shipped', 'cancelled'],
            'shipped': ['delivered'],
            'delivered': [],
            'cancelled': []
          };
          
          return validTransitions[order.status]?.includes(newStatus) || false;
        }),
        'INVALID_TRANSITION',
        'Invalid order status transition',
        ({ order, newStatus }) => ({
          currentStatus: order.status,
          targetStatus: newStatus,
          allowedTransitions: {
            'pending': ['paid', 'cancelled'],
            'paid': ['shipped', 'cancelled'],
            'shipped': ['delivered'],
            'delivered': [],
            'cancelled': []
          }[order.status]
        })
      );
      
      // Composite policy for paid orders
      const paidOrderSpec = createSpec<{order: Order, newStatus: string}>(
        ({ order }) => order.status === 'paid'
      );
      
      const atLeastOneDayOldSpec = createSpec<{order: Order, newStatus: string}>(
        ({ order }) => {
          const oneDayAgo = new Date();
          oneDayAgo.setDate(oneDayAgo.getDate() - 1);
          return order.createdAt < oneDayAgo;
        }
      );
      
      orderTransitionFactory.register(
        'paidOrderDelay',
        paidOrderSpec.and(atLeastOneDayOldSpec),
        'PAID_ORDER_TOO_RECENT',
        'Paid orders must be at least one day old before shipping',
        ({ order }) => ({
          orderAge: Math.round((new Date().getTime() - order.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
          requiredAge: 1
        })
      );
      
      // Act
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 2);
      
      const pendingOrder: Order = {
        id: 'order1',
        userId: 'user1',
        items: [{ productId: 'prod1', quantity: 1, unitPrice: 10 }],
        totalAmount: 10,
        shippingAddress: { street: 'st', city: 'city', zipCode: '123', country: 'USA' },
        status: 'pending',
        createdAt: new Date()
      };
      
      const recentPaidOrder: Order = {
        ...pendingOrder,
        id: 'order2',
        status: 'paid',
        createdAt: new Date() // Today
      };
      
      const olderPaidOrder: Order = {
        ...pendingOrder,
        id: 'order3',
        status: 'paid',
        createdAt: yesterdayDate
      };
      
      // Assert
      // Valid transitions
      expect(orderTransitionFactory.checkAll({ order: pendingOrder, newStatus: 'paid' }).isSuccess).toBe(true);
      expect(orderTransitionFactory.checkAll({ order: olderPaidOrder, newStatus: 'shipped' }).isSuccess).toBe(true);
      
      // Invalid transitions
      expect(orderTransitionFactory.checkAll({ order: pendingOrder, newStatus: 'shipped' }).isFailure).toBe(true);
      expect(orderTransitionFactory.checkAll({ order: recentPaidOrder, newStatus: 'shipped' }).isFailure).toBe(true);
      
      // Check violation details
      const recentPaidResult = orderTransitionFactory.checkAll({ order: recentPaidOrder, newStatus: 'shipped' });
      expect(recentPaidResult.isFailure).toBe(true);
      
      const ageViolation = recentPaidResult.error.find(v => v.code === 'PAID_ORDER_TOO_RECENT');
      expect(ageViolation).toBeDefined();
      expect(ageViolation?.details?.orderAge).toBe(0);
      expect(ageViolation?.details?.requiredAge).toBe(1);
    });
  });
});
